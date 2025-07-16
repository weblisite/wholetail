const MPESAService = require('./mpesaService');

// Enhanced M-Pesa integration for advertising payments
class AdPaymentService {
  constructor() {
    // Initialize M-Pesa service
    this.mpesaService = new MPESAService();
    this.mockMode = this.mpesaService.mockMode;
    
    // In-memory storage for mock mode (use database in production)
    this.customers = new Map();
    this.campaigns = new Map();
    this.transactions = new Map();
    
    console.log(`💳 Ad Payment Service initialized${this.mockMode ? ' (Mock Mode)' : ' (M-Pesa Live Mode)'}`);
  }

  async createCustomer(wholesaler) {
    // For M-Pesa, we store customer info locally
    const customer = {
      id: `cus_${Date.now()}`,
      email: wholesaler.email,
      name: wholesaler.businessName || wholesaler.name,
      phone: this.mpesaService.formatPhoneNumber(wholesaler.phone),
      business_code: wholesaler.businessCode || null,
      created_at: new Date().toISOString(),
      payment_methods: [],
      mpesa_verified: false,
      total_spent: 0,
      active_campaigns: 0
    };

    // Validate phone number
    const phoneValidation = this.mpesaService.validatePhoneNumber(wholesaler.phone);
    if (!phoneValidation.isValid) {
      throw new Error(`Invalid phone number: ${phoneValidation.error || 'Not a Safaricom number'}`);
    }

    customer.mpesa_verified = phoneValidation.supportsSTK;
    this.customers.set(customer.id, customer);

    console.log(`📱 Created M-Pesa customer: ${customer.name} (${customer.phone})`);
    return customer;
  }

  async addPaymentMethod(customerId, phoneNumber) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const phoneValidation = this.mpesaService.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      throw new Error(`Invalid phone number: ${phoneValidation.error}`);
    }

    const paymentMethod = {
      id: `pm_${Date.now()}`,
      type: 'mpesa',
      phone: phoneValidation.formatted,
      network: phoneValidation.network,
      supports_stk: phoneValidation.supportsSTK,
      verified: phoneValidation.isValid,
      created_at: new Date().toISOString()
    };

    customer.payment_methods.push(paymentMethod);
    this.customers.set(customerId, customer);

    return paymentMethod;
  }

  async createAdSpendPayment(customerId, amount, campaignId, phoneNumber, description) {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > 150000) {
      throw new Error('Amount cannot exceed KES 150,000 per transaction');
    }

    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const paymentIntent = {
      id: `pi_${Date.now()}`,
      customer_id: customerId,
      campaign_id: campaignId,
      amount: Math.round(amount),
      currency: 'KES',
      phone_number: this.mpesaService.formatPhoneNumber(phoneNumber),
      description: description || `Ad spend for campaign ${campaignId}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      checkout_request_id: null,
      merchant_request_id: null,
      transaction_fees: this.mpesaService.getTransactionFees(amount)
    };

    try {
      // Initiate STK Push
      const stkResponse = await this.mpesaService.initiateSTKPush({
        amount: paymentIntent.amount,
        phone_number: paymentIntent.phone_number,
        account_reference: `ADV${campaignId}`,
        transaction_desc: paymentIntent.description,
        callback_url: `${process.env.MPESA_CALLBACK_URL}/advertising/${paymentIntent.id}`
      });

      if (stkResponse.success) {
        paymentIntent.checkout_request_id = stkResponse.checkout_request_id;
        paymentIntent.merchant_request_id = stkResponse.merchant_request_id;
        paymentIntent.customer_message = stkResponse.customer_message;

        this.transactions.set(paymentIntent.id, paymentIntent);

        console.log(`📱 Ad payment STK Push initiated: ${paymentIntent.id}`);
        return paymentIntent;
      } else {
        throw new Error('STK Push initiation failed');
      }

    } catch (error) {
      console.error('Error creating ad payment:', error);
      paymentIntent.status = 'failed';
      paymentIntent.error = error.message;
      paymentIntent.failed_at = new Date().toISOString();
      
      this.transactions.set(paymentIntent.id, paymentIntent);
      throw new Error(`Failed to process M-Pesa payment: ${error.message}`);
    }
  }

  async chargeDailyAdSpend(wholesalerId, campaigns) {
    const charges = [];
    
    for (const campaign of campaigns) {
      if (campaign.status === 'active' && campaign.daily_spend > 0) {
        const description = `Daily ad spend for ${campaign.name}`;
        
        try {
          const payment = await this.createAdSpendPayment(
            campaign.customer_id,
            campaign.daily_spend,
            campaign.id,
            campaign.phone_number,
            description
          );
          
          charges.push({
            campaign_id: campaign.id,
            amount: campaign.daily_spend,
            payment_id: payment.id,
            status: payment.status,
            checkout_request_id: payment.checkout_request_id,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Failed to charge campaign ${campaign.id}:`, error);
          charges.push({
            campaign_id: campaign.id,
            amount: campaign.daily_spend,
            error: error.message,
            status: 'failed',
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return charges;
  }

  async generateInvoice(wholesalerId, period) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    const transactions = Array.from(this.transactions.values()).filter(t => 
      t.customer_id === wholesalerId && 
      new Date(t.created_at) >= startDate &&
      t.status === 'completed'
    );

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = transactions.length;

    const invoice = {
      id: `inv_${Date.now()}`,
      customer_id: wholesalerId,
      period: period,
      billing_period: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      line_items: transactions.map(t => ({
        description: t.description,
        amount: t.amount,
        currency: 'KES',
        date: t.created_at,
        campaign_id: t.campaign_id
      })),
      total_amount: totalSpent,
      total_transactions: totalTransactions,
      currency: 'KES',
      status: 'generated',
      generated_at: new Date().toISOString()
    };

    console.log(`📄 Invoice generated: ${invoice.id} - KES ${totalSpent}`);
    return invoice;
  }

  async getCampaignCharges(wholesalerId, period) {
    const periodDays = period || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const charges = Array.from(this.transactions.values()).filter(t => 
      t.customer_id === wholesalerId && 
      new Date(t.created_at) >= startDate
    );

    const groupedByCampaign = charges.reduce((acc, charge) => {
      const campaignId = charge.campaign_id;
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaign_id: campaignId,
          total_charged: 0,
          successful_charges: 0,
          failed_charges: 0,
          charges: []
        };
      }

      acc[campaignId].charges.push(charge);
      if (charge.status === 'completed') {
        acc[campaignId].total_charged += charge.amount;
        acc[campaignId].successful_charges++;
      } else if (charge.status === 'failed') {
        acc[campaignId].failed_charges++;
      }

      return acc;
    }, {});

    return Object.values(groupedByCampaign);
  }

  async setupAutomaticBilling(customerId, campaignId, dailyBudget, phoneNumber) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate daily budget
    if (dailyBudget < 10 || dailyBudget > 50000) {
      throw new Error('Daily budget must be between KES 10 and KES 50,000');
    }

    const phoneValidation = this.mpesaService.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      throw new Error('Invalid phone number for automatic billing');
    }

    const billingSetup = {
      id: `bill_setup_${Date.now()}`,
      customer_id: customerId,
      campaign_id: campaignId,
      daily_budget: dailyBudget,
      phone_number: phoneValidation.formatted,
      frequency: 'daily',
      next_charge_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    };

    console.log(`🔄 Automatic billing setup: ${billingSetup.id} - KES ${dailyBudget}/day`);
    return billingSetup;
  }

  async processRealTimeBid(wholesalerId, bidAmount, placementId, phoneNumber) {
    // Validate bid amount
    if (bidAmount < 1 || bidAmount > 10000) {
      throw new Error('Bid amount must be between KES 1 and KES 10,000');
    }

    const customer = this.customers.get(wholesalerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check available budget
    const budget = await this.getAvailableBudget(wholesalerId);
    if (bidAmount > budget.available) {
      throw new Error('Insufficient budget for bid');
    }

    // Create bid transaction (will be charged if bid wins)
    const bid = {
      id: `bid_${Date.now()}`,
      customer_id: wholesalerId,
      placement_id: placementId,
      amount: bidAmount,
      phone_number: this.mpesaService.formatPhoneNumber(phoneNumber),
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30000).toISOString() // 30 seconds
    };

    console.log(`🎯 Real-time bid placed: ${bid.id} - KES ${bidAmount}`);
    return bid;
  }

  async holdFunds(wholesalerId, amount, reference, phoneNumber) {
    // For M-Pesa, we don't actually hold funds, but we validate the setup
    const phoneValidation = this.mpesaService.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      throw new Error('Invalid phone number for fund hold');
    }

    const hold = {
      id: `hold_${Date.now()}`,
      customer_id: wholesalerId,
      amount: amount,
      reference: reference,
      phone_number: phoneValidation.formatted,
      status: 'held',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    console.log(`🔒 Funds held: ${hold.id} - KES ${amount}`);
    return hold;
  }

  async getAvailableBudget(wholesalerId) {
    const customer = this.customers.get(wholesalerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate spent amount in current month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyTransactions = Array.from(this.transactions.values()).filter(t =>
      t.customer_id === wholesalerId &&
      new Date(t.created_at) >= monthStart &&
      t.status === 'completed'
    );

    const monthlySpent = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
    const defaultBudget = 100000; // KES 100,000 default monthly budget

    return {
      monthly_budget: defaultBudget,
      spent_this_month: monthlySpent,
      available: Math.max(0, defaultBudget - monthlySpent),
      currency: 'KES',
      last_updated: new Date().toISOString()
    };
  }

  async chargeBid(bidId, actualAmount, phoneNumber) {
    try {
      // Find the bid
      const bids = Array.from(this.transactions.values()).filter(t => t.id === bidId);
      if (bids.length === 0) {
        throw new Error('Bid not found');
      }

      // Create payment for winning bid
      const payment = await this.createAdSpendPayment(
        null, // Will be determined from bid
        actualAmount,
        bidId,
        phoneNumber,
        `Real-time bid charge - ${bidId}`
      );

      return {
        id: payment.id,
        amount: actualAmount,
        currency: 'KES',
        status: payment.status,
        checkout_request_id: payment.checkout_request_id
      };

    } catch (error) {
      console.error('Error charging bid:', error);
      throw new Error(`Failed to charge bid amount: ${error.message}`);
    }
  }

  async getPaymentMethods(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer.payment_methods || [];
  }

  async getSpendingAnalytics(wholesalerId, period = '30d') {
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = Array.from(this.transactions.values()).filter(t =>
      t.customer_id === wholesalerId &&
      new Date(t.created_at) >= startDate
    );

    const analytics = {
      period: period,
      total_spent: transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
      total_transactions: transactions.length,
      successful_transactions: transactions.filter(t => t.status === 'completed').length,
      failed_transactions: transactions.filter(t => t.status === 'failed').length,
      pending_transactions: transactions.filter(t => t.status === 'pending').length,
      average_transaction: transactions.length > 0 ? 
        Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length) : 0,
      success_rate: transactions.length > 0 ? 
        Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100) : 0,
      daily_breakdown: this.generateDailyBreakdown(transactions, days),
      top_campaigns: this.getTopCampaigns(transactions),
      currency: 'KES'
    };

    return analytics;
  }

  generateDailyBreakdown(transactions, days) {
    const breakdown = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate >= date && tDate < nextDate;
      });
      
      breakdown.push({
        date: date.toISOString().split('T')[0],
        spent: dayTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
        transactions: dayTransactions.length,
        successful: dayTransactions.filter(t => t.status === 'completed').length
      });
    }
    
    return breakdown;
  }

  getTopCampaigns(transactions) {
    const campaignSpending = transactions.reduce((acc, t) => {
      if (t.status === 'completed') {
        acc[t.campaign_id] = (acc[t.campaign_id] || 0) + t.amount;
      }
      return acc;
    }, {});

    return Object.entries(campaignSpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([campaign_id, spent]) => ({
        campaign_id,
        spent,
        transactions: transactions.filter(t => t.campaign_id === campaign_id && t.status === 'completed').length
      }));
  }

  async handleMpesaCallback(paymentId, callbackData) {
    const payment = this.transactions.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    try {
      const result = this.mpesaService.processCallback(callbackData);
      
      // Update payment status
      payment.status = result.status;
      payment.updated_at = new Date().toISOString();
      
      if (result.status === 'completed') {
        payment.mpesa_receipt = result.mpesa_receipt;
        payment.transaction_date = result.transaction_date;
        payment.completed_at = result.timestamp;
        
        // Update customer total spent
        const customer = this.customers.get(payment.customer_id);
        if (customer) {
          customer.total_spent += payment.amount;
          this.customers.set(payment.customer_id, customer);
        }
        
        console.log(`✅ Ad payment completed: ${payment.id} - Receipt: ${result.mpesa_receipt}`);
      } else if (result.status === 'failed') {
        payment.failure_reason = result.error_message;
        payment.failed_at = result.timestamp;
        
        console.log(`❌ Ad payment failed: ${payment.id} - Reason: ${result.error_message}`);
      }
      
      this.transactions.set(paymentId, payment);
      return result;

    } catch (error) {
      console.error('Error processing ad payment callback:', error);
      throw error;
    }
  }

  async checkPaymentStatus(checkoutRequestId) {
    try {
      return await this.mpesaService.querySTKPushStatus(checkoutRequestId);
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }

  async healthCheck() {
    const mpesaHealth = await this.mpesaService.healthCheck();
    
    return {
      status: mpesaHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      mpesa_service: mpesaHealth,
      customers: this.customers.size,
      transactions: this.transactions.size,
      mode: this.mockMode ? 'mock' : 'live',
      timestamp: new Date().toISOString()
    };
  }

  getStats() {
    const stats = this.mpesaService.getStats();
    
    return {
      ...stats,
      ad_service: {
        customers: this.customers.size,
        transactions: this.transactions.size,
        completed_transactions: Array.from(this.transactions.values()).filter(t => t.status === 'completed').length,
        failed_transactions: Array.from(this.transactions.values()).filter(t => t.status === 'failed').length,
        total_volume: Array.from(this.transactions.values())
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0)
      }
    };
  }
}

module.exports = AdPaymentService; 
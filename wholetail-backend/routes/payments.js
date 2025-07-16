const express = require('express');
const router = express.Router();
const MPESAService = require('../services/mpesaService');

// Initialize M-Pesa service
const mpesaService = new MPESAService();

// Mock payment data for development
const mockPayments = [
  {
    id: 'pay-1',
    order_id: 'order-1',
    amount: 1200,
    phone_number: '254701234567',
    mpesa_receipt: 'QLK12MN34P',
    status: 'completed',
    platform_commission: 36, // 3% of 1200
    seller_amount: 1164,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pay-2',
    order_id: 'order-2',
    amount: 800,
    phone_number: '254709876543',
    mpesa_receipt: 'RST45UV67W',
    status: 'completed',
    platform_commission: 24, // 3% of 800
    seller_amount: 776,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pay-3',
    order_id: 'order-3',
    amount: 2500,
    phone_number: '254712345678',
    status: 'pending',
    platform_commission: 75, // 3% of 2500
    seller_amount: 2425,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

// Mock transaction analytics
const mockAnalytics = {
  daily_stats: {
    total_transactions: 25,
    successful_transactions: 22,
    failed_transactions: 2,
    pending_transactions: 1,
    total_volume: 45000,
    platform_commission: 1350, // 3% of total volume
    success_rate: 88
  },
  payment_methods: {
    mpesa: { count: 20, volume: 38000 },
    cash: { count: 3, volume: 4500 },
    bank: { count: 2, volume: 2500 }
  },
  commission_breakdown: {
    total_earned: 1350,
    pending_payout: 980,
    paid_out: 370
  }
};

// Validate phone number
router.post('/validate-phone', async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
  }

    const validation = mpesaService.validatePhoneNumber(phone_number);
    
    res.json({
      success: true,
      validation: validation,
      fees: validation.isValid ? mpesaService.getTransactionFees(1000) : null // Sample fee for 1000 KES
    });

  } catch (error) {
    console.error('Phone validation error:', error);
    res.status(500).json({ error: 'Phone validation failed' });
  }
});

// Initiate STK Push payment
router.post('/initiate', async (req, res) => {
  try {
    const { 
      amount, 
      phone_number, 
      order_id, 
      account_reference, 
      transaction_desc 
    } = req.body;
    
    if (!amount || !phone_number || !order_id) {
      return res.status(400).json({ 
        error: 'Amount, phone number, and order ID are required' 
      });
    }

    // Validate amount
    if (amount < 1 || amount > 150000) {
      return res.status(400).json({ 
        error: 'Amount must be between KES 1 and KES 150,000' 
      });
    }

    // Calculate commission breakdown
    const commission = mpesaService.calculateCommission(amount);
    
    // Initiate STK Push
    const response = await mpesaService.initiateSTKPush({
      amount,
      phone_number,
      account_reference: account_reference || order_id,
      transaction_desc: transaction_desc || `Payment for order ${order_id}`,
      callback_url: `${process.env.MPESA_CALLBACK_URL || 'http://localhost:3001/api/payments/callback'}`
    });

    if (response.success) {
      // Store payment record
      const payment = {
        id: `pay-${Date.now()}`,
        order_id,
        amount,
        phone_number: mpesaService.formatPhoneNumber(phone_number),
        status: 'pending',
        platform_commission: commission.commission,
        seller_amount: commission.seller_amount,
        checkout_request_id: response.checkout_request_id,
        merchant_request_id: response.merchant_request_id,
        created_at: new Date().toISOString(),
        transaction_fees: mpesaService.getTransactionFees(amount)
      };

      mockPayments.push(payment);

      console.log(`💳 Payment initiated: ${payment.id} for order ${order_id}`);

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        payment_id: payment.id,
        checkout_request_id: response.checkout_request_id,
        merchant_request_id: response.merchant_request_id,
        commission_breakdown: commission,
        transaction_fees: payment.transaction_fees,
        customer_message: response.customer_message
      });
    } else {
      throw new Error('STK Push initiation failed');
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ 
      error: 'Payment initiation failed',
      details: error.message
    });
  }
});

// Handle M-Pesa callback
router.post('/callback', async (req, res) => {
  try {
    console.log('📞 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));
    
    // Validate webhook signature (if configured)
    const signature = req.headers['x-mpesa-signature'];
    const webhookSecret = process.env.MPESA_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const isValid = mpesaService.validateWebhookSignature(req.body, signature, webhookSecret);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process the callback
    const result = mpesaService.processCallback(req.body);
    
    // Find and update payment record
    const payment = mockPayments.find(p => 
      p.checkout_request_id === result.checkout_request_id
    );
    
    if (!payment) {
      console.error('❌ Payment not found for callback:', result.checkout_request_id);
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Update payment status
    payment.status = result.status;
    payment.updated_at = new Date().toISOString();
    
    if (result.status === 'completed') {
      payment.mpesa_receipt = result.mpesa_receipt;
      payment.transaction_date = result.transaction_date;
      payment.completed_at = result.timestamp;
      
      console.log(`✅ Payment completed: ${payment.id} - Receipt: ${result.mpesa_receipt}`);
      
      // TODO: Trigger order fulfillment, send notifications, etc.
      
    } else if (result.status === 'failed') {
      payment.failure_reason = result.error_message;
      payment.failed_at = result.timestamp;
      
      console.log(`❌ Payment failed: ${payment.id} - Reason: ${result.error_message}`);
      
      // TODO: Handle failed payment (notify user, retry options, etc.)
    }
    
    // Acknowledge the callback
    res.json({ 
      ResultCode: 0, 
      ResultDesc: 'Callback processed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Callback processing error:', error);
    res.status(500).json({ 
      ResultCode: 1, 
      ResultDesc: 'Callback processing failed' 
    });
  }
});

// Handle M-Pesa timeout
router.post('/timeout', async (req, res) => {
  try {
    console.log('⏰ M-Pesa Timeout received:', JSON.stringify(req.body, null, 2));
    
    const result = mpesaService.processTimeout(req.body);
    
    // Find and update payment record
    const payment = mockPayments.find(p => 
      p.checkout_request_id === result.checkout_request_id
    );
    
    if (payment) {
      payment.status = 'timeout';
      payment.timeout_at = new Date().toISOString();
      payment.updated_at = new Date().toISOString();
      
      console.log(`⏰ Payment timed out: ${payment.id}`);
      
      // TODO: Handle timeout (notify user, provide retry options, etc.)
    }
    
    res.json({ 
      ResultCode: 0, 
      ResultDesc: 'Timeout processed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Timeout processing error:', error);
    res.status(500).json({ 
      ResultCode: 1, 
      ResultDesc: 'Timeout processing failed' 
    });
  }
});

// Query payment status
router.get('/status/:checkout_request_id', async (req, res) => {
  try {
    const { checkout_request_id } = req.params;
    
    // First check local payment record
    const payment = mockPayments.find(p => p.checkout_request_id === checkout_request_id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // If payment is still pending, query M-Pesa API
    if (payment.status === 'pending') {
      try {
        const mpesaStatus = await mpesaService.querySTKPushStatus(checkout_request_id);
        
        if (mpesaStatus.status === 'completed' && payment.status === 'pending') {
          payment.status = 'completed';
          payment.updated_at = new Date().toISOString();
        }
      } catch (error) {
        console.error('Status query error:', error);
        // Continue with local status if API query fails
      }
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        status: payment.status,
        mpesa_receipt: payment.mpesa_receipt,
        phone_number: payment.phone_number,
        created_at: payment.created_at,
        completed_at: payment.completed_at,
        failed_at: payment.failed_at,
        timeout_at: payment.timeout_at,
        commission_breakdown: {
          gross_amount: payment.amount,
          commission: payment.platform_commission,
          seller_amount: payment.seller_amount
        }
      }
    });
    
  } catch (error) {
    console.error('Status query error:', error);
    res.status(500).json({ error: 'Failed to query payment status' });
  }
});

// Get payment history
router.get('/history', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      order_id, 
      phone_number,
      from_date,
      to_date 
    } = req.query;
    
    let filteredPayments = [...mockPayments];
    
    // Apply filters
    if (status) {
      filteredPayments = filteredPayments.filter(p => p.status === status);
    }

    if (order_id) {
      filteredPayments = filteredPayments.filter(p => p.order_id.includes(order_id));
    }
    
    if (phone_number) {
      const formattedPhone = mpesaService.formatPhoneNumber(phone_number);
      filteredPayments = filteredPayments.filter(p => p.phone_number === formattedPhone);
    }

    if (from_date) {
      filteredPayments = filteredPayments.filter(p => 
        new Date(p.created_at) >= new Date(from_date)
      );
    }

    if (to_date) {
      filteredPayments = filteredPayments.filter(p => 
        new Date(p.created_at) <= new Date(to_date)
      );
    }
    
    // Sort by creation date (newest first)
    filteredPayments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
    
    res.json({ 
      success: true,
      payments: paginatedPayments,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: filteredPayments.length,
        total_pages: Math.ceil(filteredPayments.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment history' });
  }
});

// Get payment analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    // Calculate real analytics from payments data
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const periodPayments = mockPayments.filter(p => 
      new Date(p.created_at) >= startDate
    );

    const analytics = {
      period,
      total_transactions: periodPayments.length,
      successful_transactions: periodPayments.filter(p => p.status === 'completed').length,
      failed_transactions: periodPayments.filter(p => p.status === 'failed').length,
      pending_transactions: periodPayments.filter(p => p.status === 'pending').length,
      timeout_transactions: periodPayments.filter(p => p.status === 'timeout').length,
      total_volume: periodPayments.reduce((sum, p) => sum + p.amount, 0),
      total_commission: periodPayments.reduce((sum, p) => sum + (p.platform_commission || 0), 0),
      average_transaction: periodPayments.length > 0 ? 
        Math.round(periodPayments.reduce((sum, p) => sum + p.amount, 0) / periodPayments.length) : 0,
      success_rate: periodPayments.length > 0 ? 
        Math.round((periodPayments.filter(p => p.status === 'completed').length / periodPayments.length) * 100) : 0,
      payment_methods: {
        mpesa: {
          count: periodPayments.length,
          volume: periodPayments.reduce((sum, p) => sum + p.amount, 0)
        }
      }
    };

    res.json({
      success: true,
      analytics
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// M-Pesa service health check
router.get('/health', async (req, res) => {
  try {
    const health = await mpesaService.healthCheck();
    const stats = mpesaService.getStats();
    
    res.json({
      success: true,
      service: 'M-Pesa Payment Service',
      health,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Get transaction fees for amount
router.get('/fees/:amount', (req, res) => {
  try {
    const { amount } = req.params;
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const fees = mpesaService.getTransactionFees(numAmount);
    const commission = mpesaService.calculateCommission(numAmount);
    
    res.json({
      success: true,
      amount: numAmount,
      transaction_fees: fees,
      platform_commission: commission.commission,
      seller_amount: commission.seller_amount,
      total_deductions: fees + commission.commission,
      net_amount: numAmount - fees - commission.commission
    });
    
  } catch (error) {
    console.error('Fees calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate fees' });
  }
});

module.exports = router; 
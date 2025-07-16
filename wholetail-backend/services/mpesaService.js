const axios = require('axios');
const crypto = require('crypto');

class MPESAService {
  constructor() {
    this.config = {
      consumer_key: process.env.MPESA_CONSUMER_KEY,
      consumer_secret: process.env.MPESA_CONSUMER_SECRET,
      business_short_code: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
      passkey: process.env.MPESA_PASSKEY,
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox', // sandbox or production
      callback_url: process.env.MPESA_CALLBACK_URL,
      timeout_url: process.env.MPESA_TIMEOUT_URL,
      result_url: process.env.MPESA_RESULT_URL,
      queue_timeout_url: process.env.MPESA_QUEUE_TIMEOUT_URL
    };

    // Determine if we're in mock mode
    this.mockMode = !this.config.consumer_key || this.config.consumer_key.includes('mock');

    // Base URLs for different environments
    this.baseURL = this.config.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';

    // In-memory store for mock mode (use database in production)
    this.mockPayments = new Map();
    this.accessTokenCache = null;
    this.tokenExpiry = null;

    console.log(`💳 M-Pesa Service initialized (${this.mockMode ? 'Mock Mode' : 'Live Mode'})`);
  }

  /**
   * Generate OAuth access token
   */
  async generateAccessToken() {
    if (this.mockMode) {
      return `mock_token_${Date.now()}`;
    }

    // Check if we have a valid cached token
    if (this.accessTokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessTokenCache;
    }

    try {
      const auth = Buffer.from(
        `${this.config.consumer_key}:${this.config.consumer_secret}`
      ).toString('base64');

      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      this.accessTokenCache = response.data.access_token;
      // Cache for 50 minutes (tokens expire in 1 hour)
      this.tokenExpiry = Date.now() + (50 * 60 * 1000);

      console.log('✅ M-Pesa access token generated');
      return this.accessTokenCache;

    } catch (error) {
      console.error('❌ M-Pesa token generation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`Failed to generate M-Pesa access token: ${error.message}`);
    }
  }

  /**
   * Generate password for STK Push
   */
  generatePassword() {
    const timestamp = new Date().toISOString()
      .replace(/[^0-9]/g, '')
      .substring(0, 14); // YYYYMMDDHHmmss format

    const password = Buffer.from(
      `${this.config.business_short_code}${this.config.passkey}${timestamp}`
    ).toString('base64');

    return { password, timestamp };
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   */
  formatPhoneNumber(phone) {
    if (!phone) throw new Error('Phone number is required');

    // Remove all non-digit characters
    let formatted = phone.replace(/\D/g, '');

    // Handle different phone number formats
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('7') || formatted.startsWith('1')) {
      formatted = '254' + formatted;
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }

    // Validate format
    if (!/^254[7][0-9]{8}$/.test(formatted)) {
      throw new Error('Invalid Kenyan phone number format');
    }

    return formatted;
  }

  /**
   * Validate M-Pesa phone number
   */
  validatePhoneNumber(phone) {
    try {
      const formatted = this.formatPhoneNumber(phone);
      const prefix = formatted.substring(0, 6);
      
      // Safaricom prefixes that support STK Push
      const supportedPrefixes = [
        '254701', '254702', '254703', '254704', '254705',
        '254706', '254707', '254708', '254709', '254710',
        '254711', '254712', '254713', '254714', '254715',
        '254716', '254717', '254718', '254719', '254720',
        '254721', '254722', '254723', '254724', '254725',
        '254726', '254727', '254728', '254729'
      ];

      return {
        formatted,
        isValid: supportedPrefixes.includes(prefix),
        network: supportedPrefixes.includes(prefix) ? 'Safaricom' : 'Other',
        supportsSTK: supportedPrefixes.includes(prefix)
      };
    } catch (error) {
      return {
        formatted: null,
        isValid: false,
        network: 'Unknown',
        supportsSTK: false,
        error: error.message
      };
    }
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush({
    amount,
    phone_number,
    account_reference,
    transaction_desc,
    callback_url = null,
    timeout_url = null
  }) {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const phoneValidation = this.validatePhoneNumber(phone_number);
    if (!phoneValidation.isValid) {
      throw new Error(`Invalid phone number: ${phoneValidation.error || 'Not a Safaricom number'}`);
    }

    const formattedPhone = phoneValidation.formatted;
    const roundedAmount = Math.round(amount);

    if (this.mockMode) {
      return this.mockSTKPush({
        amount: roundedAmount,
        phone_number: formattedPhone,
        account_reference,
        transaction_desc
      });
    }

    try {
      const accessToken = await this.generateAccessToken();
      const { password, timestamp } = this.generatePassword();

      const payload = {
        BusinessShortCode: this.config.business_short_code,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: roundedAmount,
        PartyA: formattedPhone,
        PartyB: this.config.business_short_code,
        PhoneNumber: formattedPhone,
        CallBackURL: callback_url || this.config.callback_url,
        AccountReference: account_reference || `WHL${Date.now()}`,
        TransactionDesc: transaction_desc || 'Wholetail Payment'
      };

      console.log('🚀 Initiating STK Push:', {
        amount: payload.Amount,
        phone: payload.PhoneNumber,
        reference: payload.AccountReference
      });

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      if (response.data.ResponseCode === '0') {
        console.log('✅ STK Push initiated successfully');
        return {
          success: true,
          checkout_request_id: response.data.CheckoutRequestID,
          merchant_request_id: response.data.MerchantRequestID,
          response_code: response.data.ResponseCode,
          response_description: response.data.ResponseDescription,
          customer_message: response.data.CustomerMessage
        };
      } else {
        throw new Error(`STK Push failed: ${response.data.ResponseDescription}`);
      }

    } catch (error) {
      console.error('❌ STK Push error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response?.status === 401) {
        // Token expired, clear cache and retry once
        this.accessTokenCache = null;
        this.tokenExpiry = null;
        throw new Error('Authentication failed. Please check M-Pesa credentials.');
      }

      throw new Error(`STK Push failed: ${error.message}`);
    }
  }

  /**
   * Mock STK Push for development
   */
  mockSTKPush({ amount, phone_number, account_reference, transaction_desc }) {
    const checkoutRequestId = `ws_CO_${Date.now()}`;
    const merchantRequestId = `ws_MR_${Date.now()}`;

    const mockPayment = {
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      amount,
      phone_number,
      account_reference,
      transaction_desc,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    this.mockPayments.set(checkoutRequestId, mockPayment);

    // Simulate payment completion after 5-15 seconds
    const delay = Math.random() * 10000 + 5000;
    setTimeout(() => {
      this.simulateCallback(checkoutRequestId);
    }, delay);

    return {
      success: true,
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      response_code: '0',
      response_description: 'Success. Request accepted for processing',
      customer_message: 'Success. Request accepted for processing'
    };
  }

  /**
   * Simulate callback for mock mode
   */
  simulateCallback(checkoutRequestId) {
    const payment = this.mockPayments.get(checkoutRequestId);
    if (!payment) return;

    // 90% success rate for mock payments
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      payment.status = 'completed';
      payment.mpesa_receipt = `QHL${Date.now().toString().slice(-8)}`;
      payment.transaction_date = parseInt(new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14));
      payment.completed_at = new Date().toISOString();
      
      console.log(`✅ Mock payment completed: ${payment.mpesa_receipt}`);
    } else {
      payment.status = 'failed';
      payment.failure_reason = 'User cancelled the transaction';
      payment.failed_at = new Date().toISOString();
      
      console.log(`❌ Mock payment failed: ${checkoutRequestId}`);
    }

    this.mockPayments.set(checkoutRequestId, payment);
  }

  /**
   * Process M-Pesa callback
   */
  processCallback(callbackData) {
    try {
      const { Body } = callbackData;
      if (!Body || !Body.stkCallback) {
        throw new Error('Invalid callback format');
      }

      const { stkCallback } = Body;
      const {
        CheckoutRequestID,
        MerchantRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
      } = stkCallback;

      const result = {
        checkout_request_id: CheckoutRequestID,
        merchant_request_id: MerchantRequestID,
        result_code: ResultCode,
        result_desc: ResultDesc,
        timestamp: new Date().toISOString()
      };

      if (ResultCode === 0) {
        // Payment successful
        const metadata = CallbackMetadata?.Item || [];
        
        result.status = 'completed';
        result.amount = this.extractMetadata(metadata, 'Amount');
        result.mpesa_receipt = this.extractMetadata(metadata, 'MpesaReceiptNumber');
        result.transaction_date = this.extractMetadata(metadata, 'TransactionDate');
        result.phone_number = this.extractMetadata(metadata, 'PhoneNumber');

        console.log(`✅ Payment successful: ${result.mpesa_receipt} - KES ${result.amount}`);
      } else {
        // Payment failed
        result.status = 'failed';
        result.error_message = ResultDesc;

        console.log(`❌ Payment failed: ${ResultDesc}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Callback processing error:', error);
      throw new Error(`Failed to process callback: ${error.message}`);
    }
  }

  /**
   * Extract metadata from callback
   */
  extractMetadata(metadata, name) {
    const item = metadata.find(item => item.Name === name);
    return item ? item.Value : null;
  }

  /**
   * Process timeout callback
   */
  processTimeout(timeoutData) {
    console.log('⏰ Payment timeout received:', timeoutData);
    
    return {
      checkout_request_id: timeoutData.CheckoutRequestID,
      merchant_request_id: timeoutData.MerchantRequestID,
      status: 'timeout',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Query STK Push status
   */
  async querySTKPushStatus(checkoutRequestId) {
    if (this.mockMode) {
      const payment = this.mockPayments.get(checkoutRequestId);
      if (!payment) {
        return { status: 'not_found' };
      }
      return {
        status: payment.status,
        amount: payment.amount,
        mpesa_receipt: payment.mpesa_receipt,
        phone_number: payment.phone_number
      };
    }

    try {
      const accessToken = await this.generateAccessToken();
      const { password, timestamp } = this.generatePassword();

      const payload = {
        BusinessShortCode: this.config.business_short_code,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        status: response.data.ResultCode === '0' ? 'completed' : 'pending',
        response_code: response.data.ResponseCode,
        response_description: response.data.ResponseDescription,
        result_code: response.data.ResultCode,
        result_desc: response.data.ResultDesc
      };

    } catch (error) {
      console.error('❌ STK Push query error:', error);
      throw new Error(`Failed to query payment status: ${error.message}`);
    }
  }

  /**
   * Calculate platform commission (3% as per PRD)
   */
  calculateCommission(amount) {
    const commission = Math.round(amount * 0.03); // 3% commission
    const seller_amount = amount - commission;
    
    return {
      gross_amount: amount,
      commission: commission,
      seller_amount: seller_amount,
      commission_rate: 0.03
    };
  }

  /**
   * Validate webhook signature (for security)
   */
  validateWebhookSignature(payload, signature, secret) {
    if (!secret) {
      console.warn('⚠️ Webhook secret not configured');
      return true; // Allow in development
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Get M-Pesa transaction fees
   */
  getTransactionFees(amount) {
    // M-Pesa transaction fees (as of 2024)
    if (amount <= 100) return 0;
    if (amount <= 500) return 7;
    if (amount <= 1000) return 13;
    if (amount <= 1500) return 23;
    if (amount <= 2500) return 33;
    if (amount <= 3500) return 53;
    if (amount <= 5000) return 57;
    if (amount <= 7500) return 78;
    if (amount <= 10000) return 90;
    if (amount <= 15000) return 108;
    if (amount <= 20000) return 115;
    if (amount <= 35000) return 167;
    if (amount <= 50000) return 185;
    if (amount <= 150000) return 197;
    return 300; // Above 150,000
  }

  /**
   * Health check for M-Pesa service
   */
  async healthCheck() {
    try {
      if (this.mockMode) {
        return {
          status: 'healthy',
          mode: 'mock',
          timestamp: new Date().toISOString()
        };
      }

      // Test token generation
      await this.generateAccessToken();
      
      return {
        status: 'healthy',
        mode: 'live',
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      mode: this.mockMode ? 'mock' : 'live',
      environment: this.config.environment,
      mock_payments: this.mockPayments.size,
      has_cached_token: !!this.accessTokenCache,
      token_expires_at: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null
    };
  }
}

module.exports = MPESAService; 
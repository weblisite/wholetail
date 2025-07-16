const twilio = require('twilio');

class SMSService {
  constructor() {
    // Initialize SMS providers
    this.providers = this.initializeProviders();
    this.currentProvider = 'twilio'; // Default provider
    this.mockMode = !process.env.TWILIO_ACCOUNT_SID;
    
    // SMS tracking and analytics
    this.sentMessages = new Map();
    this.deliveryReports = new Map();
    this.optOutList = new Set();
    this.campaignStats = new Map();
    
    console.log(`📱 SMS Service initialized${this.mockMode ? ' (Mock Mode)' : ' (Live Mode)'}`);
    console.log(`📡 Active providers: ${Object.keys(this.providers).join(', ')}`);
  }

  initializeProviders() {
    const providers = {};

    // Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      providers.twilio = {
        client: twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN),
        name: 'Twilio',
        capabilities: ['sms', 'mms', 'delivery_reports', 'opt_out'],
        rate_limit: 1, // 1 message per second for free tier
        cost_per_message: 0.0075, // $0.0075 per SMS
        supported_countries: ['US', 'CA', 'GB', 'KE', 'UG', 'TZ']
      };
    }

    // MessageBird (fallback)
    if (process.env.MESSAGEBIRD_ACCESS_KEY) {
      providers.messagebird = {
        client: null, // Would initialize MessageBird client
        name: 'MessageBird',
        capabilities: ['sms', 'voice', 'delivery_reports'],
        rate_limit: 10,
        cost_per_message: 0.05,
        supported_countries: ['KE', 'UG', 'TZ', 'NG', 'ZA']
      };
    }

    // Africa's Talking (Local provider)
    if (process.env.AFRICASTALKING_API_KEY) {
      providers.africastalking = {
        client: null, // Would initialize Africa's Talking client
        name: "Africa's Talking",
        capabilities: ['sms', 'premium_sms', 'bulk_sms'],
        rate_limit: 100,
        cost_per_message: 0.02,
        supported_countries: ['KE', 'UG', 'TZ', 'NG', 'ZA', 'GH']
      };
    }

    return providers;
  }

  // Send SMS campaign to audience segments
  async sendCampaignSMS(campaignId, message, recipients, options = {}) {
    try {
      console.log(`📤 Starting SMS campaign ${campaignId} to ${recipients.length} recipients`);
      
      const campaign = {
        id: campaignId,
        message: message,
        total_recipients: recipients.length,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        opt_out_count: 0,
        started_at: new Date(),
        status: 'sending',
        provider: this.currentProvider,
        cost_estimate: this.calculateCampaignCost(recipients.length),
        delivery_reports: []
      };

      this.campaignStats.set(campaignId, campaign);

      // Filter out opted-out recipients
      const validRecipients = recipients.filter(recipient => 
        !this.optOutList.has(recipient.phone) && this.validatePhoneNumber(recipient.phone)
      );

      console.log(`📱 Valid recipients after filtering: ${validRecipients.length}`);

      // Batch send with rate limiting
      const results = await this.batchSendSMS(campaignId, message, validRecipients, options);

      // Update campaign stats
      campaign.sent_count = results.sent;
      campaign.failed_count = results.failed;
      campaign.status = 'completed';
      campaign.completed_at = new Date();

      console.log(`✅ Campaign ${campaignId} completed: ${results.sent} sent, ${results.failed} failed`);

      return {
        campaign_id: campaignId,
        success: true,
        stats: campaign,
        results: results
      };

    } catch (error) {
      console.error('Error sending SMS campaign:', error);
      const campaign = this.campaignStats.get(campaignId);
      if (campaign) {
        campaign.status = 'failed';
        campaign.error = error.message;
      }
      throw error;
    }
  }

  async batchSendSMS(campaignId, message, recipients, options) {
    const results = { sent: 0, failed: 0, messages: [] };
    const provider = this.providers[this.currentProvider];
    const batchSize = options.batch_size || 10;
    const delayBetweenBatches = options.delay || 1000; // 1 second

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.sendSingleSMS(
            recipient.phone,
            this.personalizeMessage(message, recipient),
            { campaign_id: campaignId, recipient_id: recipient.id }
          );
          
          results.sent++;
          results.messages.push(result);
          return result;
          
        } catch (error) {
          console.error(`Failed to send to ${recipient.phone}:`, error);
          results.failed++;
          return { 
            recipient: recipient.phone, 
            status: 'failed', 
            error: error.message 
          };
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting delay
      if (i + batchSize < recipients.length) {
        await this.delay(delayBetweenBatches);
      }

      console.log(`📊 Batch ${Math.ceil((i + batchSize) / batchSize)} completed: ${results.sent} sent, ${results.failed} failed`);
    }

    return results;
  }

  async sendSingleSMS(phoneNumber, message, metadata = {}) {
    if (this.mockMode) {
      return this.mockSendSMS(phoneNumber, message, metadata);
    }

    const provider = this.providers[this.currentProvider];
    
    try {
      let result;
      
      if (this.currentProvider === 'twilio') {
        result = await provider.client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
          statusCallback: `${process.env.BASE_URL}/api/sms/webhook/delivery`,
          provideFeedback: true
        });
      }
      // Add other providers here
      
      const messageRecord = {
        id: result.sid || `msg_${Date.now()}`,
        campaign_id: metadata.campaign_id,
        recipient_id: metadata.recipient_id,
        phone: phoneNumber,
        message: message,
        status: result.status || 'sent',
        provider: this.currentProvider,
        cost: provider.cost_per_message,
        sent_at: new Date(),
        delivery_status: 'pending'
      };

      this.sentMessages.set(messageRecord.id, messageRecord);
      
      return messageRecord;

    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // Try fallback provider if available
      if (this.hasFallbackProvider()) {
        console.log('🔄 Attempting fallback provider...');
        return await this.sendWithFallback(phoneNumber, message, metadata);
      }
      
      throw error;
    }
  }

  mockSendSMS(phoneNumber, message, metadata) {
    const messageRecord = {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaign_id: metadata.campaign_id,
      recipient_id: metadata.recipient_id,
      phone: phoneNumber,
      message: message,
      status: 'sent',
      provider: 'mock',
      cost: 0.02,
      sent_at: new Date(),
      delivery_status: 'delivered' // Mock immediate delivery
    };

    this.sentMessages.set(messageRecord.id, messageRecord);
    
    // Simulate delivery report after random delay
    setTimeout(() => {
      this.handleDeliveryReport({
        message_id: messageRecord.id,
        status: Math.random() > 0.05 ? 'delivered' : 'failed', // 95% success rate
        delivered_at: new Date()
      });
    }, Math.random() * 5000 + 1000); // 1-6 seconds delay

    return messageRecord;
  }

  personalizeMessage(template, recipient) {
    return template
      .replace(/\{name\}/g, recipient.name || 'Customer')
      .replace(/\{business_name\}/g, recipient.business_name || 'your business')
      .replace(/\{location\}/g, recipient.location || 'your area')
      .replace(/\{phone\}/g, recipient.phone);
  }

  // Handle delivery reports from SMS providers
  handleDeliveryReport(report) {
    const messageId = report.message_id || report.MessageSid;
    const message = this.sentMessages.get(messageId);
    
    if (message) {
      message.delivery_status = report.status || report.MessageStatus;
      message.delivered_at = new Date(report.delivered_at || Date.now());
      
      if (report.error_code) {
        message.error_code = report.error_code;
        message.error_message = report.error_message;
      }

      // Update campaign stats
      if (message.campaign_id) {
        const campaign = this.campaignStats.get(message.campaign_id);
        if (campaign) {
          if (message.delivery_status === 'delivered') {
            campaign.delivered_count++;
          } else if (message.delivery_status === 'failed') {
            campaign.failed_count++;
          }
        }
      }

      console.log(`📨 Delivery report: ${messageId} - ${message.delivery_status}`);
    }

    this.deliveryReports.set(messageId, report);
  }

  // Handle opt-out requests
  handleOptOut(phoneNumber, campaignId = null) {
    this.optOutList.add(phoneNumber);
    
    const optOutRecord = {
      phone: phoneNumber,
      opted_out_at: new Date(),
      campaign_id: campaignId,
      method: 'sms_reply'
    };

    console.log(`🚫 Opt-out recorded: ${phoneNumber}`);

    // Update campaign stats if applicable
    if (campaignId) {
      const campaign = this.campaignStats.get(campaignId);
      if (campaign) {
        campaign.opt_out_count++;
      }
    }

    // Send confirmation SMS
    this.sendOptOutConfirmation(phoneNumber);

    return optOutRecord;
  }

  async sendOptOutConfirmation(phoneNumber) {
    const confirmationMessage = "You have been successfully unsubscribed from Wholetail SMS notifications. Reply START to opt back in.";
    
    try {
      await this.sendSingleSMS(phoneNumber, confirmationMessage, { type: 'opt_out_confirmation' });
    } catch (error) {
      console.error('Error sending opt-out confirmation:', error);
    }
  }

  // Handle opt-in requests
  handleOptIn(phoneNumber) {
    this.optOutList.delete(phoneNumber);
    
    const welcomeMessage = "Welcome back to Wholetail SMS notifications! You'll now receive our latest offers and updates.";
    
    this.sendSingleSMS(phoneNumber, welcomeMessage, { type: 'opt_in_confirmation' });
    
    console.log(`✅ Opt-in recorded: ${phoneNumber}`);
  }

  // Get campaign analytics
  getCampaignAnalytics(campaignId) {
    const campaign = this.campaignStats.get(campaignId);
    if (!campaign) {
      return null;
    }

    const deliveryRate = campaign.total_recipients > 0 ? 
      (campaign.delivered_count / campaign.total_recipients) * 100 : 0;
    
    const failureRate = campaign.total_recipients > 0 ? 
      (campaign.failed_count / campaign.total_recipients) * 100 : 0;

    const optOutRate = campaign.total_recipients > 0 ? 
      (campaign.opt_out_count / campaign.total_recipients) * 100 : 0;

    return {
      campaign_id: campaignId,
      total_recipients: campaign.total_recipients,
      sent_count: campaign.sent_count,
      delivered_count: campaign.delivered_count,
      failed_count: campaign.failed_count,
      opt_out_count: campaign.opt_out_count,
      delivery_rate: deliveryRate,
      failure_rate: failureRate,
      opt_out_rate: optOutRate,
      total_cost: campaign.cost_estimate,
      cost_per_delivery: campaign.delivered_count > 0 ? 
        campaign.cost_estimate / campaign.delivered_count : 0,
      started_at: campaign.started_at,
      completed_at: campaign.completed_at,
      duration: campaign.completed_at ? 
        campaign.completed_at.getTime() - campaign.started_at.getTime() : null,
      provider: campaign.provider,
      status: campaign.status
    };
  }

  // Get overall SMS analytics
  getSMSAnalytics(period = '30d') {
    const periodMs = this.parsePeriod(period);
    const cutoffDate = new Date(Date.now() - periodMs);
    
    const recentCampaigns = Array.from(this.campaignStats.values())
      .filter(campaign => campaign.started_at > cutoffDate);

    const totalSent = recentCampaigns.reduce((sum, c) => sum + c.sent_count, 0);
    const totalDelivered = recentCampaigns.reduce((sum, c) => sum + c.delivered_count, 0);
    const totalFailed = recentCampaigns.reduce((sum, c) => sum + c.failed_count, 0);
    const totalCost = recentCampaigns.reduce((sum, c) => sum + c.cost_estimate, 0);

    return {
      period: period,
      total_campaigns: recentCampaigns.length,
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      overall_delivery_rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      total_cost: totalCost,
      average_cost_per_message: totalSent > 0 ? totalCost / totalSent : 0,
      opt_out_list_size: this.optOutList.size,
      active_providers: Object.keys(this.providers),
      current_provider: this.currentProvider,
      provider_performance: this.getProviderPerformance(period)
    };
  }

  getProviderPerformance(period) {
    const periodMs = this.parsePeriod(period);
    const cutoffDate = new Date(Date.now() - periodMs);
    
    const providerStats = {};
    
    for (const [messageId, message] of this.sentMessages) {
      if (message.sent_at > cutoffDate) {
        if (!providerStats[message.provider]) {
          providerStats[message.provider] = {
            sent: 0,
            delivered: 0,
            failed: 0,
            cost: 0
          };
        }
        
        const stats = providerStats[message.provider];
        stats.sent++;
        stats.cost += message.cost;
        
        if (message.delivery_status === 'delivered') {
          stats.delivered++;
        } else if (message.delivery_status === 'failed') {
          stats.failed++;
        }
      }
    }

    // Calculate rates for each provider
    Object.values(providerStats).forEach(stats => {
      stats.delivery_rate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
      stats.failure_rate = stats.sent > 0 ? (stats.failed / stats.sent) * 100 : 0;
      stats.cost_per_message = stats.sent > 0 ? stats.cost / stats.sent : 0;
    });

    return providerStats;
  }

  // Smart provider selection based on performance and cost
  selectOptimalProvider(recipients, campaignType) {
    const availableProviders = Object.keys(this.providers);
    
    if (availableProviders.length === 1) {
      return availableProviders[0];
    }

    // Analyze requirements
    const analysis = {
      recipient_count: recipients.length,
      countries: [...new Set(recipients.map(r => this.extractCountryCode(r.phone)))],
      urgency: campaignType === 'flash_sale' ? 'high' : 'normal',
      budget_priority: campaignType === 'promotional' ? 'cost' : 'quality'
    };

    // Score each provider
    const providerScores = availableProviders.map(providerId => {
      const provider = this.providers[providerId];
      const performance = this.getProviderPerformance('7d')[providerId] || { delivery_rate: 95 };
      
      let score = 0;
      
      // Delivery rate (40% weight)
      score += (performance.delivery_rate || 95) * 0.4;
      
      // Cost efficiency (30% weight)
      const costScore = 100 - (provider.cost_per_message * 1000); // Lower cost = higher score
      score += Math.max(0, costScore) * 0.3;
      
      // Rate limit capability (20% weight)
      const rateLimitScore = Math.min(100, provider.rate_limit * 10);
      score += rateLimitScore * 0.2;
      
      // Country support (10% weight)
      const supportedCountries = analysis.countries.filter(country => 
        provider.supported_countries.includes(country)
      ).length;
      const countrySupportScore = (supportedCountries / analysis.countries.length) * 100;
      score += countrySupportScore * 0.1;
      
      return { provider: providerId, score: score };
    });

    const optimalProvider = providerScores.sort((a, b) => b.score - a.score)[0];
    
    console.log(`🎯 Selected optimal provider: ${optimalProvider.provider} (score: ${optimalProvider.score.toFixed(2)})`);
    
    return optimalProvider.provider;
  }

  // Utility methods
  validatePhoneNumber(phone) {
    // Basic international phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  extractCountryCode(phone) {
    // Extract country code from phone number
    const match = phone.match(/^\+(\d{1,3})/);
    if (match) {
      const code = match[1];
      // Map common codes to countries
      const codeMap = {
        '1': 'US', '254': 'KE', '256': 'UG', '255': 'TZ',
        '234': 'NG', '27': 'ZA', '233': 'GH'
      };
      return codeMap[code] || 'UNKNOWN';
    }
    return 'UNKNOWN';
  }

  calculateCampaignCost(recipientCount) {
    const provider = this.providers[this.currentProvider];
    return recipientCount * provider.cost_per_message;
  }

  parsePeriod(period) {
    const periodMap = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    return periodMap[period] || periodMap['30d'];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hasFallbackProvider() {
    return Object.keys(this.providers).length > 1;
  }

  async sendWithFallback(phoneNumber, message, metadata) {
    const availableProviders = Object.keys(this.providers).filter(p => p !== this.currentProvider);
    
    for (const providerId of availableProviders) {
      try {
        console.log(`🔄 Trying fallback provider: ${providerId}`);
        const originalProvider = this.currentProvider;
        this.currentProvider = providerId;
        
        const result = await this.sendSingleSMS(phoneNumber, message, metadata);
        
        console.log(`✅ Fallback successful with ${providerId}`);
        return result;
        
      } catch (error) {
        console.error(`❌ Fallback failed with ${providerId}:`, error);
        continue;
      }
    }
    
    throw new Error('All SMS providers failed');
  }

  // Template management for campaigns
  createTemplate(name, content, variables = []) {
    const template = {
      id: `template_${Date.now()}`,
      name: name,
      content: content,
      variables: variables,
      created_at: new Date(),
      usage_count: 0
    };

    return template;
  }

  getPopularTemplates() {
    return [
      {
        id: 'new_product_alert',
        name: 'New Product Alert',
        content: 'Hi {name}! New {product_category} products now available at {business_name}. Shop now: {link}',
        variables: ['name', 'product_category', 'business_name', 'link'],
        usage_count: 245
      },
      {
        id: 'flash_sale',
        name: 'Flash Sale Notification',
        content: '⚡ FLASH SALE: {discount}% off all {category} products! Limited time only. Order now: {link}',
        variables: ['discount', 'category', 'link'],
        usage_count: 189
      },
      {
        id: 'order_confirmation',
        name: 'Order Confirmation',
        content: 'Order confirmed! Your {order_id} will be delivered to {address} by {delivery_date}. Track: {tracking_link}',
        variables: ['order_id', 'address', 'delivery_date', 'tracking_link'],
        usage_count: 567
      }
    ];
  }
}

module.exports = new SMSService(); 
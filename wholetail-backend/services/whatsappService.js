const axios = require('axios');
const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    this.config = {
      access_token: process.env.WHATSAPP_ACCESS_TOKEN,
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
      business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      verify_token: process.env.WHATSAPP_VERIFY_TOKEN,
      webhook_secret: process.env.WHATSAPP_WEBHOOK_SECRET,
      api_version: process.env.WHATSAPP_API_VERSION || 'v17.0'
    };

    // Determine if we're in mock mode
    this.mockMode = !this.config.access_token || this.config.access_token.includes('mock');

    // Base URL for WhatsApp Business API
    this.baseURL = `https://graph.facebook.com/${this.config.api_version}`;

    // In-memory storage for mock mode (use database in production)
    this.mockMessages = new Map();
    this.messageTemplates = new Map();
    this.messageStatus = new Map();

    // Rate limiting
    this.rateLimits = {
      messages_per_second: 20,
      messages_per_day: 100000,
      daily_count: 0,
      last_reset: new Date()
    };

    console.log(`📱 WhatsApp Service initialized (${this.mockMode ? 'Mock Mode' : 'Live Mode'})`);
    
    // Initialize default templates
    this.initializeTemplates();
  }

  /**
   * Initialize WhatsApp message templates
   */
  initializeTemplates() {
    // Order confirmation template
    this.messageTemplates.set('order_confirmation', {
      name: 'order_confirmation',
      language: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '✅ Order Confirmed - Wholetail'
        },
        {
          type: 'body',
          text: 'Hi {{1}},\n\nYour order #{{2}} has been confirmed!\n\n📦 Items: {{3}}\n💰 Total: KES {{4}}\n📅 Expected delivery: {{5}}\n\nTrack your order: {{6}}\n\nThank you for choosing Wholetail!'
        },
        {
          type: 'footer',
          text: 'Wholetail - Your B2B Trade Solution'
        }
      ]
    });

    // Payment reminder template
    this.messageTemplates.set('payment_reminder', {
      name: 'payment_reminder',
      language: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '💳 Payment Reminder - Wholetail'
        },
        {
          type: 'body',
          text: 'Hi {{1}},\n\nThis is a friendly reminder about your pending payment:\n\n📋 Order: #{{2}}\n💰 Amount: KES {{3}}\n📅 Due: {{4}}\n\nPay now to avoid delays: {{5}}\n\nNeed help? Reply to this message.'
        },
        {
          type: 'footer',
          text: 'Wholetail Support'
        }
      ]
    });

    // Delivery update template
    this.messageTemplates.set('delivery_update', {
      name: 'delivery_update',
      language: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🚚 Delivery Update - Wholetail'
        },
        {
          type: 'body',
          text: 'Hi {{1}},\n\nYour order #{{2}} is {{3}}!\n\n📍 Current location: {{4}}\n⏰ ETA: {{5}}\n👨‍💼 Driver: {{6}} ({{7}})\n\nTrack live: {{8}}'
        },
        {
          type: 'footer',
          text: 'Wholetail Logistics'
        }
      ]
    });

    // Marketing campaign template
    this.messageTemplates.set('marketing_campaign', {
      name: 'marketing_campaign',
      language: 'en_US',
      components: [
        {
          type: 'header',
          format: 'image',
          example: {
            header_handle: ['https://example.com/campaign-image.jpg']
          }
        },
        {
          type: 'body',
          text: '🎉 {{1}}\n\n{{2}}\n\n💰 Save up to {{3}}% on bulk orders\n⏰ Limited time offer - expires {{4}}\n\nShop now: {{5}}\n\nOr reply STOP to unsubscribe.'
        },
        {
          type: 'footer',
          text: 'Wholetail Marketplace'
        }
      ]
    });

    console.log(`📋 Initialized ${this.messageTemplates.size} WhatsApp templates`);
  }

  /**
   * Format phone number for WhatsApp (international format without +)
   */
  formatPhoneNumber(phone) {
    if (!phone) throw new Error('Phone number is required');

    // Remove all non-digit characters
    let formatted = phone.replace(/\D/g, '');

    // Handle different phone number formats for Kenya
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('7') || formatted.startsWith('1')) {
      formatted = '254' + formatted;
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }

    // Validate format (Kenya mobile numbers)
    if (!/^254[7][0-9]{8}$/.test(formatted)) {
      throw new Error('Invalid Kenyan phone number format');
    }

    return formatted;
  }

  /**
   * Check rate limits
   */
  checkRateLimit() {
    const now = new Date();
    const today = now.toDateString();
    const lastReset = this.rateLimits.last_reset.toDateString();

    // Reset daily count if it's a new day
    if (today !== lastReset) {
      this.rateLimits.daily_count = 0;
      this.rateLimits.last_reset = now;
    }

    if (this.rateLimits.daily_count >= this.rateLimits.messages_per_day) {
      throw new Error('Daily message limit reached');
    }

    return true;
  }

  /**
   * Send text message
   */
  async sendTextMessage(phone_number, message, context = {}) {
    if (this.mockMode) {
      return this.mockSendMessage({
        type: 'text',
        phone_number: this.formatPhoneNumber(phone_number),
        message,
        context
      });
    }

    try {
      this.checkRateLimit();

      const formattedPhone = this.formatPhoneNumber(phone_number);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      // Add context if replying to a message
      if (context.message_id) {
        payload.context = {
          message_id: context.message_id
        };
      }

      console.log('📱 Sending WhatsApp text message:', {
        to: formattedPhone,
        preview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });

      const response = await axios.post(
        `${this.baseURL}/${this.config.phone_number_id}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        
        // Track message status
        this.messageStatus.set(messageId, {
          id: messageId,
          phone_number: formattedPhone,
          type: 'text',
          message,
          status: 'sent',
          sent_at: new Date().toISOString(),
          context
        });

        this.rateLimits.daily_count++;

        console.log('✅ WhatsApp message sent successfully:', messageId);
        return {
          success: true,
          message_id: messageId,
          phone_number: formattedPhone
        };
      } else {
        throw new Error('No message ID returned from WhatsApp API');
      }

    } catch (error) {
      console.error('❌ WhatsApp send error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response?.status === 401) {
        throw new Error('WhatsApp authentication failed. Check access token.');
      } else if (error.response?.status === 429) {
        throw new Error('WhatsApp rate limit exceeded. Please try again later.');
      }

      throw new Error(`WhatsApp message failed: ${error.message}`);
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(phone_number, template_name, parameters = [], context = {}) {
    if (this.mockMode) {
      return this.mockSendMessage({
        type: 'template',
        phone_number: this.formatPhoneNumber(phone_number),
        template_name,
        parameters,
        context
      });
    }

    try {
      this.checkRateLimit();

      const formattedPhone = this.formatPhoneNumber(phone_number);
      const template = this.messageTemplates.get(template_name);
      
      if (!template) {
        throw new Error(`Template '${template_name}' not found`);
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language
          },
          components: this.buildTemplateComponents(template, parameters)
        }
      };

      console.log('📱 Sending WhatsApp template message:', {
        to: formattedPhone,
        template: template_name,
        parameters: parameters.length
      });

      const response = await axios.post(
        `${this.baseURL}/${this.config.phone_number_id}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        
        this.messageStatus.set(messageId, {
          id: messageId,
          phone_number: formattedPhone,
          type: 'template',
          template_name,
          parameters,
          status: 'sent',
          sent_at: new Date().toISOString(),
          context
        });

        this.rateLimits.daily_count++;

        console.log('✅ WhatsApp template sent successfully:', messageId);
        return {
          success: true,
          message_id: messageId,
          phone_number: formattedPhone,
          template: template_name
        };
      } else {
        throw new Error('No message ID returned from WhatsApp API');
      }

    } catch (error) {
      console.error('❌ WhatsApp template send error:', error);
      throw new Error(`WhatsApp template failed: ${error.message}`);
    }
  }

  /**
   * Send media message (image, document, etc.)
   */
  async sendMediaMessage(phone_number, media_type, media_url, caption = '', context = {}) {
    if (this.mockMode) {
      return this.mockSendMessage({
        type: 'media',
        phone_number: this.formatPhoneNumber(phone_number),
        media_type,
        media_url,
        caption,
        context
      });
    }

    try {
      this.checkRateLimit();

      const formattedPhone = this.formatPhoneNumber(phone_number);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: media_type
      };

      // Configure media based on type
      switch (media_type) {
        case 'image':
          payload.image = {
            link: media_url,
            caption: caption
          };
          break;
        case 'document':
          payload.document = {
            link: media_url,
            caption: caption
          };
          break;
        case 'video':
          payload.video = {
            link: media_url,
            caption: caption
          };
          break;
        default:
          throw new Error(`Unsupported media type: ${media_type}`);
      }

      console.log('📱 Sending WhatsApp media message:', {
        to: formattedPhone,
        type: media_type,
        url: media_url
      });

      const response = await axios.post(
        `${this.baseURL}/${this.config.phone_number_id}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      if (response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        
        this.messageStatus.set(messageId, {
          id: messageId,
          phone_number: formattedPhone,
          type: 'media',
          media_type,
          media_url,
          caption,
          status: 'sent',
          sent_at: new Date().toISOString(),
          context
        });

        this.rateLimits.daily_count++;

        console.log('✅ WhatsApp media sent successfully:', messageId);
        return {
          success: true,
          message_id: messageId,
          phone_number: formattedPhone,
          media_type
        };
      } else {
        throw new Error('No message ID returned from WhatsApp API');
      }

    } catch (error) {
      console.error('❌ WhatsApp media send error:', error);
      throw new Error(`WhatsApp media failed: ${error.message}`);
    }
  }

  /**
   * Build template components with parameters
   */
  buildTemplateComponents(template, parameters) {
    const components = [];
    
    template.components.forEach(component => {
      if (component.type === 'body' && parameters.length > 0) {
        components.push({
          type: 'body',
          parameters: parameters.map((param, index) => ({
            type: 'text',
            text: param.toString()
          }))
        });
      } else if (component.type === 'header' && component.format === 'image' && parameters.image) {
        components.push({
          type: 'header',
          parameters: [{
            type: 'image',
            image: {
              link: parameters.image
            }
          }]
        });
      }
    });

    return components;
  }

  /**
   * Mock message sending for development
   */
  mockSendMessage(messageData) {
    const messageId = `wamid.mock_${Date.now()}`;
    
    const mockMessage = {
      id: messageId,
      ...messageData,
      status: 'sent',
      sent_at: new Date().toISOString()
    };

    this.mockMessages.set(messageId, mockMessage);

    // Simulate message status updates
    setTimeout(() => {
      mockMessage.status = 'delivered';
      mockMessage.delivered_at = new Date().toISOString();
      console.log(`📱 Mock WhatsApp delivered: ${messageId}`);
    }, Math.random() * 5000 + 2000);

    setTimeout(() => {
      mockMessage.status = 'read';
      mockMessage.read_at = new Date().toISOString();
      console.log(`📱 Mock WhatsApp read: ${messageId}`);
    }, Math.random() * 10000 + 5000);

    console.log('📱 Mock WhatsApp sent:', {
      id: messageId,
      to: messageData.phone_number,
      type: messageData.type
    });

    return {
      success: true,
      message_id: messageId,
      phone_number: messageData.phone_number,
      mock: true
    };
  }

  /**
   * Process webhook from WhatsApp
   */
  processWebhook(webhookData, signature = null) {
    try {
      // Validate webhook signature if provided
      if (this.config.webhook_secret && signature) {
        const isValid = this.validateWebhookSignature(webhookData, signature);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      const { object, entry } = webhookData;
      
      if (object !== 'whatsapp_business_account') {
        throw new Error('Invalid webhook object type');
      }

      const results = [];

      entry.forEach(entryItem => {
        entryItem.changes.forEach(change => {
          if (change.field === 'messages') {
            const { messages, statuses } = change.value;

            // Process incoming messages
            if (messages) {
              messages.forEach(message => {
                const result = this.processIncomingMessage(message);
                results.push(result);
              });
            }

            // Process message status updates
            if (statuses) {
              statuses.forEach(status => {
                const result = this.processMessageStatus(status);
                results.push(result);
              });
            }
          }
        });
      });

      return results;

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Process incoming message
   */
  processIncomingMessage(message) {
    const { id, from, type, timestamp } = message;
    
    let content = '';
    let media_url = null;

    switch (type) {
      case 'text':
        content = message.text.body;
        break;
      case 'image':
        content = message.image.caption || '[Image]';
        media_url = message.image.id;
        break;
      case 'document':
        content = message.document.caption || message.document.filename || '[Document]';
        media_url = message.document.id;
        break;
      case 'audio':
        content = '[Audio message]';
        media_url = message.audio.id;
        break;
      default:
        content = `[${type} message]`;
    }

    const incomingMessage = {
      id,
      from,
      type,
      content,
      media_url,
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      processed_at: new Date().toISOString()
    };

    console.log('📥 Incoming WhatsApp message:', {
      id,
      from,
      type,
      preview: content.substring(0, 50)
    });

    // Store and process the message
    this.messageStatus.set(id, incomingMessage);

    return {
      type: 'incoming_message',
      message: incomingMessage
    };
  }

  /**
   * Process message status update
   */
  processMessageStatus(status) {
    const { id, status: messageStatus, timestamp } = status;
    
    const existingMessage = this.messageStatus.get(id);
    if (existingMessage) {
      existingMessage.status = messageStatus;
      existingMessage[`${messageStatus}_at`] = new Date(parseInt(timestamp) * 1000).toISOString();
      
      this.messageStatus.set(id, existingMessage);
    }

    console.log(`📊 WhatsApp status update: ${id} -> ${messageStatus}`);

    return {
      type: 'status_update',
      message_id: id,
      status: messageStatus,
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString()
    };
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload, signature) {
    if (!this.config.webhook_secret) {
      console.warn('⚠️ WhatsApp webhook secret not configured');
      return true; // Allow in development
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhook_secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSignature}`, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }

  /**
   * Verify webhook endpoint
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.config.verify_token) {
      console.log('✅ WhatsApp webhook verified');
      return challenge;
    } else {
      console.error('❌ WhatsApp webhook verification failed');
      throw new Error('Webhook verification failed');
    }
  }

  /**
   * Get message status
   */
  getMessageStatus(messageId) {
    const message = this.messageStatus.get(messageId);
    if (!message) {
      return { status: 'not_found' };
    }

    return {
      id: messageId,
      status: message.status,
      sent_at: message.sent_at,
      delivered_at: message.delivered_at,
      read_at: message.read_at,
      failed_at: message.failed_at
    };
  }

  /**
   * Send bulk messages (for campaigns)
   */
  async sendBulkMessages(recipients, template_name, parameters_function, options = {}) {
    if (this.mockMode) {
      console.log(`📱 Mock bulk WhatsApp: ${recipients.length} recipients`);
      return {
        success: true,
        sent: recipients.length,
        failed: 0,
        mock: true
      };
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    const batchSize = options.batch_size || 10;
    const delayBetweenBatches = options.delay || 2000; // 2 seconds

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const parameters = parameters_function ? parameters_function(recipient) : [];
          
          const result = await this.sendTemplateMessage(
            recipient.phone,
            template_name,
            parameters,
            { campaign_id: options.campaign_id, recipient_id: recipient.id }
          );
          
          results.sent++;
          return result;
          
        } catch (error) {
          console.error(`Failed to send to ${recipient.phone}:`, error);
          results.failed++;
          results.errors.push({
            phone: recipient.phone,
            error: error.message
          });
          return null;
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting delay
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }

      console.log(`📊 WhatsApp bulk batch ${Math.ceil((i + batchSize) / batchSize)} completed: ${results.sent} sent, ${results.failed} failed`);
    }

    return results;
  }

  /**
   * Get service statistics
   */
  getStats() {
    const now = new Date();
    const today = now.toDateString();
    const lastReset = this.rateLimits.last_reset.toDateString();

    // Reset daily count if it's a new day
    if (today !== lastReset) {
      this.rateLimits.daily_count = 0;
    }

    return {
      mode: this.mockMode ? 'mock' : 'live',
      phone_number_id: this.config.phone_number_id,
      templates: this.messageTemplates.size,
      messages_today: this.rateLimits.daily_count,
      daily_limit: this.rateLimits.messages_per_day,
      remaining_today: this.rateLimits.messages_per_day - this.rateLimits.daily_count,
      tracked_messages: this.messageStatus.size,
      mock_messages: this.mockMessages.size
    };
  }

  /**
   * Health check
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

      // Test API connectivity by getting business profile
      const response = await axios.get(
        `${this.baseURL}/${this.config.phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.access_token}`
          },
          timeout: 10000
        }
      );

      return {
        status: 'healthy',
        mode: 'live',
        business_account_id: this.config.business_account_id,
        phone_number_id: this.config.phone_number_id,
        api_version: this.config.api_version,
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
}

module.exports = WhatsAppService; 
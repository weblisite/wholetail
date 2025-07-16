const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Webhook verification endpoint
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('📞 WhatsApp webhook verification request:', { mode, token, challenge });

    if (!notificationService.whatsappService) {
      return res.status(500).json({ error: 'WhatsApp service not initialized' });
    }

    const verificationResult = notificationService.whatsappService.verifyWebhook(mode, token, challenge);
    
    console.log('✅ WhatsApp webhook verified successfully');
    res.status(200).send(verificationResult);

  } catch (error) {
    console.error('❌ WhatsApp webhook verification failed:', error);
    res.status(403).json({ error: 'Webhook verification failed' });
  }
});

// Webhook endpoint for receiving messages and status updates
router.post('/webhook', (req, res) => {
  try {
    console.log('📞 WhatsApp webhook received:', JSON.stringify(req.body, null, 2));

    if (!notificationService.whatsappService) {
      return res.status(500).json({ error: 'WhatsApp service not initialized' });
    }

    // Get signature for validation
    const signature = req.headers['x-hub-signature-256'];
    
    // Process the webhook
    const results = notificationService.whatsappService.processWebhook(req.body, signature);
    
    // Handle each result
    results.forEach(result => {
      if (result.type === 'incoming_message') {
        handleIncomingMessage(result.message);
      } else if (result.type === 'status_update') {
        handleStatusUpdate(result);
      }
    });

    // Acknowledge the webhook
    res.status(200).json({ success: true, processed: results.length });

  } catch (error) {
    console.error('❌ WhatsApp webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle incoming WhatsApp message
function handleIncomingMessage(message) {
  console.log('📥 Processing incoming WhatsApp message:', {
    id: message.id,
    from: message.from,
    type: message.type,
    preview: message.content.substring(0, 50)
  });

  // Auto-reply logic based on message content
  const messageText = message.content.toLowerCase();
  
  // Handle common customer service queries
  if (messageText.includes('order') || messageText.includes('track')) {
    handleOrderInquiry(message);
  } else if (messageText.includes('payment') || messageText.includes('pay')) {
    handlePaymentInquiry(message);
  } else if (messageText.includes('help') || messageText.includes('support')) {
    handleSupportRequest(message);
  } else if (messageText.includes('stop') || messageText.includes('unsubscribe')) {
    handleOptOut(message);
  } else {
    handleGeneralInquiry(message);
  }
}

// Handle message status updates
function handleStatusUpdate(statusUpdate) {
  console.log('📊 Processing WhatsApp status update:', {
    message_id: statusUpdate.message_id,
    status: statusUpdate.status,
    timestamp: statusUpdate.timestamp
  });

  // Update message status in your database here
  // This could trigger notifications to your internal systems
  
  // Log delivery analytics
  if (statusUpdate.status === 'delivered') {
    console.log(`✅ Message ${statusUpdate.message_id} delivered successfully`);
  } else if (statusUpdate.status === 'read') {
    console.log(`👁️ Message ${statusUpdate.message_id} read by recipient`);
  } else if (statusUpdate.status === 'failed') {
    console.log(`❌ Message ${statusUpdate.message_id} delivery failed`);
  }
}

// Handle order tracking inquiries
async function handleOrderInquiry(message) {
  try {
    // Extract order number if present
    const orderMatch = message.content.match(/(?:order|#)\s*([a-zA-Z0-9-]+)/i);
    
    if (orderMatch) {
      const orderId = orderMatch[1];
      
      // Look up order information (mock response for now)
      const orderInfo = await getOrderInfo(orderId);
      
      if (orderInfo) {
        const response = `📦 Order #${orderId} Status:\n\n` +
                        `Status: ${orderInfo.status}\n` +
                        `Items: ${orderInfo.items}\n` +
                        `Total: KSh ${orderInfo.total}\n` +
                        `Expected Delivery: ${orderInfo.delivery_date}\n\n` +
                        `Track live: ${orderInfo.tracking_url}`;
        
        await notificationService.sendWhatsApp(message.from, response, {
          type: 'order_inquiry_response',
          order_id: orderId,
          message_id: message.id
        });
      } else {
        await notificationService.sendWhatsApp(message.from, 
          `Sorry, I couldn't find order #${orderId}. Please check the order number and try again, or contact support for assistance.`,
          { type: 'order_not_found', message_id: message.id }
        );
      }
    } else {
      await notificationService.sendWhatsApp(message.from,
        'To track your order, please reply with your order number (e.g., "Order ORD-123" or "#ORD-123").',
        { type: 'order_inquiry_help', message_id: message.id }
      );
    }
  } catch (error) {
    console.error('Error handling order inquiry:', error);
    await notificationService.sendWhatsApp(message.from,
      'Sorry, I had trouble processing your order inquiry. Please try again or contact our support team.',
      { type: 'error_response', message_id: message.id }
    );
  }
}

// Handle payment inquiries
async function handlePaymentInquiry(message) {
  try {
    const response = `💳 Payment Help:\n\n` +
                    `• We accept M-Pesa payments\n` +
                    `• Payment is required before order processing\n` +
                    `• You'll receive a payment confirmation SMS\n` +
                    `• For payment issues, reply "payment problem"\n\n` +
                    `Need specific help with a payment? Please share your order number.`;
    
    await notificationService.sendWhatsApp(message.from, response, {
      type: 'payment_inquiry_response',
      message_id: message.id
    });
  } catch (error) {
    console.error('Error handling payment inquiry:', error);
  }
}

// Handle support requests
async function handleSupportRequest(message) {
  try {
    const response = `🤝 Wholetail Support:\n\n` +
                    `I'm here to help! You can ask me about:\n\n` +
                    `📦 Order tracking - "track order ORD-123"\n` +
                    `💳 Payment help - "payment"\n` +
                    `🚚 Delivery info - "delivery"\n` +
                    `📱 Account help - "account"\n\n` +
                    `For urgent issues, call: +254700000000\n` +
                    `Email: support@wholetail.co.ke\n\n` +
                    `Business hours: 8 AM - 6 PM (GMT+3)`;
    
    await notificationService.sendWhatsApp(message.from, response, {
      type: 'support_response',
      message_id: message.id
    });
  } catch (error) {
    console.error('Error handling support request:', error);
  }
}

// Handle opt-out requests
async function handleOptOut(message) {
  try {
    // Add user to opt-out list (implement in your database)
    await addToOptOutList(message.from);
    
    const response = `✅ You have been unsubscribed from WhatsApp notifications.\n\n` +
                    `You will no longer receive marketing messages, but may still receive important order updates.\n\n` +
                    `To resubscribe, reply "START" anytime.\n\n` +
                    `Thank you for using Wholetail!`;
    
    await notificationService.sendWhatsApp(message.from, response, {
      type: 'opt_out_confirmation',
      message_id: message.id
    });
  } catch (error) {
    console.error('Error handling opt-out:', error);
  }
}

// Handle general inquiries
async function handleGeneralInquiry(message) {
  try {
    const response = `👋 Hi! Thanks for messaging Wholetail.\n\n` +
                    `I can help you with:\n\n` +
                    `📦 Track orders - "track order"\n` +
                    `💳 Payment help - "payment"\n` +
                    `🤝 Support - "help"\n\n` +
                    `What can I assist you with today?`;
    
    await notificationService.sendWhatsApp(message.from, response, {
      type: 'general_response',
      message_id: message.id
    });
  } catch (error) {
    console.error('Error handling general inquiry:', error);
  }
}

// Test endpoints for WhatsApp functionality
router.post('/test/send', async (req, res) => {
  try {
    const { phone_number, message, type = 'text' } = req.body;
    
    if (!phone_number || !message) {
      return res.status(400).json({ 
        error: 'Phone number and message are required' 
      });
    }
    
    let result;
    
    if (type === 'template') {
      const { template_name, parameters = [] } = req.body;
      result = await notificationService.whatsappService.sendTemplateMessage(
        phone_number,
        template_name,
        parameters,
        { type: 'test' }
      );
    } else {
      result = await notificationService.sendWhatsApp(phone_number, message, { type: 'test' });
    }
    
    res.json({
      success: result.success,
      message: result.success ? 'WhatsApp message sent successfully' : 'Failed to send WhatsApp message',
      message_id: result.id,
      phone_number: result.phone_number,
      mock: result.mock || false,
      error: result.error
    });
    
  } catch (error) {
    console.error('WhatsApp test send error:', error);
    res.status(500).json({ error: 'Failed to send test WhatsApp message' });
  }
});

// Get WhatsApp service status
router.get('/status', async (req, res) => {
  try {
    if (!notificationService.whatsappService) {
      return res.status(500).json({ error: 'WhatsApp service not initialized' });
    }

    const health = await notificationService.whatsappService.healthCheck();
    const stats = notificationService.whatsappService.getStats();

    res.json({
      success: true,
      service: 'WhatsApp Business API',
      health,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get WhatsApp status',
      timestamp: new Date().toISOString()
    });
  }
});

// Get message status
router.get('/message/:messageId/status', (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!notificationService.whatsappService) {
      return res.status(500).json({ error: 'WhatsApp service not initialized' });
    }

    const status = notificationService.whatsappService.getMessageStatus(messageId);
    
    res.json({
      success: true,
      message_id: messageId,
      status
    });

  } catch (error) {
    console.error('Message status error:', error);
    res.status(500).json({ error: 'Failed to get message status' });
  }
});

// Send bulk WhatsApp messages
router.post('/bulk', async (req, res) => {
  try {
    const { recipients, template_name, campaign_id, parameters_function } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }

    if (!template_name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    if (!notificationService.whatsappService) {
      return res.status(500).json({ error: 'WhatsApp service not initialized' });
    }

    // Create parameters function if provided as string
    let paramFunc = null;
    if (parameters_function) {
      paramFunc = (recipient) => {
        // Simple parameter replacement for common use cases
        return [
          recipient.name || 'Customer',
          recipient.order_id || 'N/A',
          recipient.amount || '0'
        ];
      };
    }

    const results = await notificationService.whatsappService.sendBulkMessages(
      recipients,
      template_name,
      paramFunc,
      { campaign_id, batch_size: 10, delay: 2000 }
    );

    res.json({
      success: true,
      campaign_id,
      template: template_name,
      total_recipients: recipients.length,
      results
    });

  } catch (error) {
    console.error('Bulk WhatsApp send error:', error);
    res.status(500).json({ error: 'Failed to send bulk WhatsApp messages' });
  }
});

// Helper functions

async function getOrderInfo(orderId) {
  // Mock order data - replace with actual database lookup
  const mockOrders = {
    'ORD-001': {
      status: 'In Transit',
      items: '2x Rice 25kg, 1x Maize 90kg',
      total: '8,500',
      delivery_date: 'Tomorrow 2-4 PM',
      tracking_url: 'https://wholetail.co.ke/track/ORD-001'
    },
    'ORD-002': {
      status: 'Delivered',
      items: '5x Fresh Tomatoes 10kg',
      total: '2,400',
      delivery_date: 'Delivered today at 11:30 AM',
      tracking_url: 'https://wholetail.co.ke/track/ORD-002'
    }
  };

  return mockOrders[orderId.toUpperCase()] || null;
}

async function addToOptOutList(phoneNumber) {
  // Add user to opt-out list in database
  console.log(`📱 Adding ${phoneNumber} to WhatsApp opt-out list`);
  // TODO: Implement database operation
  return true;
}

module.exports = router; 
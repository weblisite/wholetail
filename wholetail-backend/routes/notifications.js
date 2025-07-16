const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Send single notification
router.post('/send', async (req, res) => {
  try {
    const { type, method, recipient, data } = req.body;
    
    if (!type || !method || !recipient) {
      return res.status(400).json({ 
        error: 'Type, method, and recipient are required' 
      });
    }
    
    const result = await notificationService.sendNotification(type, method, recipient, data);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Notification sent successfully',
        notification_id: result.id,
        mock: result.mock || false
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send multi-channel notification
router.post('/send/multi-channel', async (req, res) => {
  try {
    const { type, recipients, data } = req.body;
    
    if (!type || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ 
        error: 'Type and recipients array are required' 
      });
    }
    
    const result = await notificationService.sendMultiChannelNotification(type, recipients, data);
    
    res.json({
      success: result.success,
      message: result.success ? 'Multi-channel notification sent' : 'Failed to send notifications',
      results: result.results,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      }
    });
    
  } catch (error) {
    console.error('Multi-channel notification error:', error);
    res.status(500).json({ error: 'Failed to send multi-channel notification' });
  }
});

// Send specific notification types
router.post('/send/order-confirmation', async (req, res) => {
  try {
    const { recipients, order_data } = req.body;
    
    if (!recipients || !order_data) {
      return res.status(400).json({ 
        error: 'Recipients and order_data are required' 
      });
    }
    
    const result = await notificationService.sendMultiChannelNotification(
      'order_confirmation', 
      recipients, 
      order_data
    );
    
    res.json({
      success: result.success,
      message: 'Order confirmation notifications sent',
      results: result.results,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      }
    });
    
  } catch (error) {
    console.error('Order confirmation error:', error);
    res.status(500).json({ error: 'Failed to send order confirmation' });
  }
});

router.post('/send/payment-confirmation', async (req, res) => {
  try {
    const { recipients, payment_data } = req.body;
    
    if (!recipients || !payment_data) {
      return res.status(400).json({ 
        error: 'Recipients and payment_data are required' 
      });
    }
    
    const result = await notificationService.sendMultiChannelNotification(
      'payment_confirmation', 
      recipients, 
      payment_data
    );
    
    res.json({
      success: result.success,
      message: 'Payment confirmation notifications sent',
      results: result.results,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      }
    });
    
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to send payment confirmation' });
  }
});

router.post('/send/delivery-update', async (req, res) => {
  try {
    const { recipients, delivery_data } = req.body;
    
    if (!recipients || !delivery_data) {
      return res.status(400).json({ 
        error: 'Recipients and delivery_data are required' 
      });
    }
    
    const result = await notificationService.sendMultiChannelNotification(
      'delivery_update', 
      recipients, 
      delivery_data
    );
    
    res.json({
      success: result.success,
      message: 'Delivery update notifications sent',
      results: result.results,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      }
    });
    
  } catch (error) {
    console.error('Delivery update error:', error);
    res.status(500).json({ error: 'Failed to send delivery update' });
  }
});

router.post('/send/order-delivered', async (req, res) => {
  try {
    const { recipients, delivery_data } = req.body;
    
    if (!recipients || !delivery_data) {
      return res.status(400).json({ 
        error: 'Recipients and delivery_data are required' 
      });
    }
    
    const result = await notificationService.sendMultiChannelNotification(
      'order_delivered', 
      recipients, 
      delivery_data
    );
    
    res.json({
      success: result.success,
      message: 'Order delivered notifications sent',
      results: result.results,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      }
    });
    
  } catch (error) {
    console.error('Order delivered notification error:', error);
    res.status(500).json({ error: 'Failed to send order delivered notification' });
  }
});

router.post('/send/low-stock-alert', async (req, res) => {
  try {
    const { recipients, stock_data } = req.body;
    
    if (!recipients || !stock_data) {
      return res.status(400).json({ 
        error: 'Recipients and stock_data are required' 
      });
    }
    
    const result = await notificationService.sendMultiChannelNotification(
      'low_stock_alert', 
      recipients, 
      stock_data
    );
    
    res.json({
      success: result.success,
      message: 'Low stock alert notifications sent',
      results: result.results,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      }
    });
    
  } catch (error) {
    console.error('Low stock alert error:', error);
    res.status(500).json({ error: 'Failed to send low stock alert' });
  }
});

// Schedule notification
router.post('/schedule', async (req, res) => {
  try {
    const { type, method, recipient, data, send_at } = req.body;
    
    if (!type || !method || !recipient || !send_at) {
      return res.status(400).json({ 
        error: 'Type, method, recipient, and send_at are required' 
      });
    }
    
    const scheduledNotification = notificationService.scheduleNotification(
      type, method, recipient, data, send_at
    );
    
    res.json({
      success: true,
      message: 'Notification scheduled successfully',
      notification: scheduledNotification
    });
    
  } catch (error) {
    console.error('Schedule notification error:', error);
    res.status(500).json({ error: 'Failed to schedule notification' });
  }
});

// Get notification history
router.get('/history', async (req, res) => {
  try {
    const { 
      type, 
      method, 
      status, 
      recipient, 
      user_id, 
      order_id, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (method) filters.method = method;
    if (status) filters.status = status;
    if (recipient) filters.recipient = recipient;
    if (user_id) filters.user_id = user_id;
    if (order_id) filters.order_id = order_id;
    
    const notifications = notificationService.getNotificationHistory(filters);
    
    // Apply pagination
    const paginatedNotifications = notifications.slice(offset, offset + parseInt(limit));
    
    res.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total_pages: Math.ceil(notifications.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Failed to get notification history' });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    const stats = notificationService.getNotificationStats(period);
    
    res.json({
      stats,
      period
    });
    
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to get notification statistics' });
  }
});

// Get available notification templates
router.get('/templates', async (req, res) => {
  try {
    const templates = notificationService.templates;
    
    // Return template structure (without actual functions)
    const templateInfo = {};
    
    for (const [type, template] of Object.entries(templates)) {
      templateInfo[type] = {
        methods: Object.keys(template),
        description: getTemplateDescription(type)
      };
    }
    
    res.json({
      templates: templateInfo,
      total: Object.keys(templates).length
    });
    
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Test notification endpoints
router.post('/test/sms', async (req, res) => {
  try {
    const { phone_number, message } = req.body;
    
    if (!phone_number || !message) {
      return res.status(400).json({ 
        error: 'Phone number and message are required' 
      });
    }
    
    const result = await notificationService.sendSMS(phone_number, message, { type: 'test' });
    
    res.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
      notification_id: result.id,
      mock: result.mock || false,
      error: result.error
    });
    
  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({ error: 'Failed to send test SMS' });
  }
});

router.post('/test/email', async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email || !subject || !message) {
      return res.status(400).json({ 
        error: 'Email, subject, and message are required' 
      });
    }
    
    const result = await notificationService.sendEmail({
      to: email,
      subject: subject,
      html: `<p>${message}</p>`,
      type: 'test'
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      notification_id: result.id,
      mock: result.mock || false,
      error: result.error
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

router.post('/test/whatsapp', async (req, res) => {
  try {
    const { phone_number, message } = req.body;
    
    if (!phone_number || !message) {
      return res.status(400).json({ 
        error: 'Phone number and message are required' 
      });
    }
    
    const result = await notificationService.sendWhatsApp(phone_number, message, { type: 'test' });
    
    res.json({
      success: result.success,
      message: result.success ? 'Test WhatsApp sent successfully' : 'Failed to send test WhatsApp',
      notification_id: result.id,
      mock: result.mock || false,
      error: result.error
    });
    
  } catch (error) {
    console.error('Test WhatsApp error:', error);
    res.status(500).json({ error: 'Failed to send test WhatsApp' });
  }
});

// Helper function to get template descriptions
function getTemplateDescription(type) {
  const descriptions = {
    order_confirmation: 'Sent when an order is confirmed',
    payment_confirmation: 'Sent when payment is successful',
    delivery_update: 'Sent for delivery status updates',
    order_delivered: 'Sent when order is delivered',
    low_stock_alert: 'Sent to sellers when stock is low'
  };
  
  return descriptions[type] || 'Custom notification template';
}

module.exports = router; 
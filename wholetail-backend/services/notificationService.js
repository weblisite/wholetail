const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const cron = require('node-cron');
const WhatsAppService = require('./whatsappService');

// Configuration
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'mock_account_sid',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'mock_auth_token',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
};

const SENDGRID_CONFIG = {
  apiKey: process.env.SENDGRID_API_KEY || 'mock_sendgrid_key',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@wholetail.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'Wholetail'
};

// Initialize services
let twilioClient = null;
let sendGridInitialized = false;
let whatsappService = null;

// Mock notification storage for development
const mockNotifications = [
  {
    id: 'notif-1',
    type: 'order_confirmation',
    method: 'sms',
    recipient: '+254712345678',
    message: 'Your order #ORD-001 has been confirmed. Total: KSh 1,200',
    status: 'sent',
    sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    order_id: 'order-1',
    user_id: 'user-1'
  },
  {
    id: 'notif-2',
    type: 'payment_confirmation',
    method: 'email',
    recipient: 'customer@example.com',
    message: 'Payment confirmed for order #ORD-002',
    status: 'sent',
    sent_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    order_id: 'order-2',
    user_id: 'user-2'
  },
  {
    id: 'notif-3',
    type: 'delivery_update',
    method: 'whatsapp',
    recipient: '+254709876543',
    message: 'Your order is out for delivery. Track: wholetail.com/track/xyz',
    status: 'sent',
    sent_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    order_id: 'order-3',
    user_id: 'user-3'
  }
];

// Initialize notification services
function initializeServices() {
  try {
    // Initialize Twilio (for SMS only)
    if (TWILIO_CONFIG.accountSid !== 'mock_account_sid' && 
        TWILIO_CONFIG.accountSid !== 'placeholder') {
      twilioClient = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
      console.log('✅ Twilio SMS initialized');
    } else {
      console.log('⚠️  Twilio not configured, using mock service');
    }

    // Initialize SendGrid
    if (SENDGRID_CONFIG.apiKey !== 'mock_sendgrid_key' && 
        SENDGRID_CONFIG.apiKey !== 'placeholder') {
      sgMail.setApiKey(SENDGRID_CONFIG.apiKey);
      sendGridInitialized = true;
      console.log('✅ SendGrid initialized');
    } else {
      console.log('⚠️  SendGrid not configured, using mock service');
    }

    // Initialize WhatsApp Business API
    whatsappService = new WhatsAppService();
    console.log('✅ WhatsApp Business API initialized');

  } catch (error) {
    console.error('❌ Error initializing notification services:', error);
  }
}

// Notification templates with multiple channel support
const templates = {
  order_confirmation: {
    sms: (data) => `✅ Order Confirmed!\nHi ${data.customer_name}, your order #${data.order_id} for KSh ${data.total_amount} is confirmed. Expected delivery: ${data.delivery_date}. Track: ${data.tracking_url}`,
    
    email: {
      subject: (data) => `Order Confirmed - #${data.order_id} | Wholetail`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Order Confirmed!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hi ${data.customer_name},</h2>
            <p>Great news! Your order has been confirmed and is being prepared.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> #${data.order_id}</p>
              <p><strong>Total Amount:</strong> KSh ${data.total_amount}</p>
              <p><strong>Expected Delivery:</strong> ${data.delivery_date}</p>
              <p><strong>Delivery Address:</strong> ${data.delivery_address}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.tracking_url}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Your Order</a>
            </div>
            
            <p>Thank you for choosing Wholetail!</p>
          </div>
          <div style="background: #343a40; padding: 20px; text-align: center; color: white;">
            <p>Wholetail - Your B2B Trade Solution</p>
          </div>
        </div>
      `
    },
    
    whatsapp: {
      template: 'order_confirmation',
      parameters: (data) => [
        data.customer_name,
        data.order_id,
        data.items_summary,
        data.total_amount,
        data.delivery_date,
        data.tracking_url
      ]
    }
  },
  
  payment_confirmation: {
    sms: (data) => `💳 Payment Confirmed!\nKSh ${data.amount} received for order #${data.order_id}. Receipt: ${data.receipt_number}. Your order will be processed shortly.`,
    
    email: {
      subject: (data) => `Payment Received - #${data.order_id} | Wholetail`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">💳 Payment Confirmed!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hi ${data.customer_name},</h2>
            <p>We've successfully received your payment!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3>Payment Details</h3>
            <p><strong>Order ID:</strong> #${data.order_id}</p>
              <p><strong>Amount Paid:</strong> KSh ${data.amount}</p>
              <p><strong>Payment Method:</strong> ${data.payment_method}</p>
            <p><strong>Receipt Number:</strong> ${data.receipt_number}</p>
            <p><strong>Date:</strong> ${data.payment_date}</p>
            </div>
            
            <p>Your order is now being prepared and will be dispatched soon.</p>
          </div>
        </div>
      `
    },
    
    whatsapp: {
      template: 'payment_confirmation',
      parameters: (data) => [
        data.customer_name,
        data.order_id,
        data.amount,
        data.receipt_number
      ]
    }
  },
  
  delivery_update: {
    sms: (data) => `🚚 Delivery Update!\nYour order #${data.order_id} is ${data.status}. Current location: ${data.current_location}. ETA: ${data.eta}. Driver: ${data.driver_name} (${data.driver_phone})`,
    
    email: {
      subject: (data) => `Delivery Update - #${data.order_id} | Wholetail`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🚚 Delivery Update!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hi ${data.customer_name},</h2>
            <p>Here's the latest update on your delivery:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff6b35;">
              <h3>Delivery Status: ${data.status}</h3>
            <p><strong>Order ID:</strong> #${data.order_id}</p>
              <p><strong>Current Location:</strong> ${data.current_location}</p>
              <p><strong>Estimated Arrival:</strong> ${data.eta}</p>
            <p><strong>Driver:</strong> ${data.driver_name}</p>
            <p><strong>Driver Phone:</strong> ${data.driver_phone}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.tracking_url}" style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Live Location</a>
            </div>
          </div>
        </div>
      `
    },
    
    whatsapp: {
      template: 'delivery_update',
      parameters: (data) => [
        data.customer_name,
        data.order_id,
        data.status,
        data.current_location,
        data.eta,
        data.driver_name,
        data.driver_phone,
        data.tracking_url
      ]
    }
  },

  loan_approval: {
    sms: (data) => `🎉 Loan Approved!\nCongratulations! Your loan of KSh ${data.amount} has been approved. Interest: ${data.interest_rate}%. Repayment starts: ${data.repayment_start_date}`,
    
    email: {
      subject: (data) => `Loan Approved - KSh ${data.amount} | Wholetail`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6f42c1 0%, #007bff 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Loan Approved!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Congratulations ${data.customer_name}!</h2>
            <p>Your loan application has been approved!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6f42c1;">
              <h3>Loan Details</h3>
              <p><strong>Loan Amount:</strong> KSh ${data.amount}</p>
              <p><strong>Interest Rate:</strong> ${data.interest_rate}%</p>
              <p><strong>Repayment Period:</strong> ${data.repayment_period} months</p>
              <p><strong>Monthly Payment:</strong> KSh ${data.monthly_payment}</p>
              <p><strong>First Payment Due:</strong> ${data.repayment_start_date}</p>
        </div>
          </div>
        </div>
      `
    }
  },

  marketing_campaign: {
    sms: (data) => `🎯 ${data.campaign_title}\n${data.message}\nSave up to ${data.discount}% on bulk orders! Expires: ${data.expiry_date}\nShop: ${data.shop_url}`,
    
    whatsapp: {
      template: 'marketing_campaign',
      parameters: (data) => [
        data.campaign_title,
        data.message,
        data.discount,
        data.expiry_date,
        data.shop_url
      ]
    }
  }
};

// Send SMS notification
async function sendSMS(phoneNumber, message, data = {}) {
  try {
    if (!twilioClient) {
      // Mock SMS for development
      console.log('📱 Mock SMS sent to:', phoneNumber);
      console.log('📝 Message:', message);
      
      const notification = {
        id: `sms-${Date.now()}`,
        type: data.type || 'general',
        method: 'sms',
        recipient: phoneNumber,
        message: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        ...data
      };
      
      mockNotifications.push(notification);
      return { success: true, id: notification.id, mock: true };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_CONFIG.phoneNumber,
      to: phoneNumber
    });

    console.log('📱 SMS sent successfully:', result.sid);
    return { success: true, id: result.sid };
    
  } catch (error) {
    console.error('❌ SMS send error:', error);
    return { success: false, error: error.message };
  }
}

// Send email notification
async function sendEmail(emailData) {
  try {
    if (!sendGridInitialized) {
      // Mock email for development
      console.log('📧 Mock Email sent to:', emailData.to);
      console.log('📝 Subject:', emailData.subject);
      
      const notification = {
        id: `email-${Date.now()}`,
        type: emailData.type || 'general',
        method: 'email',
        recipient: emailData.to,
        subject: emailData.subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        ...emailData.data
      };
      
      mockNotifications.push(notification);
      return { success: true, id: notification.id, mock: true };
    }

    const msg = {
      to: emailData.to,
      from: {
        email: SENDGRID_CONFIG.fromEmail,
        name: SENDGRID_CONFIG.fromName
      },
      subject: emailData.subject,
      html: emailData.html
    };

    await sgMail.send(msg);
    console.log('📧 Email sent successfully to:', emailData.to);
    return { success: true, id: `email-${Date.now()}` };
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send WhatsApp notification using Business API
async function sendWhatsApp(phoneNumber, message, data = {}) {
  try {
    if (!whatsappService) {
      console.error('WhatsApp service not initialized');
      return { success: false, error: 'WhatsApp service not available' };
    }

    // Check if this is a template message
    if (data.template && data.parameters) {
      const result = await whatsappService.sendTemplateMessage(
        phoneNumber,
        data.template,
        data.parameters,
        data
      );
      
      console.log('📱 WhatsApp template sent successfully:', result.message_id);
      return { 
        success: true, 
        id: result.message_id,
        phone_number: result.phone_number,
        template: data.template
      };
    } else {
      // Send as regular text message
      const result = await whatsappService.sendTextMessage(phoneNumber, message, data);
      
      console.log('📱 WhatsApp message sent successfully:', result.message_id);
      return { 
        success: true, 
        id: result.message_id,
        phone_number: result.phone_number
      };
    }
    
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

// Send notification using template
async function sendNotification(type, method, recipient, data) {
  try {
    const template = templates[type];
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    let result;
    
    switch (method) {
      case 'sms':
        if (!template.sms) {
          throw new Error(`SMS template not found for type: ${type}`);
        }
        const smsMessage = template.sms(data);
        result = await sendSMS(recipient, smsMessage, { type, ...data });
        break;
        
      case 'email':
        if (!template.email) {
          throw new Error(`Email template not found for type: ${type}`);
        }
        const emailData = {
          to: recipient,
          subject: template.email.subject(data),
          html: template.email.html(data),
          type,
          data
        };
        result = await sendEmail(emailData);
        break;
        
      case 'whatsapp':
        if (!template.whatsapp) {
          throw new Error(`WhatsApp template not found for type: ${type}`);
        }
        
        const whatsappTemplate = template.whatsapp;
        if (whatsappTemplate.template) {
          // Use template message
          const parameters = whatsappTemplate.parameters ? whatsappTemplate.parameters(data) : [];
          result = await sendWhatsApp(recipient, '', { 
            type, 
            template: whatsappTemplate.template,
            parameters,
            image: whatsappTemplate.media ? data.image_url : null,
            ...data 
          });
        } else {
          // Use text message (fallback)
          const whatsappMessage = whatsappTemplate(data);
        result = await sendWhatsApp(recipient, whatsappMessage, { type, ...data });
        }
        break;
        
      default:
        throw new Error(`Unsupported notification method: ${method}`);
    }

    return result;
    
  } catch (error) {
    console.error('❌ Notification send error:', error);
    return { success: false, error: error.message };
  }
}

// Send multi-channel notification
async function sendMultiChannelNotification(type, recipients, data) {
  try {
    console.log(`📢 Sending multi-channel notification: ${type} to ${recipients.length} recipients`);
    
    const results = {
      sms: { sent: 0, failed: 0 },
      email: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
      total_sent: 0,
      total_failed: 0,
      details: []
    };
    
    for (const recipient of recipients) {
      const { phone, email, whatsapp, preferences } = recipient;
      const recipientResults = [];

      // Send SMS if phone provided and not opted out
      if (phone && (!preferences || preferences.sms !== false)) {
        try {
          const smsResult = await sendNotification(type, 'sms', phone, data);
          if (smsResult.success) {
            results.sms.sent++;
            results.total_sent++;
          } else {
            results.sms.failed++;
            results.total_failed++;
          }
          recipientResults.push({ method: 'sms', ...smsResult });
        } catch (error) {
          results.sms.failed++;
          results.total_failed++;
          recipientResults.push({ method: 'sms', success: false, error: error.message });
        }
      }

      // Send Email if email provided and not opted out
      if (email && (!preferences || preferences.email !== false)) {
        try {
          const emailResult = await sendNotification(type, 'email', email, data);
          if (emailResult.success) {
            results.email.sent++;
            results.total_sent++;
          } else {
            results.email.failed++;
            results.total_failed++;
          }
          recipientResults.push({ method: 'email', ...emailResult });
        } catch (error) {
          results.email.failed++;
          results.total_failed++;
          recipientResults.push({ method: 'email', success: false, error: error.message });
        }
      }

      // Send WhatsApp if whatsapp provided and not opted out
      if (whatsapp && (!preferences || preferences.whatsapp !== false)) {
        try {
          const whatsappResult = await sendNotification(type, 'whatsapp', whatsapp, data);
          if (whatsappResult.success) {
            results.whatsapp.sent++;
            results.total_sent++;
          } else {
            results.whatsapp.failed++;
            results.total_failed++;
          }
          recipientResults.push({ method: 'whatsapp', ...whatsappResult });
        } catch (error) {
          results.whatsapp.failed++;
          results.total_failed++;
          recipientResults.push({ method: 'whatsapp', success: false, error: error.message });
        }
      }

      results.details.push({
        recipient: recipient.id || phone || email,
        results: recipientResults
      });

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('📊 Multi-channel notification complete:', {
      type,
      total_sent: results.total_sent,
      total_failed: results.total_failed,
      breakdown: {
        sms: results.sms,
        email: results.email,
        whatsapp: results.whatsapp
      }
    });

    return results;
    
  } catch (error) {
    console.error('❌ Multi-channel notification error:', error);
    throw error;
  }
}

// Get notification history
function getNotificationHistory(filters = {}) {
  let filtered = [...mockNotifications];
  
  if (filters.type) {
    filtered = filtered.filter(n => n.type === filters.type);
  }
  
  if (filters.method) {
    filtered = filtered.filter(n => n.method === filters.method);
  }
  
  if (filters.status) {
    filtered = filtered.filter(n => n.status === filters.status);
  }
  
  if (filters.recipient) {
    filtered = filtered.filter(n => n.recipient.includes(filters.recipient));
  }
  
  return filtered.sort((a, b) => new Date(b.sent_at || b.created_at) - new Date(a.sent_at || a.created_at));
}

// Get notification analytics
function getNotificationAnalytics(period = '7d') {
  const days = parseInt(period.replace('d', ''));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const recentNotifications = mockNotifications.filter(n => 
    new Date(n.sent_at || n.created_at) >= cutoff
  );
  
  const analytics = {
    period: period,
    total_notifications: recentNotifications.length,
    by_method: {
      sms: recentNotifications.filter(n => n.method === 'sms').length,
      email: recentNotifications.filter(n => n.method === 'email').length,
      whatsapp: recentNotifications.filter(n => n.method === 'whatsapp').length
    },
    by_status: {
      sent: recentNotifications.filter(n => n.status === 'sent').length,
      pending: recentNotifications.filter(n => n.status === 'pending').length,
      failed: recentNotifications.filter(n => n.status === 'failed').length
    },
    by_type: {}
  };
  
  // Group by notification type
  const types = [...new Set(recentNotifications.map(n => n.type))];
  types.forEach(type => {
    analytics.by_type[type] = recentNotifications.filter(n => n.type === type).length;
  });
  
  return analytics;
}

// Health check for all notification services
async function healthCheck() {
  const health = {
    sms: { status: 'unknown', provider: 'twilio' },
    email: { status: 'unknown', provider: 'sendgrid' },
    whatsapp: { status: 'unknown', provider: 'meta_business_api' }
  };

  // Check SMS (Twilio)
  if (twilioClient) {
    try {
      // Test with a simple API call
      health.sms.status = 'healthy';
    } catch (error) {
      health.sms.status = 'unhealthy';
      health.sms.error = error.message;
    }
  } else {
    health.sms.status = 'mock';
  }

  // Check Email (SendGrid)
  if (sendGridInitialized) {
    health.email.status = 'healthy';
  } else {
    health.email.status = 'mock';
  }

  // Check WhatsApp
  if (whatsappService) {
    const whatsappHealth = await whatsappService.healthCheck();
    health.whatsapp.status = whatsappHealth.status;
    if (whatsappHealth.error) {
      health.whatsapp.error = whatsappHealth.error;
    }
  }

  return health;
}

// Initialize services on startup
initializeServices();

// Schedule daily analytics report (optional)
cron.schedule('0 9 * * *', () => {
  console.log('📊 Daily notification analytics:', getNotificationAnalytics('1d'));
});

module.exports = {
  sendSMS,
  sendEmail,
  sendWhatsApp,
  sendNotification,
  sendMultiChannelNotification,
  getNotificationHistory,
  getNotificationAnalytics,
  healthCheck,
  templates,
  whatsappService
}; 
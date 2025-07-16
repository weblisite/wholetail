const notificationService = require('../services/notificationService');

// Helper function to send order confirmation notifications
async function sendOrderConfirmationNotifications(order, customer) {
  try {
    const recipients = [];
    
    // Add customer's preferred notification methods
    if (customer.phone) {
      recipients.push({ method: 'sms', contact: customer.phone });
    }
    
    if (customer.email) {
      recipients.push({ method: 'email', contact: customer.email });
    }
    
    // Add WhatsApp if customer has opted in
    if (customer.whatsapp_enabled && customer.phone) {
      recipients.push({ method: 'whatsapp', contact: customer.phone });
    }
    
    const orderData = {
      customer_name: customer.name,
      order_id: order.id,
      amount: order.total_amount,
      estimated_delivery: order.estimated_delivery || 'Within 2-3 business days',
      tracking_url: `https://wholetail.com/track/${order.id}`
    };
    
    const result = await notificationService.sendMultiChannelNotification(
      'order_confirmation',
      recipients,
      orderData
    );
    
    console.log(`Order confirmation notifications sent for order ${order.id}:`, result.summary);
    return result;
    
  } catch (error) {
    console.error('Error sending order confirmation notifications:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send payment confirmation notifications
async function sendPaymentConfirmationNotifications(payment, order, customer) {
  try {
    const recipients = [];
    
    if (customer.phone) {
      recipients.push({ method: 'sms', contact: customer.phone });
    }
    
    if (customer.email) {
      recipients.push({ method: 'email', contact: customer.email });
    }
    
    const paymentData = {
      customer_name: customer.name,
      order_id: order.id,
      amount: payment.amount,
      receipt_number: payment.mpesa_receipt || payment.receipt_number,
      payment_method: payment.method || 'M-Pesa',
      payment_date: new Date(payment.created_at).toLocaleDateString()
    };
    
    const result = await notificationService.sendMultiChannelNotification(
      'payment_confirmation',
      recipients,
      paymentData
    );
    
    console.log(`Payment confirmation notifications sent for payment ${payment.id}:`, result.summary);
    return result;
    
  } catch (error) {
    console.error('Error sending payment confirmation notifications:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send delivery update notifications
async function sendDeliveryUpdateNotifications(delivery, order, customer) {
  try {
    const recipients = [];
    
    if (customer.phone) {
      recipients.push({ method: 'sms', contact: customer.phone });
      
      if (customer.whatsapp_enabled) {
        recipients.push({ method: 'whatsapp', contact: customer.phone });
      }
    }
    
    if (customer.email) {
      recipients.push({ method: 'email', contact: customer.email });
    }
    
    const deliveryData = {
      customer_name: customer.name,
      order_id: order.id,
      status: delivery.status,
      eta: delivery.estimated_arrival || 'Within 2 hours',
      driver_name: delivery.driver?.name || 'Driver',
      driver_phone: delivery.driver?.phone || '+254700000000',
      vehicle_info: delivery.vehicle?.info || 'Delivery Vehicle',
      tracking_url: `https://wholetail.com/track/${order.id}`
    };
    
    const result = await notificationService.sendMultiChannelNotification(
      'delivery_update',
      recipients,
      deliveryData
    );
    
    console.log(`Delivery update notifications sent for order ${order.id}:`, result.summary);
    return result;
    
  } catch (error) {
    console.error('Error sending delivery update notifications:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send order delivered notifications
async function sendOrderDeliveredNotifications(order, customer, delivery) {
  try {
    const recipients = [];
    
    if (customer.phone) {
      recipients.push({ method: 'sms', contact: customer.phone });
    }
    
    if (customer.email) {
      recipients.push({ method: 'email', contact: customer.email });
    }
    
    if (customer.whatsapp_enabled && customer.phone) {
      recipients.push({ method: 'whatsapp', contact: customer.phone });
    }
    
    const deliveryData = {
      customer_name: customer.name,
      order_id: order.id,
      delivered_at: new Date(delivery.delivered_at).toLocaleString(),
      delivery_address: delivery.address || order.delivery_address,
      received_by: delivery.received_by || customer.name,
      rating_url: `https://wholetail.com/rate/${order.id}`
    };
    
    const result = await notificationService.sendMultiChannelNotification(
      'order_delivered',
      recipients,
      deliveryData
    );
    
    console.log(`Order delivered notifications sent for order ${order.id}:`, result.summary);
    return result;
    
  } catch (error) {
    console.error('Error sending order delivered notifications:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send low stock alerts to sellers
async function sendLowStockAlerts(product, seller) {
  try {
    const recipients = [];
    
    if (seller.phone) {
      recipients.push({ method: 'sms', contact: seller.phone });
    }
    
    if (seller.email) {
      recipients.push({ method: 'email', contact: seller.email });
    }
    
    const stockData = {
      seller_name: seller.name,
      product_name: product.name,
      current_stock: product.stock_quantity,
      minimum_stock: product.minimum_stock || 10,
      recommended_order: product.recommended_order || 50,
      restock_url: `https://wholetail.com/restock/${product.id}`
    };
    
    const result = await notificationService.sendMultiChannelNotification(
      'low_stock_alert',
      recipients,
      stockData
    );
    
    console.log(`Low stock alert sent for product ${product.id}:`, result.summary);
    return result;
    
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to schedule order reminder notifications
async function scheduleOrderReminder(order, customer, reminderTime) {
  try {
    const recipients = [];
    
    if (customer.phone) {
      recipients.push({ method: 'sms', contact: customer.phone });
    }
    
    const orderData = {
      customer_name: customer.name,
      order_id: order.id,
      amount: order.total_amount,
      tracking_url: `https://wholetail.com/track/${order.id}`
    };
    
    const result = await notificationService.scheduleNotification(
      'order_confirmation',
      'sms',
      customer.phone,
      orderData,
      reminderTime
    );
    
    console.log(`Order reminder scheduled for order ${order.id}:`, result.id);
    return result;
    
  } catch (error) {
    console.error('Error scheduling order reminder:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send bulk notifications to multiple users
async function sendBulkNotifications(users, notificationType, data) {
  try {
    const results = [];
    
    for (const user of users) {
      const recipients = [];
      
      if (user.phone) {
        recipients.push({ method: 'sms', contact: user.phone });
      }
      
      if (user.email) {
        recipients.push({ method: 'email', contact: user.email });
      }
      
      if (recipients.length > 0) {
        const result = await notificationService.sendMultiChannelNotification(
          notificationType,
          recipients,
          { ...data, customer_name: user.name }
        );
        
        results.push({
          user_id: user.id,
          user_name: user.name,
          result
        });
      }
    }
    
    console.log(`Bulk notifications sent to ${users.length} users:`, results.length);
    return {
      success: true,
      total_users: users.length,
      notifications_sent: results.length,
      results
    };
    
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send notification based on order status change
async function sendOrderStatusNotification(order, customer, oldStatus, newStatus) {
  try {
    let notificationType = 'order_confirmation';
    let notificationData = {};
    
    switch (newStatus) {
      case 'confirmed':
        notificationType = 'order_confirmation';
        notificationData = {
          customer_name: customer.name,
          order_id: order.id,
          amount: order.total_amount,
          estimated_delivery: order.estimated_delivery || 'Within 2-3 business days',
          tracking_url: `https://wholetail.com/track/${order.id}`
        };
        break;
        
      case 'shipped':
      case 'out_for_delivery':
        notificationType = 'delivery_update';
        notificationData = {
          customer_name: customer.name,
          order_id: order.id,
          status: newStatus === 'shipped' ? 'Shipped' : 'Out for delivery',
          eta: order.estimated_delivery || 'Within 2 hours',
          driver_name: order.driver?.name || 'Driver',
          driver_phone: order.driver?.phone || '+254700000000',
          vehicle_info: order.vehicle?.info || 'Delivery Vehicle',
          tracking_url: `https://wholetail.com/track/${order.id}`
        };
        break;
        
      case 'delivered':
        notificationType = 'order_delivered';
        notificationData = {
          customer_name: customer.name,
          order_id: order.id,
          delivered_at: new Date().toLocaleString(),
          delivery_address: order.delivery_address,
          received_by: customer.name,
          rating_url: `https://wholetail.com/rate/${order.id}`
        };
        break;
        
      default:
        console.log(`No notification template for status: ${newStatus}`);
        return { success: false, error: 'No notification template for this status' };
    }
    
    const recipients = [];
    
    if (customer.phone) {
      recipients.push({ method: 'sms', contact: customer.phone });
    }
    
    if (customer.email) {
      recipients.push({ method: 'email', contact: customer.email });
    }
    
    if (customer.whatsapp_enabled && customer.phone) {
      recipients.push({ method: 'whatsapp', contact: customer.phone });
    }
    
    const result = await notificationService.sendMultiChannelNotification(
      notificationType,
      recipients,
      notificationData
    );
    
    console.log(`Order status notification sent for order ${order.id} (${oldStatus} → ${newStatus}):`, result.summary);
    return result;
    
  } catch (error) {
    console.error('Error sending order status notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOrderConfirmationNotifications,
  sendPaymentConfirmationNotifications,
  sendDeliveryUpdateNotifications,
  sendOrderDeliveredNotifications,
  sendLowStockAlerts,
  scheduleOrderReminder,
  sendBulkNotifications,
  sendOrderStatusNotification
}; 
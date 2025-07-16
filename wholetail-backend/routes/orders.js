const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Mock data for development
const mockOrders = [
  {
    id: 'order-1',
    buyer_id: 'retailer-123',
    seller_id: 'farmer-1',
    base_amount: 600,
    loan_collection_amount: 0,
    total_amount: 600,
    status: 'pending',
    delivery_address: '123 Main Street, Nairobi',
    notes: 'Please deliver in the morning',
    loan_collection_details: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    order_items: [
      {
        id: 'item-1',
        order_id: 'order-1',
        product_id: '1',
        quantity: 5,
        unit_price: 120,
        products: {
          name: 'Fresh Tomatoes',
          image_url: null,
          price_per_unit: 120,
          unit_type: 'kg'
        }
      }
    ],
    users: {
      name: 'Peter Kamau',
      phone: '+254701234567'
    }
  },
  {
    id: 'order-2',
    buyer_id: 'retailer-123',
    seller_id: 'farmer-2',
    base_amount: 7200,
    loan_collection_amount: 1800,
    total_amount: 9000,
    status: 'confirmed',
    delivery_address: '123 Main Street, Nairobi',
    notes: '',
    loan_collection_details: {
      active_loans_count: 1,
      total_outstanding: 38000,
      collection_amount: 1800,
      active_loans: [
        {
          id: 'loan-1',
          amount: 50000,
          amount_remaining: 38000,
          monthly_payment: 9000
        }
      ]
    },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    order_items: [
      {
        id: 'item-2',
        order_id: 'order-2',
        product_id: '2',
        quantity: 90,
        unit_price: 80,
        products: {
          name: 'White Maize',
          image_url: null,
          price_per_unit: 80,
          unit_type: 'kg'
        }
      }
    ],
    users: {
      name: 'Sarah Wanjiku',
      phone: '+254709876543'
    }
  }
];

// Get orders for a specific user (retailer)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock orders data for development');
      
      let filteredOrders = mockOrders.filter(order => order.buyer_id === userId);
      
      if (status) {
        filteredOrders = filteredOrders.filter(order => order.status === status);
      }
      
      return res.json({ orders: filteredOrders });
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            image_url,
            price_per_unit
          )
        ),
        users:seller_id (
          name,
          phone
        )
      `)
      .eq('buyer_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error } = await query
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ orders: data });
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single order details
router.get('/:id', async (req, res) => {
  try {
    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock order data for development');
      const order = mockOrders.find(o => o.id === req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.json({ order });
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            image_url,
            price_per_unit,
            unit_type
          )
        ),
        users:seller_id (
          name,
          phone,
          location
        ),
        buyers:buyer_id (
          name,
          phone,
          location
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: data });
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const { buyer_id, seller_id, order_items, delivery_address, notes } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Creating mock order for development');
      
      // Calculate base order amount
      let base_amount = 0;
      for (const item of order_items) {
        base_amount += item.quantity * item.unit_price;
      }

      // Check for active loans and calculate loan collection
      let loan_collection_amount = 0;
      let loan_collection_details = null;
      
      try {
        // Make request to financing service to check eligibility
        const axios = require('axios');
        const eligibilityResponse = await axios.get(
          `http://localhost:3001/api/financing/eligibility/${buyer_id}`
        );
        
        if (eligibilityResponse.data.has_active_loans) {
          loan_collection_amount = eligibilityResponse.data.suggested_collection_amount;
          loan_collection_details = {
            active_loans_count: eligibilityResponse.data.active_loans_count,
            total_outstanding: eligibilityResponse.data.total_outstanding,
            collection_amount: loan_collection_amount,
            active_loans: eligibilityResponse.data.active_loans
          };
        }
      } catch (error) {
        console.error('Error checking loan eligibility:', error);
        // Continue without loan collection if service fails
      }

      const total_amount = base_amount + loan_collection_amount;

      const newOrder = {
        id: `order-${Date.now()}`,
        buyer_id,
        seller_id,
        base_amount,
        loan_collection_amount,
        total_amount,
        delivery_address,
        notes: notes || '',
        status: 'pending',
        loan_collection_details,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add to mock orders (in real app this would persist)
      mockOrders.unshift(newOrder);

      // If there's a loan collection, process it
      if (loan_collection_amount > 0) {
        try {
          await axios.post('http://localhost:3001/api/financing/loans/collect-from-order', {
            retailer_id: buyer_id,
            order_id: newOrder.id,
            collection_amount: loan_collection_amount
          });
        } catch (error) {
          console.error('Error processing loan collection:', error);
        }
      }

      return res.status(201).json({ 
        message: 'Order created successfully', 
        order: newOrder 
      });
    }

    // Calculate base order amount
    let base_amount = 0;
    for (const item of order_items) {
      base_amount += item.quantity * item.unit_price;
    }

    // Check for active loans and calculate loan collection
    let loan_collection_amount = 0;
    let loan_collection_details = null;
    
    try {
      // Check loan eligibility (this would be replaced with actual API call in production)
      const axios = require('axios');
      const eligibilityResponse = await axios.get(
        `http://localhost:3001/api/financing/eligibility/${buyer_id}`
      );
      
      if (eligibilityResponse.data.has_active_loans) {
        loan_collection_amount = eligibilityResponse.data.suggested_collection_amount;
        loan_collection_details = {
          active_loans_count: eligibilityResponse.data.active_loans_count,
          total_outstanding: eligibilityResponse.data.total_outstanding,
          collection_amount: loan_collection_amount,
          active_loans: eligibilityResponse.data.active_loans
        };
      }
    } catch (error) {
      console.error('Error checking loan eligibility:', error);
      // Continue without loan collection if service fails
    }

    const total_amount = base_amount + loan_collection_amount;

    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id,
        seller_id,
        base_amount,
        loan_collection_amount,
        total_amount,
        delivery_address,
        notes,
        status: 'pending',
        loan_collection_details,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    // Create order items
    const orderItemsWithOrderId = order_items.map(item => ({
      ...item,
      order_id: orderData.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      // Rollback order if items creation fails
      await supabase.from('orders').delete().eq('id', orderData.id);
      return res.status(400).json({ error: itemsError.message });
    }

    // If there's a loan collection, process it
    if (loan_collection_amount > 0) {
      try {
        const axios = require('axios');
        await axios.post('http://localhost:3001/api/financing/loans/collect-from-order', {
          retailer_id: buyer_id,
          order_id: orderData.id,
          collection_amount: loan_collection_amount
        });
      } catch (error) {
        console.error('Error processing loan collection:', error);
      }
    }

    res.status(201).json({ message: 'Order created successfully', order: orderData });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Updating mock order status for development');
      
      const orderIndex = mockOrders.findIndex(o => o.id === id);
      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      mockOrders[orderIndex].status = status;
      mockOrders[orderIndex].updated_at = new Date().toISOString();
      
      return res.json({ 
        message: 'Order status updated successfully', 
        order: mockOrders[orderIndex] 
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Order status updated successfully', order: data });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders (admin/overview)
router.get('/', async (req, res) => {
  try {
    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock orders overview data for development');
      return res.json({ orders: mockOrders });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ orders: data });
  } catch (error) {
    console.error('Orders overview fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders for a specific seller (wholesaler)
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock seller orders data for development');
      
      let filteredOrders = mockOrders.filter(order => order.seller_id === sellerId);
      
      if (status) {
        filteredOrders = filteredOrders.filter(order => order.status === status);
      }
      
      return res.json({ orders: filteredOrders });
    }

    // Real Supabase implementation
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            image_url,
            price_per_unit
          )
        ),
        users:buyer_id (
          name,
          phone
        )
      `)
      .eq('seller_id', sellerId);

    if (status) {
      query = query.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error } = await query
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ orders: data });
  } catch (error) {
    console.error('Seller orders fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seller analytics/metrics
router.get('/seller/:sellerId/analytics', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { period = 'monthly' } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock seller analytics data for development');
      
      const sellerOrders = mockOrders.filter(order => order.seller_id === sellerId);
      
      const analytics = {
        total_orders: sellerOrders.length,
        total_revenue: sellerOrders.reduce((sum, order) => sum + order.total_amount, 0),
        completed_orders: sellerOrders.filter(order => order.status === 'completed').length,
        pending_orders: sellerOrders.filter(order => order.status === 'processing').length,
        average_order_value: sellerOrders.length > 0 ? 
          sellerOrders.reduce((sum, order) => sum + order.total_amount, 0) / sellerOrders.length : 0,
        growth_rate: 28.5, // Mock growth rate
        top_products: [
          { name: 'Rice - 50kg', orders: 45, revenue: 225000 },
          { name: 'Maize - 90kg', orders: 38, revenue: 216600 },
          { name: 'Beans - 25kg', orders: 32, revenue: 168000 }
        ],
        monthly_trend: [
          { month: 'Jan', revenue: 180000, orders: 35 },
          { month: 'Feb', revenue: 210000, orders: 42 },
          { month: 'Mar', revenue: 245000, orders: 48 },
          { month: 'Apr', revenue: 280000, orders: 55 },
          { month: 'May', revenue: 315000, orders: 62 },
          { month: 'Jun', revenue: 350000, orders: 68 }
        ]
      };
      
      return res.json({ analytics, period });
    }

    // Real Supabase implementation would go here
    res.json({ analytics: {}, period });
  } catch (error) {
    console.error('Seller analytics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (for sellers)
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, seller_id } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Updating mock order status for development');
      
      const orderIndex = mockOrders.findIndex(order => 
        order.id === orderId && (!seller_id || order.seller_id === seller_id)
      );
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      mockOrders[orderIndex].status = status;
      mockOrders[orderIndex].updated_at = new Date().toISOString();
      
      return res.json({ 
        success: true,
        order: mockOrders[orderIndex],
        message: 'Order status updated successfully' 
      });
    }

    // Real Supabase implementation
    let query = supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (seller_id) {
      query = query.eq('seller_id', seller_id);
    }

    const { data, error } = await query
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ 
      success: true,
      order: data,
      message: 'Order status updated successfully' 
    });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
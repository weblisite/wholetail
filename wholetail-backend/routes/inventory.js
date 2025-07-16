const express = require('express');
const router = express.Router();

// Mock inventory data for development
const mockInventoryAnalytics = {
  'retailer-123': {
    total_items_tracked: 1247,
    low_stock_alerts: 23,
    fast_moving_items: 89,
    slow_moving_items: 34,
    inventory_value: 2850000,
    turnover_rate: 8.4,
    stockout_risk_items: 12,
    reorder_suggestions: 45,
    optimal_stock_level: 92.7,
    cost_optimization_savings: 340000,
    demand_prediction_accuracy: 94.3,
    seasonal_adjustment_factor: 1.23,
    categories: [
      {
        category: 'Groceries',
        items_count: 456,
        value: 1200000,
        turnover_rate: 9.2,
        fast_moving: 34,
        slow_moving: 12
      },
      {
        category: 'Beverages',
        items_count: 234,
        value: 680000,
        turnover_rate: 7.8,
        fast_moving: 28,
        slow_moving: 8
      },
      {
        category: 'Household',
        items_count: 345,
        value: 590000,
        turnover_rate: 6.5,
        fast_moving: 18,
        slow_moving: 10
      },
      {
        category: 'Personal Care',
        items_count: 212,
        value: 380000,
        turnover_rate: 8.9,
        fast_moving: 9,
        slow_moving: 4
      }
    ],
    reorder_items: [
      {
        product_id: 'prod-001',
        name: 'Basmati Rice 5kg',
        current_stock: 12,
        recommended_stock: 45,
        urgency: 'high',
        estimated_stockout_date: '2024-01-25',
        supplier_options: [
          { supplier_id: 'sup-001', name: 'KenyaGrain Ltd', price: 850, delivery_days: 2 },
          { supplier_id: 'sup-002', name: 'Fresh Imports', price: 820, delivery_days: 3 }
        ]
      },
      {
        product_id: 'prod-002',
        name: 'Cooking Oil 2L',
        current_stock: 8,
        recommended_stock: 30,
        urgency: 'medium',
        estimated_stockout_date: '2024-01-28',
        supplier_options: [
          { supplier_id: 'sup-003', name: 'Edible Oils Kenya', price: 420, delivery_days: 1 },
          { supplier_id: 'sup-004', name: 'Quality Foods', price: 435, delivery_days: 2 }
        ]
      }
    ],
    low_stock_items: [
      {
        product_id: 'prod-005',
        name: 'Sugar 1kg',
        current_stock: 15,
        minimum_stock: 20,
        category: 'Groceries'
      },
      {
        product_id: 'prod-006',
        name: 'Bread Loaf',
        current_stock: 5,
        minimum_stock: 12,
        category: 'Bakery'
      }
    ]
  }
};

// Mock business intelligence data
const mockBusinessIntelligence = {
  'retailer-123': {
    total_orders: 284,
    total_spent: 4850000,
    savings_achieved: 1250000,
    credit_score: 850,
    available_credit: 750000,
    monthly_growth: 42.3,
    ai_savings: 480000,
    efficiency_score: 94.7,
    customer_satisfaction: 96.2,
    inventory_turnover: 8.4,
    profit_margin: 24.8,
    market_share: 12.3,
    seasonal_trends: [
      { month: 'Jan', sales: 450000, profit: 112000, orders: 38 },
      { month: 'Feb', sales: 520000, profit: 129000, orders: 42 },
      { month: 'Mar', sales: 610000, profit: 151000, orders: 48 },
      { month: 'Apr', sales: 580000, profit: 144000, orders: 45 },
      { month: 'May', sales: 670000, profit: 166000, orders: 52 },
      { month: 'Jun', sales: 720000, profit: 179000, orders: 56 }
    ],
    category_performance: [
      { category: 'Groceries', revenue: 2100000, growth: 38.2, margin: 22.5, orders: 156 },
      { category: 'Beverages', revenue: 980000, growth: 45.7, margin: 28.3, orders: 89 },
      { category: 'Household', revenue: 750000, growth: 32.1, margin: 26.8, orders: 67 },
      { category: 'Personal Care', revenue: 580000, growth: 51.4, margin: 31.2, orders: 45 },
      { category: 'Snacks', revenue: 440000, growth: 42.6, margin: 29.7, orders: 34 }
    ],
    top_suppliers: [
      { supplier_id: 'sup-001', name: 'KenyaFresh Ltd', orders: 45, spent: 890000, rating: 4.8 },
      { supplier_id: 'sup-002', name: 'Quality Foods', orders: 38, spent: 720000, rating: 4.6 },
      { supplier_id: 'sup-003', name: 'Metro Wholesale', orders: 32, spent: 650000, rating: 4.7 }
    ],
    recommendations: [
      {
        id: 'rec-001',
        type: 'inventory',
        title: 'Stock Alert: Rice Running Low',
        description: 'Basmati Rice 5kg is below minimum stock level. Recommend ordering 50 units.',
        priority: 'high',
        potential_savings: 15000,
        action_required: true
      },
      {
        id: 'rec-002',
        type: 'pricing',
        title: 'Price Optimization Opportunity',
        description: 'Cooking oil prices can be increased by 8% based on market analysis.',
        priority: 'medium',
        potential_savings: 25000,
        action_required: false
      }
    ]
  }
};

// Get inventory analytics for a retailer
router.get('/analytics/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { category, timeframe = 'month' } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock inventory analytics data for development');
      
      const analytics = mockInventoryAnalytics[retailerId];
      if (!analytics) {
        return res.status(404).json({ error: 'Retailer not found' });
      }

      let response = { ...analytics };

      // Filter by category if specified
      if (category) {
        response.categories = analytics.categories.filter(cat => 
          cat.category.toLowerCase() === category.toLowerCase()
        );
      }

      return res.json({
        success: true,
        retailer_id: retailerId,
        timeframe,
        analytics: response
      });
    }

    // Real Supabase implementation would go here
    res.json({ analytics: {} });
  } catch (error) {
    console.error('Inventory analytics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reorder suggestions for a retailer
router.get('/reorder-suggestions/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { urgency, category } = req.query;

    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock reorder suggestions data for development');
      
      const analytics = mockInventoryAnalytics[retailerId];
      if (!analytics) {
        return res.status(404).json({ error: 'Retailer not found' });
      }

      let suggestions = analytics.reorder_items;

      // Filter by urgency if specified
      if (urgency) {
        suggestions = suggestions.filter(item => item.urgency === urgency);
      }

      return res.json({
        success: true,
        retailer_id: retailerId,
        suggestions: suggestions,
        total_suggestions: suggestions.length
      });
    }

    res.json({ suggestions: [] });
  } catch (error) {
    console.error('Reorder suggestions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock alerts for a retailer
router.get('/low-stock/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { category, limit = 50 } = req.query;

    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock low stock data for development');
      
      const analytics = mockInventoryAnalytics[retailerId];
      if (!analytics) {
        return res.status(404).json({ error: 'Retailer not found' });
      }

      let lowStockItems = analytics.low_stock_items;

      // Filter by category if specified
      if (category) {
        lowStockItems = lowStockItems.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
      }

      // Apply limit
      lowStockItems = lowStockItems.slice(0, parseInt(limit));

      return res.json({
        success: true,
        retailer_id: retailerId,
        low_stock_items: lowStockItems,
        total_alerts: analytics.low_stock_alerts
      });
    }

    res.json({ low_stock_items: [] });
  } catch (error) {
    console.error('Low stock fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get business intelligence data for a retailer
router.get('/business-intelligence/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { timeframe = 'month' } = req.query;

    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock business intelligence data for development');
      
      const businessData = mockBusinessIntelligence[retailerId];
      if (!businessData) {
        return res.status(404).json({ error: 'Retailer not found' });
      }

      return res.json({
        success: true,
        retailer_id: retailerId,
        timeframe,
        business_intelligence: businessData
      });
    }

    res.json({ business_intelligence: {} });
  } catch (error) {
    console.error('Business intelligence fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory levels (for manual adjustments)
router.put('/update-stock', async (req, res) => {
  try {
    const { retailer_id, product_id, new_stock_level, reason } = req.body;

    if (!retailer_id || !product_id || new_stock_level === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Mock inventory update for development');
      
      return res.json({
        success: true,
        message: 'Inventory updated successfully',
        updated_stock: {
          product_id,
          new_stock_level,
          updated_at: new Date().toISOString(),
          reason: reason || 'Manual adjustment'
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory trends and forecasting
router.get('/trends/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { product_id, days = 30 } = req.query;

    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock inventory trends data for development');
      
      const trends = {
        retailer_id: retailerId,
        period_days: parseInt(days),
        trends: [
          {
            product_id: 'prod-001',
            name: 'Basmati Rice 5kg',
            daily_sales: [5, 7, 6, 8, 9, 12, 15, 8, 6, 7],
            predicted_demand: [8, 9, 10, 8, 7, 9, 11, 10, 8, 9],
            forecast_accuracy: 89.5
          },
          {
            product_id: 'prod-002',
            name: 'Cooking Oil 2L',
            daily_sales: [3, 4, 5, 6, 4, 8, 9, 5, 4, 3],
            predicted_demand: [4, 5, 6, 5, 4, 7, 8, 5, 4, 4],
            forecast_accuracy: 92.1
          }
        ],
        overall_forecast_accuracy: 90.8
      };

      // Filter by product_id if specified
      if (product_id) {
        trends.trends = trends.trends.filter(trend => trend.product_id === product_id);
      }

      return res.json({
        success: true,
        trends
      });
    }

    res.json({ trends: {} });
  } catch (error) {
    console.error('Inventory trends fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
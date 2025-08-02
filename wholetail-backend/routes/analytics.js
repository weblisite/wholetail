const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Get comprehensive business intelligence for a retailer
router.get('/business-intelligence/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { timeframe = 'month' } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder') || true) {
      console.log('Using mock business intelligence data for development');
      
      const mockBusinessIntelligence = {
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
          { month: 'Jan', sales: 450000, profit: 112000 },
          { month: 'Feb', sales: 520000, profit: 129000 },
          { month: 'Mar', sales: 610000, profit: 151000 },
          { month: 'Apr', sales: 580000, profit: 144000 },
          { month: 'May', sales: 670000, profit: 166000 },
          { month: 'Jun', sales: 720000, profit: 179000 }
        ],
        category_performance: [
          { category: 'FMCG', revenue: 2150000, growth: 28.5, margin: 22.3 },
          { category: 'Vegetables', revenue: 1850000, growth: 35.2, margin: 31.8 },
          { category: 'Grains', revenue: 850000, growth: 18.7, margin: 19.5 }
        ]
      };

      return res.json({
        success: true,
        data: mockBusinessIntelligence,
        timeframe,
        last_updated: new Date().toISOString()
      });
    }

    // Real Supabase implementation
    const [ordersResult, paymentsResult, inventoryResult] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('retailer_id', retailerId),
      
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', retailerId),
      
      supabase
        .from('products')
        .select('*')
        .eq('supplier_id', retailerId)
    ]);

    if (ordersResult.error) throw ordersResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const orders = ordersResult.data || [];
    const payments = paymentsResult.data || [];

    // Calculate business intelligence metrics
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Calculate growth (compare with previous period)
    const currentMonth = new Date().getMonth();
    const currentMonthOrders = orders.filter(order => 
      new Date(order.created_at).getMonth() === currentMonth
    );
    const previousMonthOrders = orders.filter(order => 
      new Date(order.created_at).getMonth() === currentMonth - 1
    );

    const currentMonthTotal = currentMonthOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    const previousMonthTotal = previousMonthOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    const monthlyGrowth = previousMonthTotal > 0 ? 
      ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;

    const businessIntelligence = {
      total_orders: totalOrders,
      total_spent: totalSpent,
      average_order_value: avgOrderValue,
      monthly_growth: monthlyGrowth,
      current_month_sales: currentMonthTotal,
      previous_month_sales: previousMonthTotal,
      savings_achieved: totalSpent * 0.15, // Estimated 15% savings
      ai_savings: totalSpent * 0.08, // Estimated 8% AI savings
      efficiency_score: Math.min(95, 70 + (totalOrders / 10)), // Dynamic efficiency score
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: businessIntelligence,
      timeframe,
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching business intelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business intelligence',
      message: error.message
    });
  }
});

// Get KPI dashboard data
router.get('/kpi/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    // Mock KPI data for development
    const mockKPIs = {
      revenue: {
        current: 720000,
        previous: 650000,
        growth: 10.8,
        target: 800000
      },
      orders: {
        current: 89,
        previous: 76,
        growth: 17.1,
        target: 100
      },
      customers: {
        current: 234,
        previous: 198,
        growth: 18.2,
        target: 300
      },
      profit_margin: {
        current: 24.8,
        previous: 22.1,
        growth: 12.2,
        target: 25.0
      }
    };

    res.json({
      success: true,
      data: mockKPIs,
      period: 'current_month',
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KPIs',
      message: error.message
    });
  }
});

// Get savings analytics
router.get('/savings/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    const mockSavings = {
      total_savings: 1250000,
      ai_optimization_savings: 480000,
      bulk_purchase_savings: 320000,
      seasonal_timing_savings: 280000,
      supplier_negotiation_savings: 170000,
      monthly_breakdown: [
        { month: 'Jan', savings: 185000 },
        { month: 'Feb', savings: 198000 },
        { month: 'Mar', savings: 225000 },
        { month: 'Apr', savings: 210000 },
        { month: 'May', savings: 235000 },
        { month: 'Jun', savings: 197000 }
      ],
      savings_categories: [
        { category: 'AI Price Optimization', amount: 480000, percentage: 38.4 },
        { category: 'Bulk Purchase Discounts', amount: 320000, percentage: 25.6 },
        { category: 'Seasonal Timing', amount: 280000, percentage: 22.4 },
        { category: 'Supplier Negotiations', amount: 170000, percentage: 13.6 }
      ]
    };

    res.json({
      success: true,
      data: mockSavings,
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching savings analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch savings analytics',
      message: error.message
    });
  }
});

// Get seasonal trends
router.get('/seasonal-trends/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { category, period = '12months' } = req.query;

    const mockTrends = {
      overall_trends: [
        { month: 'Jan', sales: 450000, profit: 112000, orders: 67 },
        { month: 'Feb', sales: 520000, profit: 129000, orders: 78 },
        { month: 'Mar', sales: 610000, profit: 151000, orders: 89 },
        { month: 'Apr', sales: 580000, profit: 144000, orders: 82 },
        { month: 'May', sales: 670000, profit: 166000, orders: 95 },
        { month: 'Jun', sales: 720000, profit: 179000, orders: 102 }
      ],
      category_trends: {
        'FMCG': [
          { month: 'Jan', sales: 180000, growth: 15.2 },
          { month: 'Feb', sales: 195000, growth: 18.5 },
          { month: 'Mar', sales: 220000, growth: 22.1 },
          { month: 'Apr', sales: 210000, growth: 19.8 },
          { month: 'May', sales: 245000, growth: 25.3 },
          { month: 'Jun', sales: 260000, growth: 28.7 }
        ],
        'Vegetables': [
          { month: 'Jan', sales: 165000, growth: 12.8 },
          { month: 'Feb', sales: 185000, growth: 16.2 },
          { month: 'Mar', sales: 210000, growth: 21.5 },
          { month: 'Apr', sales: 195000, growth: 18.9 },
          { month: 'May', sales: 225000, growth: 24.1 },
          { month: 'Jun', sales: 240000, growth: 27.3 }
        ]
      },
      insights: [
        {
          type: 'seasonal_peak',
          message: 'June shows highest sales performance with 27.3% growth',
          confidence: 0.92
        },
        {
          type: 'category_performance',
          message: 'FMCG category consistently outperforms vegetables by 8-12%',
          confidence: 0.87
        }
      ]
    };

    res.json({
      success: true,
      data: mockTrends,
      period,
      category: category || 'all',
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching seasonal trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal trends',
      message: error.message
    });
  }
});

module.exports = router;
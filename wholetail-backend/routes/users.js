const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive user profile with business details
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder') || true) {
      console.log('Using mock user profile data for development');
      
      const mockUserProfile = {
        id: userId,
        name: 'Jane Wanjiku',
        email: 'jane.wanjiku@example.com',
        phone: '+254701234567',
        type: 'retailer',
        business_name: 'Wanjiku\'s Fresh Mart Plus',
        address: 'Nairobi CBD, Kenya',
        location: 'Nairobi CBD',
        latitude: -1.2921,
        longitude: 36.8219,
        rating: 4.8,
        tier: 'Diamond Elite Retailer',
        join_date: '2022-08-15',
        business_type: 'Grocery & FMCG',
        store_size: 'Medium (200-500 sqm)',
        monthly_footfall: 3500,
        ai_adoption_score: 92.3,
        sustainability_score: 87.5,
        customer_loyalty_score: 94.2,
        verification_status: 'verified',
        created_at: '2022-08-15T10:30:00Z',
        updated_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        data: mockUserProfile
      });
    }

    // Real Supabase implementation
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found',
        message: error.message 
      });
    }

    res.json({ 
      success: true,
      data: data 
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get business statistics for a user
router.get('/business-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'month' } = req.query;

    // Mock business statistics
    const mockBusinessStats = {
      overview: {
        total_revenue: 4850000,
        total_orders: 284,
        avg_order_value: 17077,
        customer_count: 156,
        growth_rate: 42.3,
        profit_margin: 24.8
      },
      performance_metrics: {
        efficiency_score: 94.7,
        customer_satisfaction: 96.2,
        inventory_turnover: 8.4,
        ai_adoption_score: 92.3,
        sustainability_score: 87.5,
        market_share: 12.3
      },
      recent_activity: {
        orders_this_month: 89,
        revenue_this_month: 720000,
        new_customers: 23,
        products_sold: 1250,
        avg_delivery_time: 18.5,
        return_rate: 2.1
      },
      achievements: [
        {
          title: 'Diamond Elite Status',
          description: 'Achieved top-tier retailer status',
          date: '2024-06-01',
          icon: 'diamond'
        },
        {
          title: 'AI Pioneer',
          description: '90%+ AI adoption score',
          date: '2024-05-15',
          icon: 'robot'
        },
        {
          title: 'Customer Champion',
          description: '95%+ customer satisfaction',
          date: '2024-04-20',
          icon: 'star'
        }
      ],
      tier_benefits: {
        current_tier: 'Diamond Elite',
        credit_limit: 750000,
        discount_rate: 8.5,
        priority_support: true,
        ai_insights: true,
        bulk_pricing: true
      }
    };

    res.json({
      success: true,
      data: mockBusinessStats,
      period,
      user_id: userId,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business statistics',
      message: error.message
    });
  }
});

// Get user achievements and milestones
router.get('/achievements/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const mockAchievements = [
      {
        id: 'ach-1',
        title: 'First Order Milestone',
        description: 'Completed your first order on Wholetail',
        category: 'milestone',
        date_achieved: '2022-08-20',
        points: 100,
        badge: 'bronze'
      },
      {
        id: 'ach-2',
        title: 'Power User',
        description: 'Placed 100+ orders',
        category: 'volume',
        date_achieved: '2023-03-15',
        points: 500,
        badge: 'silver'
      },
      {
        id: 'ach-3',
        title: 'AI Adopter',
        description: 'Used AI recommendations 50+ times',
        category: 'innovation',
        date_achieved: '2023-11-10',
        points: 750,
        badge: 'gold'
      },
      {
        id: 'ach-4',
        title: 'Sustainability Champion',
        description: 'Achieved 85%+ sustainability score',
        category: 'sustainability',
        date_achieved: '2024-01-25',
        points: 1000,
        badge: 'platinum'
      },
      {
        id: 'ach-5',
        title: 'Diamond Elite',
        description: 'Reached highest tier status',
        category: 'tier',
        date_achieved: '2024-06-01',
        points: 2000,
        badge: 'diamond'
      }
    ];

    const totalPoints = mockAchievements.reduce((sum, ach) => sum + ach.points, 0);

    res.json({
      success: true,
      data: {
        achievements: mockAchievements,
        total_points: totalPoints,
        total_achievements: mockAchievements.length,
        latest_achievement: mockAchievements[mockAchievements.length - 1],
        next_milestone: {
          title: 'Innovation Leader',
          description: 'Complete 10 AI optimization cycles',
          progress: 7,
          target: 10,
          estimated_completion: '2024-08-15'
        }
      },
      user_id: userId
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements',
      message: error.message
    });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Profile updated successfully', user: data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
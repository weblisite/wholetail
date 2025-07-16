const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Import advanced advertising services
const adPaymentService = require('../services/adPaymentService');
const biddingService = require('../services/biddingService');
const audienceSegmentationService = require('../services/audienceSegmentationService');
const smsService = require('../services/smsService');
const abTestingService = require('../services/abTestingService');

// Mock advertising data for development
const mockCampaigns = [
  {
    id: 'camp-1',
    wholesaler_id: 'wholesaler-123',
    product_id: 'prod-1',
    campaign_name: 'Premium Rice Promotion',
    campaign_type: 'featured_listing',
    status: 'active',
    budget_allocated: 50000,
    budget_spent: 32500,
    budget_remaining: 17500,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    performance_metrics: {
      impressions: 15420,
      clicks: 892,
      conversions: 156,
      ctr: 5.8,
      conversion_rate: 17.5,
      cost_per_click: 36.4,
      revenue_generated: 780000
    },
    target_audience: {
      location: ['Nairobi', 'Mombasa'],
      business_size: ['medium', 'large'],
      purchase_frequency: 'high'
    },
    product: {
      name: 'Premium Basmati Rice 25kg',
      category: 'Grains & Cereals',
      price: 4500,
      image_url: '/api/placeholder/300/200'
    }
  },
  {
    id: 'camp-2',
    wholesaler_id: 'wholesaler-123',
    product_id: 'prod-2',
    campaign_name: 'Cooking Oil Flash Sale',
    campaign_type: 'sms_campaign',
    status: 'completed',
    budget_allocated: 25000,
    budget_spent: 24800,
    budget_remaining: 200,
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    performance_metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 89,
      ctr: 0,
      conversion_rate: 12.4,
      cost_per_sms: 5.5,
      revenue_generated: 445000,
      sms_sent: 4509,
      sms_delivered: 4421
    },
    target_audience: {
      location: ['Nairobi'],
      business_size: ['small', 'medium'],
      purchase_frequency: 'medium'
    },
    product: {
      name: 'Golden Fry Cooking Oil 20L',
      category: 'Oils & Fats',
      price: 3200,
      image_url: '/api/placeholder/300/200'
    }
  },
  {
    id: 'camp-3',
    wholesaler_id: 'wholesaler-123',
    product_id: 'prod-3',
    campaign_name: 'Maize Flour Priority',
    campaign_type: 'priority_placement',
    status: 'pending',
    budget_allocated: 30000,
    budget_spent: 0,
    budget_remaining: 30000,
    start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    performance_metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      conversion_rate: 0,
      cost_per_click: 0,
      revenue_generated: 0
    },
    target_audience: {
      location: ['Kisumu', 'Eldoret'],
      business_size: ['small'],
      purchase_frequency: 'high'
    },
    product: {
      name: 'Pembe Maize Flour 2kg',
      category: 'Flours & Baking',
      price: 180,
      image_url: '/api/placeholder/300/200'
    }
  }
];

const mockAdvertisingMetrics = {
  'wholesaler-123': {
    total_campaigns: 8,
    active_campaigns: 3,
    completed_campaigns: 4,
    pending_campaigns: 1,
    total_budget_allocated: 285000,
    total_budget_spent: 197300,
    total_revenue_generated: 2100000,
    average_roi: 1064,
    best_performing_campaign: 'Premium Rice Promotion',
    monthly_performance: [
      { month: 'Jan', spend: 45000, revenue: 230000, roi: 511 },
      { month: 'Feb', spend: 52000, revenue: 285000, roi: 548 },
      { month: 'Mar', spend: 38000, revenue: 195000, roi: 513 },
      { month: 'Apr', spend: 62300, revenue: 390000, roi: 626 }
    ],
    campaign_types_performance: {
      featured_listing: { campaigns: 3, avg_roi: 1200, total_revenue: 1200000 },
      sms_campaign: { campaigns: 2, avg_roi: 890, total_revenue: 580000 },
      priority_placement: { campaigns: 3, avg_roi: 980, total_revenue: 320000 }
    }
  }
};

const mockAdSpends = [
  {
    id: 'spend-1',
    campaign_id: 'camp-1',
    date: new Date().toISOString(),
    amount: 1250,
    clicks: 45,
    impressions: 892,
    conversions: 8,
    revenue_generated: 36000
  },
  {
    id: 'spend-2',
    campaign_id: 'camp-2', 
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 1100,
    clicks: 0,
    impressions: 0,
    conversions: 12,
    revenue_generated: 38400,
    sms_sent: 200,
    sms_delivered: 195
  }
];

// Get all advertising campaigns for a wholesaler
router.get('/campaigns/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { status, campaign_type, page = 1, limit = 10 } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock advertising campaigns data for development');
      
      let filteredCampaigns = mockCampaigns.filter(campaign => campaign.wholesaler_id === wholesalerId);
      
      if (status) {
        filteredCampaigns = filteredCampaigns.filter(campaign => campaign.status === status);
      }
      
      if (campaign_type) {
        filteredCampaigns = filteredCampaigns.filter(campaign => campaign.campaign_type === campaign_type);
      }
      
      return res.json({ 
        campaigns: filteredCampaigns,
        total: filteredCampaigns.length,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    // Real Supabase implementation would go here
    res.json({ campaigns: [], total: 0 });
  } catch (error) {
    console.error('Campaigns fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get advertising analytics for a wholesaler
router.get('/analytics/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { period = 'month' } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock advertising analytics data for development');
      
      const analytics = mockAdvertisingMetrics[wholesalerId] || {
        total_campaigns: 0,
        active_campaigns: 0,
        completed_campaigns: 0,
        pending_campaigns: 0,
        total_budget_allocated: 0,
        total_budget_spent: 0,
        total_revenue_generated: 0,
        average_roi: 0,
        monthly_performance: [],
        campaign_types_performance: {}
      };
      
      return res.json({ analytics });
    }

    // Real Supabase implementation would go here
    res.json({ analytics: {} });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new advertising campaign
router.post('/campaigns', async (req, res) => {
  try {
    const {
      wholesaler_id,
      product_id,
      campaign_name,
      campaign_type,
      budget_allocated,
      start_date,
      end_date,
      target_audience
    } = req.body;

    // Validate required fields
    if (!wholesaler_id || !product_id || !campaign_name || !campaign_type || !budget_allocated) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Creating mock advertising campaign for development');
      
      const newCampaign = {
        id: `camp-${Date.now()}`,
        wholesaler_id,
        product_id,
        campaign_name,
        campaign_type,
        status: 'pending',
        budget_allocated: parseFloat(budget_allocated),
        budget_spent: 0,
        budget_remaining: parseFloat(budget_allocated),
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        performance_metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          conversion_rate: 0,
          cost_per_click: 0,
          revenue_generated: 0
        },
        target_audience: target_audience || {},
        product: {
          name: 'Sample Product',
          category: 'General',
          price: 1000,
          image_url: '/api/placeholder/300/200'
        }
      };
      
      mockCampaigns.push(newCampaign);
      
      return res.json({ 
        message: 'Campaign created successfully',
        campaign: newCampaign
      });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Campaign created successfully' });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update advertising campaign
router.put('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Updating mock advertising campaign for development');
      
      const campaignIndex = mockCampaigns.findIndex(campaign => campaign.id === campaignId);
      if (campaignIndex === -1) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Update campaign
      mockCampaigns[campaignIndex] = {
        ...mockCampaigns[campaignIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      return res.json({ 
        message: 'Campaign updated successfully',
        campaign: mockCampaigns[campaignIndex]
      });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Campaign update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete advertising campaign
router.delete('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Deleting mock advertising campaign for development');
      
      const campaignIndex = mockCampaigns.findIndex(campaign => campaign.id === campaignId);
      if (campaignIndex === -1) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Remove campaign
      mockCampaigns.splice(campaignIndex, 1);
      
      return res.json({ message: 'Campaign deleted successfully' });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Campaign deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign performance details
router.get('/campaigns/:campaignId/performance', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { period = '7d' } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock campaign performance data for development');
      
      const campaign = mockCampaigns.find(campaign => campaign.id === campaignId);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Generate mock daily performance data
      const dailyPerformance = [];
      const days = period === '30d' ? 30 : 7;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        dailyPerformance.push({
          date: date.toISOString().split('T')[0],
          impressions: Math.floor(Math.random() * 1000) + 100,
          clicks: Math.floor(Math.random() * 50) + 5,
          conversions: Math.floor(Math.random() * 10) + 1,
          spend: Math.floor(Math.random() * 2000) + 500,
          revenue: Math.floor(Math.random() * 20000) + 5000
        });
      }
      
      return res.json({ 
        campaign: campaign,
        daily_performance: dailyPerformance,
        summary: campaign.performance_metrics
      });
    }

    // Real Supabase implementation would go here
    res.json({ daily_performance: [], summary: {} });
  } catch (error) {
    console.error('Campaign performance fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured products for retailers (used in product listings)
router.get('/featured-products', async (req, res) => {
  try {
    const { category, location, limit = 10 } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock featured products data for development');
      
      // Get active featured listing campaigns
      const featuredCampaigns = mockCampaigns.filter(campaign => 
        campaign.campaign_type === 'featured_listing' && 
        campaign.status === 'active'
      );
      
      // Sort by budget spent (higher budget = higher priority)
      const featuredProducts = featuredCampaigns
        .sort((a, b) => b.budget_spent - a.budget_spent)
        .slice(0, parseInt(limit))
        .map(campaign => ({
          ...campaign.product,
          product_id: campaign.product_id,
          campaign_id: campaign.id,
          is_featured: true,
          ad_label: 'Sponsored',
          wholesaler_id: campaign.wholesaler_id
        }));
      
      return res.json({ featured_products: featuredProducts });
    }

    // Real Supabase implementation would go here
    res.json({ featured_products: [] });
  } catch (error) {
    console.error('Featured products fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record ad interaction (click, view, conversion)
router.post('/interactions', async (req, res) => {
  try {
    const { campaign_id, interaction_type, retailer_id, product_id, value } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Recording mock ad interaction for development');
      
      const campaignIndex = mockCampaigns.findIndex(campaign => campaign.id === campaign_id);
      if (campaignIndex === -1) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Update campaign metrics based on interaction type
      const campaign = mockCampaigns[campaignIndex];
      const metrics = campaign.performance_metrics;
      
      switch (interaction_type) {
        case 'view':
          metrics.impressions += 1;
          break;
        case 'click':
          metrics.clicks += 1;
          metrics.ctr = (metrics.clicks / metrics.impressions) * 100;
          // Charge for click (simplified)
          const clickCost = 40; // KSh per click
          campaign.budget_spent += clickCost;
          campaign.budget_remaining -= clickCost;
          break;
        case 'conversion':
          metrics.conversions += 1;
          metrics.conversion_rate = (metrics.conversions / metrics.clicks) * 100;
          if (value) {
            metrics.revenue_generated += parseFloat(value);
          }
          break;
      }
      
      mockCampaigns[campaignIndex] = campaign;
      
      return res.json({ 
        message: 'Interaction recorded successfully',
        updated_metrics: metrics
      });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Interaction recorded successfully' });
  } catch (error) {
    console.error('Interaction recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get advertising recommendations for wholesaler
router.get('/recommendations/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock advertising recommendations for development');
      
      const recommendations = [
        {
          id: 'rec-1',
          type: 'budget_optimization',
          title: 'Increase Budget for Premium Rice Campaign',
          description: 'Your Premium Rice campaign is performing 40% above average. Consider increasing budget by KSh 20,000 for better reach.',
          potential_impact: '+35% revenue increase',
          recommended_action: 'increase_budget',
          priority: 'high',
          estimated_roi: 1250
        },
        {
          id: 'rec-2',
          type: 'new_campaign',
          title: 'Launch SMS Campaign for Cooking Oil',
          description: 'Retailers in Mombasa show high demand for cooking oil. SMS campaigns could boost sales by 25%.',
          potential_impact: '+25% local sales',
          recommended_action: 'create_sms_campaign',
          priority: 'medium',
          estimated_roi: 890
        },
        {
          id: 'rec-3',
          type: 'audience_expansion',
          title: 'Expand to Kisumu Market',
          description: 'Your products show strong potential in Kisumu based on market analysis.',
          potential_impact: '+15% market reach',
          recommended_action: 'expand_targeting',
          priority: 'medium',
          estimated_roi: 670
        }
      ];
      
      return res.json({ recommendations });
    }

    // Real Supabase implementation would go here
    res.json({ recommendations: [] });
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 

// ===============================
// ADVANCED ADVERTISING FEATURES
// ===============================

// M-Pesa Payment Processing Endpoints
router.post('/payment/setup', async (req, res) => {
  try {
    const { wholesaler_id, business_info } = req.body;
    const customer = await adPaymentService.createCustomer(business_info);
    res.json({ success: true, customer_id: customer.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment/add-mpesa', async (req, res) => {
  try {
    const { customer_id, phone_number } = req.body;
    const paymentMethod = await adPaymentService.addPaymentMethod(customer_id, phone_number);
    res.json({ success: true, payment_method: paymentMethod });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/methods/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const methods = await adPaymentService.getPaymentMethods(customerId);
    res.json({ payment_methods: methods });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/budget/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const budget = await adPaymentService.getAvailableBudget(wholesalerId);
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/analytics/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { period = '30d' } = req.query;
    const analytics = await adPaymentService.getSpendingAnalytics(wholesalerId, period);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// M-Pesa specific endpoints
router.post('/payment/mpesa/stk-push', async (req, res) => {
  try {
    const { customer_id, amount, campaign_id, phone_number, description } = req.body;
    const payment = await adPaymentService.createAdSpendPayment(
      customer_id, 
      amount, 
      campaign_id, 
      phone_number, 
      description
    );
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment/mpesa/callback/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await adPaymentService.handleMpesaCallback(req.body);
    console.log(`M-Pesa callback for payment ${paymentId}:`, result);
    res.json({ success: true });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/mpesa/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const status = await adPaymentService.checkPaymentStatus(checkoutRequestId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time Bidding Endpoints
router.get('/bidding/placements', async (req, res) => {
  try {
    const { category, type } = req.query;
    const placements = biddingService.getActivePlacements({ category, type });
    res.json({ placements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bidding/submit', async (req, res) => {
  try {
    const { wholesaler_id, placement_id, bid_amount, product_id } = req.body;
    const result = await biddingService.submitBid(wholesaler_id, placement_id, bid_amount, product_id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/bidding/status/:placementId', async (req, res) => {
  try {
    const { placementId } = req.params;
    const status = biddingService.getPlacementStatus(placementId);
    if (!status) {
      return res.status(404).json({ error: 'Placement not found' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bidding/recommendations/:placementId/:wholesalerId', async (req, res) => {
  try {
    const { placementId, wholesalerId } = req.params;
    const recommendations = biddingService.getBiddingRecommendations(placementId, wholesalerId);
    if (!recommendations) {
      return res.status(404).json({ error: 'Placement not found' });
    }
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bidding/analytics/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { period = '7d' } = req.query;
    const analytics = biddingService.getBiddingAnalytics(wholesalerId, period);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize sample placement auction for testing
router.post('/bidding/create-placement', async (req, res) => {
  try {
    const { type, category, min_bid, duration } = req.body;
    const placementId = `placement_${Date.now()}`;
    const placement = biddingService.initializePlacement(placementId, {
      type,
      category,
      min_bid,
      auction_duration: duration * 1000
    });
    res.json({ placement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audience Segmentation Endpoints
router.get('/audience/segments', async (req, res) => {
  try {
    const insights = audienceSegmentationService.getSegmentInsights();
    res.json({ segments: insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/audience/analyze', async (req, res) => {
  try {
    const { user_id, behavior_data } = req.body;
    const profile = audienceSegmentationService.analyzeUserBehavior(user_id, behavior_data);
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/audience/targeting-recommendations', async (req, res) => {
  try {
    const { campaign_type, product_category, budget } = req.query;
    const recommendations = audienceSegmentationService.getTargetingRecommendations(
      campaign_type,
      product_category,
      parseFloat(budget)
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/audience/update-segments', async (req, res) => {
  try {
    const { user_id, new_behavior_data } = req.body;
    const result = audienceSegmentationService.updateUserSegments(user_id, new_behavior_data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS Campaign Endpoints
router.post('/sms/send-campaign', async (req, res) => {
  try {
    const { campaign_id, message, recipients, options = {} } = req.body;
    const result = await smsService.sendCampaignSMS(campaign_id, message, recipients, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sms/analytics/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const analytics = smsService.getCampaignAnalytics(campaignId);
    if (!analytics) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sms/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const analytics = smsService.getSMSAnalytics(period);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sms/opt-out', async (req, res) => {
  try {
    const { phone_number, campaign_id } = req.body;
    const result = smsService.handleOptOut(phone_number, campaign_id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sms/opt-in', async (req, res) => {
  try {
    const { phone_number } = req.body;
    smsService.handleOptIn(phone_number);
    res.json({ success: true, message: 'Opted in successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sms/templates', async (req, res) => {
  try {
    const templates = smsService.getPopularTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS webhook for delivery reports
router.post('/sms/webhook/delivery', async (req, res) => {
  try {
    smsService.handleDeliveryReport(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// A/B Testing Endpoints
router.post('/ab-test/create', async (req, res) => {
  try {
    const test = abTestingService.createABTest(req.body);
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ab-test/:testId/start', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = abTestingService.startTest(testId);
    res.json({ success: true, test });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/ab-test/:testId/assign', async (req, res) => {
  try {
    const { testId } = req.params;
    const { user_id, user_attributes } = req.body;
    const variant = abTestingService.assignUserToVariant(testId, user_id, user_attributes);
    res.json({ variant });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ab-test/:testId/record-event', async (req, res) => {
  try {
    const { testId } = req.params;
    const { variant_id, event_type, data } = req.body;
    abTestingService.recordEvent(testId, variant_id, event_type, data);
    res.json({ success: true, message: 'Event recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ab-test/:testId/results', async (req, res) => {
  try {
    const { testId } = req.params;
    const results = abTestingService.getTestResults(testId);
    res.json(results);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/ab-test/dashboard/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const dashboard = abTestingService.getTestDashboard(wholesalerId);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ab-test/templates', async (req, res) => {
  try {
    const templates = abTestingService.getTestTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ab-test/:testId/stop', async (req, res) => {
  try {
    const { testId } = req.params;
    const { reason } = req.body;
    const analysis = abTestingService.stopTest(testId, reason);
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 
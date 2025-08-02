const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Get smart recommendations for a retailer
router.get('/smart/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { category, type } = req.query;

    // Mock smart recommendations for development
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'inventory',
        title: 'Stock High-Demand Items',
        description: 'Based on sales trends, consider increasing stock for Fresh Tomatoes and White Maize by 40%',
        confidence_score: 0.94,
        potential_savings: 125000,
        action_text: 'Increase Stock',
        urgency: 'high',
        category: 'Vegetables',
        implementation_effort: 'easy',
        impact_metrics: {
          revenue_increase: 180000,
          stockout_reduction: 85,
          customer_satisfaction: 12
        }
      },
      {
        id: 'rec-2',
        type: 'pricing',
        title: 'Optimize Pricing Strategy',
        description: 'AI analysis suggests adjusting prices for FMCG items during peak hours for 8% revenue boost',
        confidence_score: 0.87,
        potential_savings: 95000,
        action_text: 'Apply Dynamic Pricing',
        urgency: 'medium',
        category: 'FMCG',
        implementation_effort: 'moderate',
        impact_metrics: {
          revenue_increase: 95000,
          margin_improvement: 3.2,
          competitive_advantage: 'high'
        }
      },
      {
        id: 'rec-3',
        type: 'supplier',
        title: 'Switch to Better Supplier',
        description: 'Found a supplier offering 15% better prices for Grains with same quality standards',
        confidence_score: 0.91,
        potential_savings: 180000,
        action_text: 'Contact Supplier',
        urgency: 'medium',
        category: 'Grains',
        implementation_effort: 'moderate',
        impact_metrics: {
          cost_reduction: 180000,
          quality_score: 4.8,
          delivery_improvement: 20
        }
      },
      {
        id: 'rec-4',
        type: 'promotion',
        title: 'Launch Bundle Promotion',
        description: 'Create "Fresh Essentials" bundle combining vegetables and FMCG for 22% margin increase',
        confidence_score: 0.89,
        potential_savings: 75000,
        action_text: 'Create Bundle',
        urgency: 'low',
        category: 'Mixed',
        implementation_effort: 'easy',
        impact_metrics: {
          margin_increase: 75000,
          customer_acquisition: 45,
          average_order_value: 18
        }
      },
      {
        id: 'rec-5',
        type: 'inventory',
        title: 'Reduce Slow-Moving Stock',
        description: 'Items in Dairy category have low turnover. Consider promotional pricing or alternative products',
        confidence_score: 0.83,
        potential_savings: 45000,
        action_text: 'Run Promotion',
        urgency: 'medium',
        category: 'Dairy',
        implementation_effort: 'easy',
        impact_metrics: {
          inventory_reduction: 45000,
          cash_flow_improvement: 30000,
          storage_optimization: 25
        }
      }
    ];

    // Filter by type if specified
    let filteredRecommendations = mockRecommendations;
    if (type) {
      filteredRecommendations = mockRecommendations.filter(rec => rec.type === type);
    }

    // Filter by category if specified
    if (category) {
      filteredRecommendations = filteredRecommendations.filter(rec => 
        rec.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Sort by confidence score and potential savings
    filteredRecommendations.sort((a, b) => {
      const scoreA = (a.confidence_score * 0.6) + (a.potential_savings / 200000 * 0.4);
      const scoreB = (b.confidence_score * 0.6) + (b.potential_savings / 200000 * 0.4);
      return scoreB - scoreA;
    });

    res.json({
      success: true,
      data: filteredRecommendations,
      total_potential_savings: filteredRecommendations.reduce((sum, rec) => sum + rec.potential_savings, 0),
      avg_confidence_score: filteredRecommendations.reduce((sum, rec) => sum + rec.confidence_score, 0) / filteredRecommendations.length,
      retailer_id: retailerId,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching smart recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch smart recommendations',
      message: error.message
    });
  }
});

// Get inventory optimization recommendations
router.get('/inventory/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    const mockInventoryRecommendations = [
      {
        id: 'inv-1',
        product_name: 'Fresh Tomatoes',
        current_stock: 45,
        recommended_stock: 85,
        reason: 'High demand trend detected, increase by 89%',
        urgency: 'high',
        potential_revenue_loss: 25000,
        reorder_point: 20,
        optimal_quantity: 100
      },
      {
        id: 'inv-2',
        product_name: 'White Maize',
        current_stock: 120,
        recommended_stock: 80,
        reason: 'Seasonal demand declining, reduce by 33%',
        urgency: 'medium',
        potential_savings: 15000,
        reorder_point: 30,
        optimal_quantity: 80
      },
      {
        id: 'inv-3',
        product_name: 'Rice 5kg',
        current_stock: 25,
        recommended_stock: 60,
        reason: 'Stockout risk high, increase immediately',
        urgency: 'high',
        potential_revenue_loss: 18000,
        reorder_point: 15,
        optimal_quantity: 75
      }
    ];

    res.json({
      success: true,
      data: mockInventoryRecommendations,
      summary: {
        total_items_analyzed: 25,
        high_priority_actions: 2,
        potential_savings: 33000,
        potential_revenue_protection: 43000
      },
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching inventory recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory recommendations',
      message: error.message
    });
  }
});

// Get pricing optimization recommendations
router.get('/pricing/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    const mockPricingRecommendations = [
      {
        id: 'price-1',
        product_name: 'Fresh Tomatoes',
        current_price: 120,
        recommended_price: 135,
        price_change: 12.5,
        reason: 'Market demand high, competitor prices 15% higher',
        confidence: 0.92,
        estimated_impact: {
          revenue_change: 45000,
          volume_change: -8,
          margin_improvement: 18.2
        }
      },
      {
        id: 'price-2',
        product_name: 'White Maize',
        current_price: 80,
        recommended_price: 75,
        price_change: -6.25,
        reason: 'Increase volume to clear seasonal inventory',
        confidence: 0.87,
        estimated_impact: {
          revenue_change: -12000,
          volume_change: 25,
          inventory_turnover: 35
        }
      },
      {
        id: 'price-3',
        product_name: 'Sugar 2kg',
        current_price: 180,
        recommended_price: 185,
        price_change: 2.8,
        reason: 'Slight adjustment to match market premium',
        confidence: 0.79,
        estimated_impact: {
          revenue_change: 8500,
          volume_change: -2,
          margin_improvement: 4.1
        }
      }
    ];

    res.json({
      success: true,
      data: mockPricingRecommendations,
      summary: {
        total_products_analyzed: 15,
        recommended_increases: 2,
        recommended_decreases: 1,
        net_revenue_impact: 41500,
        avg_confidence: 0.86
      },
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching pricing recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing recommendations',
      message: error.message
    });
  }
});

// Execute a recommendation action
router.post('/:recommendationId/action', async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { action_type, parameters } = req.body;

    // Mock action execution
    const mockActionResult = {
      recommendation_id: recommendationId,
      action_type,
      status: 'executed',
      executed_at: new Date().toISOString(),
      results: {
        success: true,
        changes_applied: parameters?.changes || 'Price updated successfully',
        estimated_impact: 'Revenue increase of 5-8% expected within 2 weeks',
        next_review_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    res.json({
      success: true,
      data: mockActionResult,
      message: 'Recommendation action executed successfully'
    });

  } catch (error) {
    console.error('Error executing recommendation action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute recommendation action',
      message: error.message
    });
  }
});

// Get recommendation performance analytics
router.get('/performance/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    const mockPerformance = {
      total_recommendations_generated: 47,
      recommendations_executed: 23,
      execution_rate: 48.9,
      total_savings_realized: 285000,
      avg_accuracy: 0.91,
      top_performing_categories: [
        { category: 'inventory', success_rate: 0.94, avg_savings: 35000 },
        { category: 'pricing', success_rate: 0.87, avg_savings: 28000 },
        { category: 'supplier', success_rate: 0.82, avg_savings: 45000 }
      ],
      monthly_performance: [
        { month: 'Jan', recommendations: 8, executed: 4, savings: 45000 },
        { month: 'Feb', recommendations: 7, executed: 3, savings: 38000 },
        { month: 'Mar', recommendations: 9, executed: 5, savings: 52000 },
        { month: 'Apr', recommendations: 6, executed: 4, savings: 41000 },
        { month: 'May', recommendations: 8, executed: 3, savings: 35000 },
        { month: 'Jun', recommendations: 9, executed: 4, savings: 74000 }
      ]
    };

    res.json({
      success: true,
      data: mockPerformance,
      retailer_id: retailerId
    });

  } catch (error) {
    console.error('Error fetching recommendation performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendation performance',
      message: error.message
    });
  }
});

module.exports = router;
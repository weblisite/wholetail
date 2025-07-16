const express = require('express');
const router = express.Router();
const confidenceScoreService = require('../services/confidenceScoreService');

// Get confidence score for a specific retailer
router.get('/score/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    
    const retailer = confidenceScoreService.getRetailerById(retailerId);
    if (!retailer) {
      return res.status(404).json({ 
        error: 'Retailer not found',
        retailer_id: retailerId 
      });
    }
    
    const confidenceScore = confidenceScoreService.calculateConfidenceScore(retailer);
    
    res.json({
      success: true,
      confidence_score: confidenceScore
    });
    
  } catch (error) {
    console.error('Error calculating confidence score:', error);
    res.status(500).json({ error: 'Failed to calculate confidence score' });
  }
});

// Get confidence scores for all retailers
router.get('/scores', async (req, res) => {
  try {
    const { sort_by = 'confidence_score', order = 'desc', limit = 50, offset = 0 } = req.query;
    
    let scores = confidenceScoreService.calculateAllConfidenceScores();
    
    // Sort scores
    if (sort_by === 'confidence_score') {
      scores.sort((a, b) => order === 'desc' 
        ? b.confidence_score - a.confidence_score 
        : a.confidence_score - b.confidence_score
      );
    } else if (sort_by === 'recommended_loan_amount') {
      scores.sort((a, b) => order === 'desc' 
        ? b.recommended_loan_amount - a.recommended_loan_amount 
        : a.recommended_loan_amount - b.recommended_loan_amount
      );
    } else if (sort_by === 'retailer_name') {
      scores.sort((a, b) => order === 'desc' 
        ? b.retailer_name.localeCompare(a.retailer_name)
        : a.retailer_name.localeCompare(b.retailer_name)
      );
    }
    
    // Apply pagination
    const paginatedScores = scores.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      confidence_scores: paginatedScores,
      total: scores.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total_pages: Math.ceil(scores.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error getting confidence scores:', error);
    res.status(500).json({ error: 'Failed to get confidence scores' });
  }
});

// Get confidence score analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = confidenceScoreService.getConfidenceScoreAnalytics();
    
    res.json({
      success: true,
      analytics
    });
    
  } catch (error) {
    console.error('Error getting confidence score analytics:', error);
    res.status(500).json({ error: 'Failed to get confidence score analytics' });
  }
});

// Get retailer score history
router.get('/history/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { months = 12 } = req.query;
    
    const retailer = confidenceScoreService.getRetailerById(retailerId);
    if (!retailer) {
      return res.status(404).json({ 
        error: 'Retailer not found',
        retailer_id: retailerId 
      });
    }
    
    const history = confidenceScoreService.simulateScoreHistory(retailerId, parseInt(months));
    
    res.json({
      success: true,
      retailer_id: retailerId,
      retailer_name: retailer.name,
      score_history: history,
      months: parseInt(months)
    });
    
  } catch (error) {
    console.error('Error getting score history:', error);
    res.status(500).json({ error: 'Failed to get score history' });
  }
});

// Get retailers by confidence level
router.get('/by-level/:level', async (req, res) => {
  try {
    const { level } = req.params; // high, medium, low, very_low
    const { limit = 20, offset = 0 } = req.query;
    
    const allScores = confidenceScoreService.calculateAllConfidenceScores();
    const filteredScores = allScores.filter(score => score.confidence_level === level);
    
    // Apply pagination
    const paginatedScores = filteredScores.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      confidence_level: level,
      retailers: paginatedScores,
      total: filteredScores.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total_pages: Math.ceil(filteredScores.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error getting retailers by confidence level:', error);
    res.status(500).json({ error: 'Failed to get retailers by confidence level' });
  }
});

// Get loan recommendations for eligible retailers
router.get('/loan-recommendations', async (req, res) => {
  try {
    const { min_score = 500, max_amount, sort_by = 'confidence_score' } = req.query;
    
    let scores = confidenceScoreService.calculateAllConfidenceScores();
    
    // Filter by minimum score
    scores = scores.filter(score => score.confidence_score >= parseInt(min_score));
    
    // Filter by maximum loan amount if specified
    if (max_amount) {
      scores = scores.filter(score => score.recommended_loan_amount <= parseInt(max_amount));
    }
    
    // Sort by specified criteria
    if (sort_by === 'confidence_score') {
      scores.sort((a, b) => b.confidence_score - a.confidence_score);
    } else if (sort_by === 'loan_amount') {
      scores.sort((a, b) => b.recommended_loan_amount - a.recommended_loan_amount);
    }
    
    // Calculate totals
    const totalRecommendedAmount = scores.reduce((sum, score) => sum + score.recommended_loan_amount, 0);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score.confidence_score, 0) / scores.length)
      : 0;
    
    res.json({
      success: true,
      loan_recommendations: scores.map(score => ({
        retailer_id: score.retailer_id,
        retailer_name: score.retailer_name,
        confidence_score: score.confidence_score,
        confidence_level: score.confidence_level,
        recommended_loan_amount: score.recommended_loan_amount,
        max_loan_amount: score.max_loan_amount,
        risk_level: score.risk_level
      })),
      summary: {
        eligible_retailers: scores.length,
        total_recommended_amount: totalRecommendedAmount,
        average_confidence_score: averageScore,
        min_score_threshold: parseInt(min_score)
      }
    });
    
  } catch (error) {
    console.error('Error getting loan recommendations:', error);
    res.status(500).json({ error: 'Failed to get loan recommendations' });
  }
});

// Get scoring algorithm details
router.get('/algorithm/details', async (req, res) => {
  try {
    res.json({
      success: true,
      algorithm: {
        scoring_weights: confidenceScoreService.SCORING_WEIGHTS,
        risk_thresholds: confidenceScoreService.RISK_THRESHOLDS,
        score_range: {
          minimum: 0,
          maximum: 1000
        },
        confidence_levels: {
          high: '750-1000',
          medium: '500-749',
          low: '250-499',
          very_low: '0-249'
        },
        factors: {
          transaction_history: {
            weight: '25%',
            components: ['Order volume', 'Revenue', 'Average order value', 'Order recency']
          },
          payment_behavior: {
            weight: '20%',
            components: ['Payment success rate', 'Return rate']
          },
          business_stability: {
            weight: '15%',
            components: ['Business age', 'Seasonal stability', 'Category diversity']
          },
          growth_metrics: {
            weight: '15%',
            components: ['Revenue growth', 'Customer retention']
          },
          risk_factors: {
            weight: '10%',
            components: ['Geographic risk', 'Category concentration']
          },
          credit_history: {
            weight: '10%',
            components: ['Payment history', 'Loan experience', 'Defaults']
          },
          social_proof: {
            weight: '5%',
            components: ['Customer reviews', 'Repeat customers', 'Referrals']
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting algorithm details:', error);
    res.status(500).json({ error: 'Failed to get algorithm details' });
  }
});

// Simulate score calculation with custom parameters
router.post('/simulate', async (req, res) => {
  try {
    const retailerData = req.body;
    
    // Validate required fields
    const requiredFields = [
      'name', 'business_age_months', 'total_orders', 'total_revenue',
      'payment_success_rate', 'return_rate'
    ];
    
    for (const field of requiredFields) {
      if (retailerData[field] === undefined || retailerData[field] === null) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }
    
    // Set defaults for optional fields
    const simulatedRetailer = {
      id: 'simulated',
      location: retailerData.location || 'Unknown',
      registration_date: retailerData.registration_date || new Date().toISOString().split('T')[0],
      average_order_value: retailerData.average_order_value || (retailerData.total_revenue / retailerData.total_orders),
      geographic_risk_score: retailerData.geographic_risk_score || 0.7,
      category_diversity: retailerData.category_diversity || 5,
      seasonal_stability: retailerData.seasonal_stability || 0.7,
      growth_trend: retailerData.growth_trend || 0.1,
      last_order_days_ago: retailerData.last_order_days_ago || 5,
      credit_history: retailerData.credit_history || {
        previous_loans: 0,
        defaults: 0,
        on_time_payments: null
      },
      social_metrics: retailerData.social_metrics || {
        customer_reviews: 4.0,
        repeat_customer_rate: 0.6,
        referral_rate: 0.1
      },
      ...retailerData
    };
    
    const confidenceScore = confidenceScoreService.calculateConfidenceScore(simulatedRetailer);
    
    res.json({
      success: true,
      simulation_result: confidenceScore,
      input_data: simulatedRetailer
    });
    
  } catch (error) {
    console.error('Error simulating confidence score:', error);
    res.status(500).json({ error: 'Failed to simulate confidence score' });
  }
});

// Get retailer details with score
router.get('/retailer/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    
    const retailer = confidenceScoreService.getRetailerById(retailerId);
    if (!retailer) {
      return res.status(404).json({ 
        error: 'Retailer not found',
        retailer_id: retailerId 
      });
    }
    
    const confidenceScore = confidenceScoreService.calculateConfidenceScore(retailer);
    
    res.json({
      success: true,
      retailer: {
        ...retailer,
        confidence_assessment: confidenceScore
      }
    });
    
  } catch (error) {
    console.error('Error getting retailer details:', error);
    res.status(500).json({ error: 'Failed to get retailer details' });
  }
});

module.exports = router; 
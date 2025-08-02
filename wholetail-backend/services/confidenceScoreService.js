const moment = require('moment');

// Confidence score algorithm for retailer financing eligibility
// Scores range from 0-1000, with 1000 being the highest confidence

// Mock retailer data for development
const mockRetailers = [
  {
    id: 'retailer-123',
    name: 'Test Retailer Store',
    location: 'Nairobi CBD',
    business_age_months: 18,
    registration_date: '2023-01-15',
    total_orders: 284,
    total_revenue: 4850000,
    average_order_value: 17077,
    payment_success_rate: 0.96,
    return_rate: 0.04,
    geographic_risk_score: 0.85,
    category_diversity: 12,
    seasonal_stability: 0.82,
    growth_trend: 0.42, // 42% growth
    last_order_days_ago: 2,
    credit_history: {
      previous_loans: 3,
      defaults: 0,
      on_time_payments: 0.94
    },
    social_metrics: {
      customer_reviews: 4.8,
      repeat_customer_rate: 0.75,
      referral_rate: 0.18
    }
  },
  {
    id: 'retailer-1',
    name: 'Mama Jane\'s Store',
    location: 'Nairobi CBD',
    business_age_months: 24,
    registration_date: '2023-07-11',
    total_orders: 156,
    total_revenue: 450000,
    average_order_value: 2885,
    payment_success_rate: 0.94,
    return_rate: 0.05,
    geographic_risk_score: 0.8,
    category_diversity: 8,
    seasonal_stability: 0.75,
    growth_trend: 0.15, // 15% month-over-month growth
    last_order_days_ago: 3,
    credit_history: {
      previous_loans: 2,
      defaults: 0,
      on_time_payments: 0.98
    },
    social_metrics: {
      customer_reviews: 4.3,
      repeat_customer_rate: 0.68,
      referral_rate: 0.12
    }
  },
  {
    id: 'retailer-2',
    name: 'Peter\'s Electronics',
    location: 'Kisumu',
    business_age_months: 36,
    registration_date: '2022-07-11',
    total_orders: 89,
    total_revenue: 320000,
    average_order_value: 3596,
    payment_success_rate: 0.98,
    return_rate: 0.03,
    geographic_risk_score: 0.7,
    category_diversity: 3,
    seasonal_stability: 0.65,
    growth_trend: 0.08,
    last_order_days_ago: 7,
    credit_history: {
      previous_loans: 1,
      defaults: 0,
      on_time_payments: 1.0
    },
    social_metrics: {
      customer_reviews: 4.7,
      repeat_customer_rate: 0.82,
      referral_rate: 0.18
    }
  },
  {
    id: 'retailer-3',
    name: 'Grace Farm Supplies',
    location: 'Eldoret',
    business_age_months: 12,
    registration_date: '2024-07-11',
    total_orders: 45,
    total_revenue: 125000,
    average_order_value: 2778,
    payment_success_rate: 0.87,
    return_rate: 0.08,
    geographic_risk_score: 0.6,
    category_diversity: 5,
    seasonal_stability: 0.55,
    growth_trend: 0.25,
    last_order_days_ago: 12,
    credit_history: {
      previous_loans: 0,
      defaults: 0,
      on_time_payments: null
    },
    social_metrics: {
      customer_reviews: 4.1,
      repeat_customer_rate: 0.42,
      referral_rate: 0.08
    }
  }
];

// Scoring algorithm weights and parameters
const SCORING_WEIGHTS = {
  transaction_history: 0.25,    // 25% - Order volume, revenue, frequency
  payment_behavior: 0.20,       // 20% - Payment success rate, timing
  business_stability: 0.15,     // 15% - Business age, consistency
  growth_metrics: 0.15,         // 15% - Revenue growth, customer growth
  risk_factors: 0.10,           // 10% - Geographic, category risk
  credit_history: 0.10,         // 10% - Previous loans, defaults
  social_proof: 0.05            // 5% - Reviews, referrals
};

const RISK_THRESHOLDS = {
  high_confidence: 750,    // 750+ = High confidence (green)
  medium_confidence: 500,  // 500-749 = Medium confidence (yellow)
  low_confidence: 250      // 250-499 = Low confidence (orange)
  // Below 250 = Very low confidence (red)
};

// Calculate transaction history score (0-1000)
function calculateTransactionHistoryScore(retailer) {
  const {
    total_orders,
    total_revenue,
    average_order_value,
    last_order_days_ago,
    business_age_months
  } = retailer;

  // Order volume score (0-250)
  const orderVolumeScore = Math.min(250, (total_orders / business_age_months) * 10);
  
  // Revenue score (0-250)
  const revenueScore = Math.min(250, (total_revenue / business_age_months) / 1000);
  
  // Order value consistency score (0-250)
  const avgOrderScore = Math.min(250, average_order_value / 20);
  
  // Recency score (0-250) - penalize inactive retailers
  const recencyScore = Math.max(0, 250 - (last_order_days_ago * 5));

  const totalScore = orderVolumeScore + revenueScore + avgOrderScore + recencyScore;
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      order_volume: Math.round(orderVolumeScore),
      revenue: Math.round(revenueScore),
      avg_order_value: Math.round(avgOrderScore),
      recency: Math.round(recencyScore)
    }
  };
}

// Calculate payment behavior score (0-1000)
function calculatePaymentBehaviorScore(retailer) {
  const { payment_success_rate, return_rate } = retailer;

  // Payment success score (0-700)
  const paymentSuccessScore = payment_success_rate * 700;
  
  // Low return rate bonus (0-300)
  const returnRateScore = Math.max(0, (1 - return_rate) * 300);

  const totalScore = paymentSuccessScore + returnRateScore;
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      payment_success: Math.round(paymentSuccessScore),
      return_rate: Math.round(returnRateScore)
    }
  };
}

// Calculate business stability score (0-1000)
function calculateBusinessStabilityScore(retailer) {
  const { business_age_months, seasonal_stability, category_diversity } = retailer;

  // Business age score (0-400)
  const ageScore = Math.min(400, business_age_months * 10);
  
  // Seasonal stability score (0-300)
  const stabilityScore = seasonal_stability * 300;
  
  // Category diversity score (0-300)
  const diversityScore = Math.min(300, category_diversity * 30);

  const totalScore = ageScore + stabilityScore + diversityScore;
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      business_age: Math.round(ageScore),
      seasonal_stability: Math.round(stabilityScore),
      category_diversity: Math.round(diversityScore)
    }
  };
}

// Calculate growth metrics score (0-1000)
function calculateGrowthMetricsScore(retailer) {
  const { growth_trend, social_metrics } = retailer;

  // Revenue growth score (0-600)
  const growthScore = Math.min(600, growth_trend * 3000);
  
  // Customer growth score (0-400)
  const customerGrowthScore = social_metrics.repeat_customer_rate * 400;

  const totalScore = growthScore + customerGrowthScore;
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      revenue_growth: Math.round(growthScore),
      customer_retention: Math.round(customerGrowthScore)
    }
  };
}

// Calculate risk factors score (0-1000)
function calculateRiskFactorsScore(retailer) {
  const { geographic_risk_score, category_diversity } = retailer;

  // Geographic risk score (0-600)
  const geoScore = geographic_risk_score * 600;
  
  // Category concentration risk (0-400)
  const concentrationScore = Math.min(400, category_diversity * 50);

  const totalScore = geoScore + concentrationScore;
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      geographic_risk: Math.round(geoScore),
      category_concentration: Math.round(concentrationScore)
    }
  };
}

// Calculate credit history score (0-1000)
function calculateCreditHistoryScore(retailer) {
  const { credit_history } = retailer;

  if (!credit_history.on_time_payments) {
    // New business - moderate score
    return {
      score: 500,
      breakdown: {
        payment_history: 0,
        loan_history: 500,
        defaults: 500
      }
    };
  }

  // Payment history score (0-500)
  const paymentHistoryScore = credit_history.on_time_payments * 500;
  
  // Loan experience score (0-300)
  const loanExperienceScore = Math.min(300, credit_history.previous_loans * 100);
  
  // Default penalty (0-200)
  const defaultPenalty = credit_history.defaults * 100;
  const defaultScore = Math.max(0, 200 - defaultPenalty);

  const totalScore = paymentHistoryScore + loanExperienceScore + defaultScore;
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      payment_history: Math.round(paymentHistoryScore),
      loan_experience: Math.round(loanExperienceScore),
      default_penalty: Math.round(defaultScore)
    }
  };
}

// Calculate social proof score (0-1000)
function calculateSocialProofScore(retailer) {
  const { social_metrics } = retailer;

  // Customer reviews score (0-400)
  const reviewScore = (social_metrics.customer_reviews / 5) * 400;
  
  // Repeat customer score (0-400)
  const repeatCustomerScore = social_metrics.repeat_customer_rate * 400;
  
  // Referral score (0-200)
  const referralScore = social_metrics.referral_rate * 1000;

  const totalScore = reviewScore + repeatCustomerScore + Math.min(200, referralScore);
  
  return {
    score: Math.min(1000, totalScore),
    breakdown: {
      customer_reviews: Math.round(reviewScore),
      repeat_customers: Math.round(repeatCustomerScore),
      referrals: Math.round(Math.min(200, referralScore))
    }
  };
}

// Calculate overall confidence score
function calculateConfidenceScore(retailer) {
  const transactionHistory = calculateTransactionHistoryScore(retailer);
  const paymentBehavior = calculatePaymentBehaviorScore(retailer);
  const businessStability = calculateBusinessStabilityScore(retailer);
  const growthMetrics = calculateGrowthMetricsScore(retailer);
  const riskFactors = calculateRiskFactorsScore(retailer);
  const creditHistory = calculateCreditHistoryScore(retailer);
  const socialProof = calculateSocialProofScore(retailer);

  // Calculate weighted score
  const weightedScore = 
    (transactionHistory.score * SCORING_WEIGHTS.transaction_history) +
    (paymentBehavior.score * SCORING_WEIGHTS.payment_behavior) +
    (businessStability.score * SCORING_WEIGHTS.business_stability) +
    (growthMetrics.score * SCORING_WEIGHTS.growth_metrics) +
    (riskFactors.score * SCORING_WEIGHTS.risk_factors) +
    (creditHistory.score * SCORING_WEIGHTS.credit_history) +
    (socialProof.score * SCORING_WEIGHTS.social_proof);

  const finalScore = Math.round(weightedScore);

  // Determine confidence level
  let confidenceLevel = 'very_low';
  let riskLevel = 'high';
  
  if (finalScore >= RISK_THRESHOLDS.high_confidence) {
    confidenceLevel = 'high';
    riskLevel = 'low';
  } else if (finalScore >= RISK_THRESHOLDS.medium_confidence) {
    confidenceLevel = 'medium';
    riskLevel = 'medium';
  } else if (finalScore >= RISK_THRESHOLDS.low_confidence) {
    confidenceLevel = 'low';
    riskLevel = 'medium_high';
  }

  // Calculate recommended loan amount based on score
  const maxLoanPercentage = Math.min(0.8, finalScore / 1000 * 0.8);
  const recommendedLoanAmount = Math.round(retailer.total_revenue * 0.3 * maxLoanPercentage);

  return {
    retailer_id: retailer.id,
    retailer_name: retailer.name,
    confidence_score: finalScore,
    confidence_level: confidenceLevel,
    risk_level: riskLevel,
    recommended_loan_amount: recommendedLoanAmount,
    max_loan_amount: Math.round(recommendedLoanAmount * 1.5),
    calculated_at: new Date().toISOString(),
    score_breakdown: {
      transaction_history: {
        score: Math.round(transactionHistory.score * SCORING_WEIGHTS.transaction_history),
        weight: SCORING_WEIGHTS.transaction_history,
        details: transactionHistory.breakdown
      },
      payment_behavior: {
        score: Math.round(paymentBehavior.score * SCORING_WEIGHTS.payment_behavior),
        weight: SCORING_WEIGHTS.payment_behavior,
        details: paymentBehavior.breakdown
      },
      business_stability: {
        score: Math.round(businessStability.score * SCORING_WEIGHTS.business_stability),
        weight: SCORING_WEIGHTS.business_stability,
        details: businessStability.breakdown
      },
      growth_metrics: {
        score: Math.round(growthMetrics.score * SCORING_WEIGHTS.growth_metrics),
        weight: SCORING_WEIGHTS.growth_metrics,
        details: growthMetrics.breakdown
      },
      risk_factors: {
        score: Math.round(riskFactors.score * SCORING_WEIGHTS.risk_factors),
        weight: SCORING_WEIGHTS.risk_factors,
        details: riskFactors.breakdown
      },
      credit_history: {
        score: Math.round(creditHistory.score * SCORING_WEIGHTS.credit_history),
        weight: SCORING_WEIGHTS.credit_history,
        details: creditHistory.breakdown
      },
      social_proof: {
        score: Math.round(socialProof.score * SCORING_WEIGHTS.social_proof),
        weight: SCORING_WEIGHTS.social_proof,
        details: socialProof.breakdown
      }
    },
    recommendations: generateRecommendations(finalScore, retailer),
    next_review_date: moment().add(30, 'days').toISOString()
  };
}

// Generate recommendations based on score
function generateRecommendations(score, retailer) {
  const recommendations = [];

  if (score < RISK_THRESHOLDS.low_confidence) {
    recommendations.push({
      type: 'critical',
      message: 'Increase transaction volume and payment consistency',
      action: 'Focus on regular orders and timely payments'
    });
  }

  if (retailer.payment_success_rate < 0.9) {
    recommendations.push({
      type: 'warning',
      message: 'Improve payment success rate',
      action: 'Review payment methods and resolve failed transactions'
    });
  }

  if (retailer.last_order_days_ago > 14) {
    recommendations.push({
      type: 'info',
      message: 'Maintain regular ordering activity',
      action: 'Place orders more frequently to improve score'
    });
  }

  if (retailer.business_age_months < 12) {
    recommendations.push({
      type: 'info',
      message: 'Build business history',
      action: 'Continue operations to establish track record'
    });
  }

  if (retailer.category_diversity < 5) {
    recommendations.push({
      type: 'suggestion',
      message: 'Diversify product categories',
      action: 'Consider expanding product range to reduce risk'
    });
  }

  if (score >= RISK_THRESHOLDS.high_confidence) {
    recommendations.push({
      type: 'success',
      message: 'Excellent creditworthiness',
      action: 'Eligible for premium loan terms and higher amounts'
    });
  }

  return recommendations;
}

// Get retailer by ID
function getRetailerById(retailerId) {
  return mockRetailers.find(r => r.id === retailerId);
}

// Get all retailers
function getAllRetailers() {
  return mockRetailers;
}

// Calculate confidence scores for all retailers
function calculateAllConfidenceScores() {
  return mockRetailers.map(retailer => calculateConfidenceScore(retailer));
}

// Get confidence score analytics
function getConfidenceScoreAnalytics() {
  const scores = calculateAllConfidenceScores();
  
  const analytics = {
    total_retailers: scores.length,
    average_score: Math.round(scores.reduce((sum, s) => sum + s.confidence_score, 0) / scores.length),
    score_distribution: {
      high_confidence: scores.filter(s => s.confidence_score >= RISK_THRESHOLDS.high_confidence).length,
      medium_confidence: scores.filter(s => s.confidence_score >= RISK_THRESHOLDS.medium_confidence && s.confidence_score < RISK_THRESHOLDS.high_confidence).length,
      low_confidence: scores.filter(s => s.confidence_score >= RISK_THRESHOLDS.low_confidence && s.confidence_score < RISK_THRESHOLDS.medium_confidence).length,
      very_low_confidence: scores.filter(s => s.confidence_score < RISK_THRESHOLDS.low_confidence).length
    },
    total_recommended_loans: scores.reduce((sum, s) => sum + s.recommended_loan_amount, 0),
    risk_level_distribution: {
      low: scores.filter(s => s.risk_level === 'low').length,
      medium: scores.filter(s => s.risk_level === 'medium').length,
      medium_high: scores.filter(s => s.risk_level === 'medium_high').length,
      high: scores.filter(s => s.risk_level === 'high').length
    }
  };

  return analytics;
}

// Simulate score changes over time
function simulateScoreHistory(retailerId, months = 12) {
  const retailer = getRetailerById(retailerId);
  if (!retailer) return null;

  const history = [];
  const currentDate = moment();

  for (let i = months; i >= 0; i--) {
    const date = currentDate.clone().subtract(i, 'months');
    
    // Simulate historical data variations
    const ageAdjustment = i * 0.8; // Business was younger
    const volumeAdjustment = 1 - (i * 0.05); // Lower volume in the past
    const stabilityAdjustment = Math.max(0.3, 1 - (i * 0.03)); // Less stability in the past

    const historicalRetailer = {
      ...retailer,
      business_age_months: Math.max(1, retailer.business_age_months - i),
      total_orders: Math.round(retailer.total_orders * volumeAdjustment),
      total_revenue: Math.round(retailer.total_revenue * volumeAdjustment),
      seasonal_stability: retailer.seasonal_stability * stabilityAdjustment,
      payment_success_rate: Math.max(0.7, retailer.payment_success_rate - (i * 0.01)),
      growth_trend: retailer.growth_trend * (1 + (i * 0.02)) // Higher growth rate in early months
    };

    const score = calculateConfidenceScore(historicalRetailer);
    
    history.push({
      date: date.format('YYYY-MM-DD'),
      confidence_score: score.confidence_score,
      confidence_level: score.confidence_level,
      recommended_loan_amount: score.recommended_loan_amount
    });
  }

  return history;
}

module.exports = {
  calculateConfidenceScore,
  calculateAllConfidenceScores,
  getRetailerById,
  getAllRetailers,
  getConfidenceScoreAnalytics,
  simulateScoreHistory,
  RISK_THRESHOLDS,
  SCORING_WEIGHTS
}; 
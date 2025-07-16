class AudienceSegmentationService {
  constructor() {
    this.segments = new Map();
    this.userProfiles = new Map();
    this.behaviorData = new Map();
    console.log('🎯 ML Audience Segmentation Service initialized');
    
    // Initialize base segments
    this.initializeBaseSegments();
    
    // Update segments every hour - use arrow function to preserve 'this' context
    setInterval(() => this.updateSegments(), 3600000);
  }

  // Add the missing updateSegments method
  updateSegments() {
    try {
      console.log('🔄 Updating audience segments...');
      
      // Recalculate segment sizes based on current user profiles
      for (const [segmentId, segment] of this.segments) {
        let matchingUsers = 0;
        let totalEngagement = 0;
        
        for (const [userId, profile] of this.userProfiles) {
          const matchingSegments = profile.predicted_segments.filter(ps => ps.segment_id === segmentId);
          if (matchingSegments.length > 0) {
            matchingUsers++;
            totalEngagement += profile.engagement_metrics?.overall_score || 0.5;
          }
        }
        
        // Update segment statistics
        segment.size = matchingUsers;
        segment.engagement_rate = matchingUsers > 0 ? totalEngagement / matchingUsers : segment.engagement_rate;
        segment.last_updated = new Date();
        
        this.segments.set(segmentId, segment);
      }
      
      console.log(`✅ Updated ${this.segments.size} audience segments`);
    } catch (error) {
      console.error('❌ Error updating segments:', error);
    }
  }

  initializeBaseSegments() {
    const baseSegments = [
      {
        id: 'high_value_retailers',
        name: 'High Value Retailers',
        description: 'Retailers with high order values and frequent purchases',
        criteria: {
          avgOrderValue: { min: 500 },
          purchaseFrequency: { min: 10 },
          totalSpend: { min: 5000 }
        },
        size: 1247,
        engagement_rate: 0.85
      },
      {
        id: 'price_sensitive',
        name: 'Price Sensitive Buyers',
        description: 'Retailers who primarily purchase discounted items',
        criteria: {
          discountUsage: { min: 0.7 },
          avgOrderValue: { max: 200 },
          priceComparison: { min: 0.8 }
        },
        size: 3421,
        engagement_rate: 0.62
      },
      {
        id: 'organic_focused',
        name: 'Organic Product Enthusiasts',
        description: 'Retailers specializing in organic and sustainable products',
        criteria: {
          organicPurchaseRatio: { min: 0.6 },
          sustainabilityScore: { min: 0.7 }
        },
        size: 892,
        engagement_rate: 0.78
      },
      {
        id: 'tech_adopters',
        name: 'Technology Early Adopters',
        description: 'Retailers who embrace new features and digital tools',
        criteria: {
          appUsageFrequency: { min: 0.8 },
          featureAdoptionRate: { min: 0.7 },
          digitalPaymentUsage: { min: 0.9 }
        },
        size: 567,
        engagement_rate: 0.92
      },
      {
        id: 'location_nairobi',
        name: 'Nairobi Region',
        description: 'Retailers operating in Nairobi and surrounding areas',
        criteria: {
          location: { regions: ['nairobi', 'kiambu', 'machakos'] }
        },
        size: 2156,
        engagement_rate: 0.71
      },
      {
        id: 'seasonal_buyers',
        name: 'Seasonal Buyers',
        description: 'Retailers with strong seasonal purchase patterns',
        criteria: {
          seasonalVariance: { min: 0.6 },
          peakSeasonMultiplier: { min: 2.0 }
        },
        size: 1834,
        engagement_rate: 0.58
      }
    ];

    baseSegments.forEach(segment => {
      this.segments.set(segment.id, segment);
    });
  }

  // Analyze user behavior and create profile
  analyzeUserBehavior(userId, behaviorData) {
    const profile = {
      user_id: userId,
      last_updated: new Date(),
      behavioral_scores: this.calculateBehavioralScores(behaviorData),
      purchase_patterns: this.analyzePurchasePatterns(behaviorData.purchases || []),
      engagement_metrics: this.calculateEngagementMetrics(behaviorData),
      preferences: this.extractPreferences(behaviorData),
      predicted_segments: []
    };

    // Calculate segment probabilities using mock ML algorithms
    profile.predicted_segments = this.predictSegments(profile);
    
    this.userProfiles.set(userId, profile);
    return profile;
  }

  calculateBehavioralScores(data) {
    const purchases = data.purchases || [];
    const interactions = data.interactions || [];
    const sessions = data.sessions || [];

    return {
      purchase_propensity: this.calculatePurchasePropensity(purchases, interactions),
      price_sensitivity: this.calculatePriceSensitivity(purchases),
      brand_loyalty: this.calculateBrandLoyalty(purchases),
      category_affinity: this.calculateCategoryAffinity(purchases),
      digital_engagement: this.calculateDigitalEngagement(sessions, interactions),
      seasonal_behavior: this.calculateSeasonalBehavior(purchases),
      risk_tolerance: this.calculateRiskTolerance(data)
    };
  }

  calculatePurchasePropensity(purchases, interactions) {
    if (purchases.length === 0) return 0.1;
    
    const conversionRate = purchases.length / Math.max(interactions.length, 1);
    const avgDaysBetweenPurchases = this.calculateAvgDaysBetweenPurchases(purchases);
    const recentActivity = this.getRecentActivityScore(purchases);
    
    return Math.min(1.0, (conversionRate * 0.4) + (1 / avgDaysBetweenPurchases * 0.3) + (recentActivity * 0.3));
  }

  calculatePriceSensitivity(purchases) {
    if (purchases.length === 0) return 0.5;
    
    const discountedPurchases = purchases.filter(p => p.discount > 0).length;
    const discountUsageRate = discountedPurchases / purchases.length;
    
    const priceRangeVariation = this.calculatePriceRangeVariation(purchases);
    
    return Math.min(1.0, discountUsageRate * 0.6 + (1 - priceRangeVariation) * 0.4);
  }

  calculateBrandLoyalty(purchases) {
    if (purchases.length === 0) return 0.5;
    
    const brandCounts = {};
    purchases.forEach(p => {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });
    
    const brands = Object.keys(brandCounts);
    const topBrandCount = Math.max(...Object.values(brandCounts));
    
    return topBrandCount / purchases.length;
  }

  calculateCategoryAffinity(purchases) {
    const categoryScores = {};
    
    purchases.forEach(purchase => {
      const category = purchase.category || 'other';
      if (!categoryScores[category]) {
        categoryScores[category] = { count: 0, totalValue: 0 };
      }
      categoryScores[category].count++;
      categoryScores[category].totalValue += purchase.amount || 0;
    });

    // Convert to normalized scores
    const totalPurchases = purchases.length;
    const affinityScores = {};
    
    Object.entries(categoryScores).forEach(([category, data]) => {
      affinityScores[category] = {
        frequency_score: data.count / totalPurchases,
        value_score: data.totalValue / data.count,
        affinity_index: (data.count / totalPurchases) * Math.log(data.totalValue / data.count + 1)
      };
    });

    return affinityScores;
  }

  calculateDigitalEngagement(sessions, interactions) {
    const avgSessionDuration = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length : 0;
    
    const featureUsage = this.calculateFeatureUsage(interactions);
    const mobileAppUsage = sessions.filter(s => s.platform === 'mobile').length / Math.max(sessions.length, 1);
    
    return {
      session_engagement: Math.min(1.0, avgSessionDuration / 600), // Normalize to 10 minutes
      feature_adoption: featureUsage,
      mobile_preference: mobileAppUsage,
      overall_score: (avgSessionDuration / 600 * 0.4) + (featureUsage * 0.3) + (mobileAppUsage * 0.3)
    };
  }

  calculateSeasonalBehavior(purchases) {
    const monthlyPurchases = Array(12).fill(0);
    
    purchases.forEach(purchase => {
      const month = new Date(purchase.date).getMonth();
      monthlyPurchases[month]++;
    });

    const avgMonthly = monthlyPurchases.reduce((a, b) => a + b, 0) / 12;
    const variance = monthlyPurchases.reduce((sum, count) => sum + Math.pow(count - avgMonthly, 2), 0) / 12;
    
    return {
      seasonal_variance: Math.sqrt(variance) / avgMonthly,
      peak_months: monthlyPurchases.map((count, index) => ({ month: index, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
      seasonal_index: Math.sqrt(variance) / Math.max(avgMonthly, 1)
    };
  }

  calculateRiskTolerance(data) {
    // Analyze willingness to try new products, payment methods, etc.
    const newProductTrial = (data.new_products_tried || 0) / Math.max(data.total_products_viewed || 1, 1);
    const paymentMethodDiversity = (data.payment_methods_used || []).length / 4; // Normalize to 4 methods
    const earlyFeatureAdoption = data.beta_features_used || 0;
    
    return Math.min(1.0, (newProductTrial * 0.4) + (paymentMethodDiversity * 0.3) + (earlyFeatureAdoption * 0.3));
  }

  // Predict which segments a user belongs to
  predictSegments(profile) {
    const segmentProbabilities = [];
    
    for (const [segmentId, segment] of this.segments) {
      const probability = this.calculateSegmentProbability(profile, segment);
      
      if (probability > 0.3) { // Threshold for segment inclusion
        segmentProbabilities.push({
          segment_id: segmentId,
          segment_name: segment.name,
          probability: probability,
          confidence: this.calculateConfidence(profile, segment, probability),
          matching_criteria: this.getMatchingCriteria(profile, segment)
        });
      }
    }

    return segmentProbabilities.sort((a, b) => b.probability - a.probability);
  }

  calculateSegmentProbability(profile, segment) {
    const scores = profile.behavioral_scores;
    let totalScore = 0;
    let criteriaCount = 0;

    // High Value Retailers
    if (segment.id === 'high_value_retailers') {
      totalScore += scores.purchase_propensity * 0.4;
      totalScore += (1 - scores.price_sensitivity) * 0.3;
      totalScore += scores.brand_loyalty * 0.3;
      criteriaCount = 3;
    }
    
    // Price Sensitive
    else if (segment.id === 'price_sensitive') {
      totalScore += scores.price_sensitivity * 0.6;
      totalScore += scores.purchase_propensity * 0.2;
      totalScore += (1 - scores.brand_loyalty) * 0.2;
      criteriaCount = 3;
    }
    
    // Organic Focused
    else if (segment.id === 'organic_focused') {
      const organicAffinity = profile.preferences.organic_preference || 0;
      totalScore += organicAffinity * 0.7;
      totalScore += scores.brand_loyalty * 0.3;
      criteriaCount = 2;
    }
    
    // Tech Adopters
    else if (segment.id === 'tech_adopters') {
      totalScore += scores.digital_engagement.overall_score * 0.5;
      totalScore += scores.risk_tolerance * 0.3;
      totalScore += scores.digital_engagement.feature_adoption * 0.2;
      criteriaCount = 3;
    }
    
    // Location-based (simplified)
    else if (segment.id === 'location_nairobi') {
      const locationMatch = profile.location === 'nairobi' ? 1.0 : 0.0;
      totalScore += locationMatch;
      criteriaCount = 1;
    }
    
    // Seasonal Buyers
    else if (segment.id === 'seasonal_buyers') {
      totalScore += scores.seasonal_behavior.seasonal_index * 0.8;
      totalScore += scores.purchase_propensity * 0.2;
      criteriaCount = 2;
    }

    return criteriaCount > 0 ? totalScore / criteriaCount : 0;
  }

  calculateConfidence(profile, segment, probability) {
    const dataPoints = this.countDataPoints(profile);
    const minDataPoints = 50; // Minimum for high confidence
    
    const dataConfidence = Math.min(1.0, dataPoints / minDataPoints);
    const probabilityConfidence = probability > 0.7 ? 1.0 : probability / 0.7;
    
    return (dataConfidence * 0.6) + (probabilityConfidence * 0.4);
  }

  getMatchingCriteria(profile, segment) {
    const matches = [];
    const scores = profile.behavioral_scores;
    
    if (segment.id === 'high_value_retailers') {
      if (scores.purchase_propensity > 0.7) matches.push('High purchase propensity');
      if (scores.price_sensitivity < 0.3) matches.push('Low price sensitivity');
      if (scores.brand_loyalty > 0.6) matches.push('Strong brand loyalty');
    }
    
    return matches;
  }

  // Get targeting recommendations for a campaign
  getTargetingRecommendations(campaignType, productCategory, budget) {
    const recommendations = {
      recommended_segments: [],
      targeting_strategy: this.determineTargetingStrategy(campaignType, budget),
      expected_reach: 0,
      estimated_engagement: 0,
      optimization_tips: []
    };

    // Analyze segments for relevance
    for (const [segmentId, segment] of this.segments) {
      const relevanceScore = this.calculateSegmentRelevance(segment, campaignType, productCategory);
      const costEfficiency = this.calculateCostEfficiency(segment, budget);
      
      if (relevanceScore > 0.4) {
        recommendations.recommended_segments.push({
          segment_id: segmentId,
          segment_name: segment.name,
          size: segment.size,
          relevance_score: relevanceScore,
          cost_efficiency: costEfficiency,
          estimated_engagement: segment.engagement_rate * relevanceScore,
          suggested_budget_allocation: this.suggestBudgetAllocation(segment, budget, relevanceScore)
        });
      }
    }

    // Sort by combined score
    recommendations.recommended_segments.sort((a, b) => 
      (b.relevance_score * b.cost_efficiency) - (a.relevance_score * a.cost_efficiency)
    );

    recommendations.expected_reach = recommendations.recommended_segments
      .reduce((sum, seg) => sum + seg.size, 0);
    
    recommendations.estimated_engagement = recommendations.recommended_segments
      .reduce((sum, seg) => sum + (seg.estimated_engagement * seg.size), 0) / recommendations.expected_reach;

    recommendations.optimization_tips = this.generateOptimizationTips(recommendations);

    return recommendations;
  }

  calculateSegmentRelevance(segment, campaignType, productCategory) {
    let relevance = 0.5; // Base relevance
    
    // Campaign type matching
    if (campaignType === 'premium_product' && segment.id === 'high_value_retailers') relevance += 0.4;
    if (campaignType === 'discount_promotion' && segment.id === 'price_sensitive') relevance += 0.4;
    if (campaignType === 'organic_products' && segment.id === 'organic_focused') relevance += 0.4;
    if (campaignType === 'mobile_app' && segment.id === 'tech_adopters') relevance += 0.3;
    
    // Product category matching
    if (productCategory === 'organic' && segment.id === 'organic_focused') relevance += 0.2;
    if (productCategory === 'premium' && segment.id === 'high_value_retailers') relevance += 0.2;
    
    return Math.min(1.0, relevance);
  }

  calculateCostEfficiency(segment, budget) {
    const costPerUser = budget / segment.size;
    const engagementValue = segment.engagement_rate * 100; // Convert to monetary value
    
    return Math.min(1.0, engagementValue / Math.max(costPerUser, 1));
  }

  suggestBudgetAllocation(segment, totalBudget, relevanceScore) {
    const baseAllocation = totalBudget / 6; // Assume 6 segments max
    return baseAllocation * relevanceScore;
  }

  generateOptimizationTips(recommendations) {
    const tips = [];
    
    if (recommendations.recommended_segments.length > 5) {
      tips.push('Consider focusing on top 3-5 segments for better budget efficiency');
    }
    
    if (recommendations.estimated_engagement < 0.5) {
      tips.push('Low estimated engagement - consider adjusting targeting criteria or creative approach');
    }
    
    const hasHighValueSegment = recommendations.recommended_segments
      .some(seg => seg.segment_id === 'high_value_retailers');
    
    if (!hasHighValueSegment) {
      tips.push('Consider including high-value retailers for better ROI');
    }
    
    return tips;
  }

  // Real-time segment updates based on new user behavior
  updateUserSegments(userId, newBehaviorData) {
    const existingProfile = this.userProfiles.get(userId);
    
    if (existingProfile) {
      // Merge new behavior data
      const updatedBehaviorData = this.mergeBehaviorData(existingProfile, newBehaviorData);
      const updatedProfile = this.analyzeUserBehavior(userId, updatedBehaviorData);
      
      // Check for segment changes
      const segmentChanges = this.detectSegmentChanges(existingProfile, updatedProfile);
      
      if (segmentChanges.length > 0) {
        console.log(`🎯 Segment changes detected for user ${userId}:`, segmentChanges);
        return { profile: updatedProfile, changes: segmentChanges };
      }
    }
    
    return { profile: this.analyzeUserBehavior(userId, newBehaviorData), changes: [] };
  }

  detectSegmentChanges(oldProfile, newProfile) {
    const changes = [];
    const oldSegments = new Set(oldProfile.predicted_segments.map(s => s.segment_id));
    const newSegments = new Set(newProfile.predicted_segments.map(s => s.segment_id));
    
    // Detect new segments
    for (const segment of newSegments) {
      if (!oldSegments.has(segment)) {
        changes.push({ type: 'added', segment_id: segment });
      }
    }
    
    // Detect removed segments
    for (const segment of oldSegments) {
      if (!newSegments.has(segment)) {
        changes.push({ type: 'removed', segment_id: segment });
      }
    }
    
    return changes;
  }

  // Helper methods
  calculateAvgDaysBetweenPurchases(purchases) {
    if (purchases.length < 2) return 30; // Default
    
    purchases.sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalDays = 0;
    
    for (let i = 1; i < purchases.length; i++) {
      const daysDiff = (new Date(purchases[i].date) - new Date(purchases[i-1].date)) / (1000 * 60 * 60 * 24);
      totalDays += daysDiff;
    }
    
    return totalDays / (purchases.length - 1);
  }

  getRecentActivityScore(purchases) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentPurchases = purchases.filter(p => new Date(p.date) > thirtyDaysAgo);
    
    return Math.min(1.0, recentPurchases.length / 5); // Normalize to 5 purchases per month
  }

  calculatePriceRangeVariation(purchases) {
    if (purchases.length === 0) return 0;
    
    const amounts = purchases.map(p => p.amount || 0);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    
    return max > 0 ? (max - min) / max : 0;
  }

  calculateFeatureUsage(interactions) {
    const features = ['search', 'filter', 'wishlist', 'compare', 'review', 'share'];
    const usedFeatures = new Set(interactions.map(i => i.feature).filter(f => features.includes(f)));
    
    return usedFeatures.size / features.length;
  }

  countDataPoints(profile) {
    let count = 0;
    count += (profile.purchase_patterns?.total_purchases || 0);
    count += (profile.engagement_metrics?.total_sessions || 0);
    count += Object.keys(profile.behavioral_scores || {}).length * 10;
    
    return count;
  }

  mergeBehaviorData(existingProfile, newData) {
    // Simple merge - in production this would be more sophisticated
    return {
      ...existingProfile,
      ...newData,
      purchases: [...(existingProfile.purchases || []), ...(newData.purchases || [])],
      interactions: [...(existingProfile.interactions || []), ...(newData.interactions || [])],
      sessions: [...(existingProfile.sessions || []), ...(newData.sessions || [])]
    };
  }

  extractPreferences(data) {
    // Extract user preferences from behavior data
    const preferences = {};
    
    if (data.purchases) {
      const organicPurchases = data.purchases.filter(p => p.category === 'organic').length;
      preferences.organic_preference = organicPurchases / Math.max(data.purchases.length, 1);
    }
    
    return preferences;
  }

  // Get segment insights for dashboard
  getSegmentInsights() {
    const insights = [];
    
    for (const [segmentId, segment] of this.segments) {
      insights.push({
        segment_id: segmentId,
        name: segment.name,
        size: segment.size,
        engagement_rate: segment.engagement_rate,
        growth_trend: this.calculateGrowthTrend(segmentId),
        top_characteristics: this.getTopCharacteristics(segment),
        recommended_campaigns: this.getRecommendedCampaigns(segment)
      });
    }
    
    return insights;
  }

  calculateGrowthTrend(segmentId) {
    // Mock growth calculation
    const growthRates = {
      'high_value_retailers': 0.12,
      'price_sensitive': -0.03,
      'organic_focused': 0.28,
      'tech_adopters': 0.35,
      'location_nairobi': 0.08,
      'seasonal_buyers': 0.05
    };
    
    return growthRates[segmentId] || 0;
  }

  getTopCharacteristics(segment) {
    // Return top 3 characteristics for each segment
    const characteristics = {
      'high_value_retailers': ['High order values ($500+)', 'Frequent purchases (10+/month)', 'Premium brand preference'],
      'price_sensitive': ['Discount usage (70%+)', 'Price comparison behavior', 'Lower order values (<$200)'],
      'organic_focused': ['60%+ organic purchases', 'Sustainability focused', 'Premium willingness'],
      'tech_adopters': ['High app usage', 'Feature early adoption', 'Digital payment preference'],
      'location_nairobi': ['Nairobi metropolitan area', 'Urban retail focus', 'Higher delivery frequency'],
      'seasonal_buyers': ['Strong seasonal patterns', '2x peak season multiplier', 'Holiday-driven purchases']
    };
    
    return characteristics[segment.id] || [];
  }

  getRecommendedCampaigns(segment) {
    const campaigns = {
      'high_value_retailers': ['Premium product launches', 'VIP promotions', 'Bulk order incentives'],
      'price_sensitive': ['Discount campaigns', 'Flash sales', 'Bundle offers'],
      'organic_focused': ['Organic product promotions', 'Sustainability campaigns', 'Farm-to-table messaging'],
      'tech_adopters': ['App feature announcements', 'Digital-first campaigns', 'Beta program invitations'],
      'location_nairobi': ['Local delivery promotions', 'Regional product highlights', 'City-specific offers'],
      'seasonal_buyers': ['Holiday campaigns', 'Seasonal product launches', 'Pre-season promotions']
    };
    
    return campaigns[segment.id] || [];
  }
}

module.exports = new AudienceSegmentationService(); 
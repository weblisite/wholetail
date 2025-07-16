class ABTestingService {
  constructor() {
    this.activeTests = new Map();
    this.testResults = new Map();
    this.testHistory = [];
    this.minSampleSize = 100; // Minimum sample size for statistical significance
    this.significanceLevel = 0.05; // 95% confidence level
    console.log('🧪 A/B Testing Service initialized');
  }

  // Create a new A/B test
  createABTest(config) {
    const test = {
      id: `test_${Date.now()}`,
      name: config.name,
      description: config.description || '',
      campaign_id: config.campaign_id,
      test_type: config.test_type, // 'creative', 'targeting', 'timing', 'pricing'
      
      // Test configuration
      variants: config.variants.map((variant, index) => ({
        id: `variant_${index}`,
        name: variant.name,
        description: variant.description,
        traffic_allocation: variant.traffic_allocation || (1 / config.variants.length),
        content: variant.content,
        targeting: variant.targeting || {},
        timing: variant.timing || {},
        pricing: variant.pricing || {}
      })),
      
      // Test parameters
      traffic_split: config.traffic_split || 'equal',
      duration: config.duration || 7, // days
      primary_metric: config.primary_metric || 'conversion_rate',
      secondary_metrics: config.secondary_metrics || ['click_rate', 'cost_per_conversion'],
      
      // Test state
      status: 'draft',
      started_at: null,
      ended_at: null,
      created_at: new Date(),
      created_by: config.created_by,
      
      // Results tracking
      variant_results: new Map(),
      statistical_significance: null,
      winner: null,
      confidence_level: null,
      
      // Settings
      auto_optimize: config.auto_optimize || false,
      min_sample_size: config.min_sample_size || this.minSampleSize,
      significance_threshold: config.significance_threshold || this.significanceLevel
    };

    // Initialize variant results
    test.variants.forEach(variant => {
      test.variant_results.set(variant.id, {
        variant_id: variant.id,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        cost: 0,
        users: new Set(),
        events: []
      });
    });

    this.activeTests.set(test.id, test);
    console.log(`🧪 Created A/B test: ${test.name} (${test.id})`);
    
    return test;
  }

  // Start an A/B test
  startTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'draft') {
      throw new Error('Test can only be started from draft status');
    }

    // Validate test configuration
    this.validateTestConfig(test);

    test.status = 'running';
    test.started_at = new Date();
    test.ended_at = new Date(Date.now() + test.duration * 24 * 60 * 60 * 1000);

    console.log(`🚀 Started A/B test: ${test.name}`);
    
    // Schedule automatic analysis
    setTimeout(() => {
      this.analyzeTest(testId);
    }, 60000); // Check every minute

    return test;
  }

  // Assign user to test variant
  assignUserToVariant(testId, userId, userAttributes = {}) {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user already assigned
    for (const [variantId, results] of test.variant_results) {
      if (results.users.has(userId)) {
        return test.variants.find(v => v.id === variantId);
      }
    }

    // Assign to variant based on targeting and traffic allocation
    const eligibleVariants = test.variants.filter(variant => 
      this.isUserEligible(userId, variant.targeting, userAttributes)
    );

    if (eligibleVariants.length === 0) {
      return null;
    }

    // Use consistent hashing for stable assignment
    const assignedVariant = this.consistentHash(userId, eligibleVariants, test.traffic_split);
    
    // Record assignment
    const results = test.variant_results.get(assignedVariant.id);
    results.users.add(userId);
    
    this.recordEvent(testId, assignedVariant.id, 'assignment', {
      user_id: userId,
      timestamp: new Date(),
      user_attributes: userAttributes
    });

    console.log(`👤 Assigned user ${userId} to variant ${assignedVariant.name} in test ${test.name}`);
    
    return assignedVariant;
  }

  // Record test events (impressions, clicks, conversions)
  recordEvent(testId, variantId, eventType, data) {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') {
      return;
    }

    const results = test.variant_results.get(variantId);
    if (!results) {
      return;
    }

    const event = {
      type: eventType,
      timestamp: new Date(),
      data: data
    };

    results.events.push(event);

    // Update metrics
    switch (eventType) {
      case 'impression':
        results.impressions++;
        break;
      case 'click':
        results.clicks++;
        break;
      case 'conversion':
        results.conversions++;
        results.revenue += data.revenue || 0;
        break;
      case 'cost':
        results.cost += data.amount || 0;
        break;
    }

    // Check for statistical significance if enough data
    if (results.impressions >= test.min_sample_size) {
      this.analyzeTest(testId);
    }
  }

  // Analyze test results and statistical significance
  analyzeTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      return null;
    }

    const analysis = {
      test_id: testId,
      analyzed_at: new Date(),
      variant_performance: [],
      statistical_significance: false,
      confidence_level: 0,
      winner: null,
      recommendation: 'continue',
      insights: []
    };

    // Calculate performance metrics for each variant
    test.variants.forEach(variant => {
      const results = test.variant_results.get(variant.id);
      const performance = this.calculateVariantMetrics(results);
      
      analysis.variant_performance.push({
        variant_id: variant.id,
        variant_name: variant.name,
        sample_size: results.impressions,
        ...performance
      });
    });

    // Perform statistical analysis
    if (analysis.variant_performance.every(v => v.sample_size >= test.min_sample_size)) {
      const statResults = this.performStatisticalAnalysis(analysis.variant_performance, test.primary_metric);
      
      analysis.statistical_significance = statResults.is_significant;
      analysis.confidence_level = statResults.confidence_level;
      analysis.p_value = statResults.p_value;
      
      if (statResults.is_significant) {
        analysis.winner = statResults.winner;
        analysis.recommendation = 'implement_winner';
        analysis.insights.push(`${statResults.winner.variant_name} is statistically significant winner`);
        
        if (test.auto_optimize) {
          this.implementWinner(testId, statResults.winner);
        }
      }
    }

    // Add insights
    analysis.insights = analysis.insights.concat(this.generateInsights(analysis.variant_performance));

    test.statistical_significance = analysis.statistical_significance;
    test.winner = analysis.winner;
    test.confidence_level = analysis.confidence_level;

    this.testResults.set(testId, analysis);
    
    console.log(`📊 Analyzed test ${test.name}: ${analysis.statistical_significance ? 'Significant' : 'Not significant'}`);
    
    return analysis;
  }

  calculateVariantMetrics(results) {
    const metrics = {
      impressions: results.impressions,
      clicks: results.clicks,
      conversions: results.conversions,
      revenue: results.revenue,
      cost: results.cost,
      unique_users: results.users.size
    };

    // Calculate rates
    metrics.click_rate = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.conversion_rate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
    metrics.cost_per_click = metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0;
    metrics.cost_per_conversion = metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0;
    metrics.revenue_per_conversion = metrics.conversions > 0 ? metrics.revenue / metrics.conversions : 0;
    metrics.return_on_ad_spend = metrics.cost > 0 ? (metrics.revenue / metrics.cost) * 100 : 0;

    return metrics;
  }

  performStatisticalAnalysis(variants, primaryMetric) {
    if (variants.length < 2) {
      return { is_significant: false, confidence_level: 0 };
    }

    // For simplicity, comparing first two variants
    const control = variants[0];
    const treatment = variants[1];

    // Z-test for conversion rate comparison
    const { pValue, isSignificant } = this.zTest(
      control[primaryMetric],
      treatment[primaryMetric],
      control.sample_size,
      treatment.sample_size
    );

    const winner = treatment[primaryMetric] > control[primaryMetric] ? treatment : control;
    const improvement = Math.abs(treatment[primaryMetric] - control[primaryMetric]);
    const improvementPercent = control[primaryMetric] > 0 ? 
      (improvement / control[primaryMetric]) * 100 : 0;

    return {
      is_significant: isSignificant,
      p_value: pValue,
      confidence_level: (1 - pValue) * 100,
      winner: isSignificant ? {
        variant_id: winner.variant_id,
        variant_name: winner.variant_name,
        improvement: improvement,
        improvement_percent: improvementPercent
      } : null
    };
  }

  zTest(controlRate, treatmentRate, controlSize, treatmentSize) {
    const controlConversions = (controlRate / 100) * controlSize;
    const treatmentConversions = (treatmentRate / 100) * treatmentSize;
    
    const pooledRate = (controlConversions + treatmentConversions) / (controlSize + treatmentSize);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSize + 1/treatmentSize));
    
    const zScore = Math.abs((treatmentRate/100 - controlRate/100) / standardError);
    const pValue = 2 * (1 - this.normalCDF(zScore)); // Two-tailed test
    
    return {
      pValue: pValue,
      isSignificant: pValue < this.significanceLevel
    };
  }

  normalCDF(x) {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  erf(x) {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  generateInsights(variants) {
    const insights = [];
    
    // Sort by primary metric
    const sorted = [...variants].sort((a, b) => b.conversion_rate - a.conversion_rate);
    
    if (sorted.length >= 2) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const improvement = best.conversion_rate - worst.conversion_rate;
      
      if (improvement > 5) { // >5% improvement
        insights.push(`Best variant shows ${improvement.toFixed(1)}% higher conversion rate`);
      }
      
      if (best.cost_per_conversion < worst.cost_per_conversion * 0.8) {
        insights.push(`Best variant has ${((1 - best.cost_per_conversion / worst.cost_per_conversion) * 100).toFixed(1)}% lower cost per conversion`);
      }
    }

    // Check for statistical power
    const totalSampleSize = variants.reduce((sum, v) => sum + v.sample_size, 0);
    if (totalSampleSize < this.minSampleSize * variants.length) {
      insights.push('Increase sample size for more reliable results');
    }

    return insights;
  }

  // Implement winning variant
  implementWinner(testId, winner) {
    const test = this.activeTests.get(testId);
    if (!test) {
      return;
    }

    test.status = 'completed';
    test.ended_at = new Date();
    
    console.log(`🏆 Implementing winner: ${winner.variant_name} for test ${test.name}`);
    
    // In real implementation, this would update the main campaign
    // with the winning variant's configuration
    
    this.testHistory.push({
      test_id: testId,
      name: test.name,
      winner: winner,
      implemented_at: new Date(),
      improvement: winner.improvement_percent
    });
  }

  // Consistent hashing for user assignment
  consistentHash(userId, variants, splitType) {
    const hash = this.hashCode(userId.toString());
    const normalizedHash = Math.abs(hash) / Math.pow(2, 31);
    
    if (splitType === 'equal') {
      const variantIndex = Math.floor(normalizedHash * variants.length);
      return variants[variantIndex];
    }
    
    // Weighted assignment based on traffic allocation
    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.traffic_allocation;
      if (normalizedHash <= cumulativeWeight) {
        return variant;
      }
    }
    
    return variants[variants.length - 1]; // Fallback
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  isUserEligible(userId, targeting, userAttributes) {
    if (!targeting || Object.keys(targeting).length === 0) {
      return true;
    }

    // Check targeting criteria
    if (targeting.location && userAttributes.location) {
      if (!targeting.location.includes(userAttributes.location)) {
        return false;
      }
    }

    if (targeting.segment && userAttributes.segments) {
      const hasTargetSegment = targeting.segment.some(seg => 
        userAttributes.segments.includes(seg)
      );
      if (!hasTargetSegment) {
        return false;
      }
    }

    if (targeting.device && userAttributes.device) {
      if (!targeting.device.includes(userAttributes.device)) {
        return false;
      }
    }

    return true;
  }

  validateTestConfig(test) {
    if (test.variants.length < 2) {
      throw new Error('Test must have at least 2 variants');
    }

    const totalAllocation = test.variants.reduce((sum, v) => sum + v.traffic_allocation, 0);
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      throw new Error('Traffic allocation must sum to 1.0');
    }

    if (!test.primary_metric) {
      throw new Error('Primary metric is required');
    }
  }

  // Get test dashboard data
  getTestDashboard(wholesalerId) {
    const wholesalerTests = Array.from(this.activeTests.values())
      .filter(test => test.created_by === wholesalerId);

    const dashboard = {
      active_tests: wholesalerTests.filter(t => t.status === 'running').length,
      completed_tests: wholesalerTests.filter(t => t.status === 'completed').length,
      significant_results: wholesalerTests.filter(t => t.statistical_significance).length,
      total_improvement: this.calculateTotalImprovement(wholesalerId),
      recent_tests: wholesalerTests
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, 5)
        .map(test => ({
          id: test.id,
          name: test.name,
          status: test.status,
          primary_metric: test.primary_metric,
          statistical_significance: test.statistical_significance,
          winner: test.winner?.variant_name,
          created_at: test.created_at
        })),
      recommendations: this.getTestRecommendations(wholesalerId)
    };

    return dashboard;
  }

  calculateTotalImprovement(wholesalerId) {
    const completedTests = this.testHistory
      .filter(test => test.created_by === wholesalerId)
      .filter(test => test.improvement > 0);

    if (completedTests.length === 0) return 0;

    return completedTests.reduce((sum, test) => sum + test.improvement, 0) / completedTests.length;
  }

  getTestRecommendations(wholesalerId) {
    const recommendations = [];
    
    const recentTests = Array.from(this.activeTests.values())
      .filter(test => test.created_by === wholesalerId)
      .filter(test => test.created_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    if (recentTests.length === 0) {
      recommendations.push({
        type: 'create_test',
        title: 'Start Your First A/B Test',
        description: 'Test different ad creatives or targeting to improve performance',
        priority: 'high'
      });
    }

    const runningTests = recentTests.filter(t => t.status === 'running');
    if (runningTests.length > 0) {
      const lowSampleTests = runningTests.filter(test => {
        const maxSample = Math.max(...Array.from(test.variant_results.values()).map(r => r.impressions));
        return maxSample < test.min_sample_size;
      });

      if (lowSampleTests.length > 0) {
        recommendations.push({
          type: 'increase_budget',
          title: 'Increase Test Budget',
          description: `${lowSampleTests.length} tests need more traffic for reliable results`,
          priority: 'medium'
        });
      }
    }

    const testableElements = this.identifyTestableElements(wholesalerId);
    if (testableElements.length > 0) {
      recommendations.push({
        type: 'test_suggestion',
        title: `Test ${testableElements[0]}`,
        description: 'High impact opportunity identified for testing',
        priority: 'low'
      });
    }

    return recommendations;
  }

  identifyTestableElements(wholesalerId) {
    // Analyze campaign data to suggest testable elements
    return ['ad headlines', 'call-to-action buttons', 'audience targeting', 'bid strategies'];
  }

  // Get test templates
  getTestTemplates() {
    return [
      {
        id: 'creative_test',
        name: 'Creative A/B Test',
        description: 'Test different ad creatives, headlines, or images',
        test_type: 'creative',
        suggested_metrics: ['click_rate', 'conversion_rate'],
        variants: [
          { name: 'Control', description: 'Current creative' },
          { name: 'Variant B', description: 'New creative' }
        ]
      },
      {
        id: 'targeting_test',
        name: 'Audience Targeting Test',
        description: 'Compare different audience segments',
        test_type: 'targeting',
        suggested_metrics: ['cost_per_conversion', 'return_on_ad_spend'],
        variants: [
          { name: 'Broad Audience', description: 'Wider targeting' },
          { name: 'Narrow Audience', description: 'Specific targeting' }
        ]
      },
      {
        id: 'timing_test',
        name: 'Ad Timing Test',
        description: 'Test different days or times for ad delivery',
        test_type: 'timing',
        suggested_metrics: ['click_rate', 'cost_per_click'],
        variants: [
          { name: 'Weekdays', description: 'Monday-Friday delivery' },
          { name: 'Weekends', description: 'Saturday-Sunday delivery' }
        ]
      },
      {
        id: 'pricing_test',
        name: 'Pricing Strategy Test',
        description: 'Test different pricing or discount strategies',
        test_type: 'pricing',
        suggested_metrics: ['conversion_rate', 'revenue_per_conversion'],
        variants: [
          { name: 'Current Price', description: 'Standard pricing' },
          { name: 'Discounted Price', description: '10% discount' }
        ]
      }
    ];
  }

  // Stop a running test
  stopTest(testId, reason = 'manual_stop') {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'running') {
      throw new Error('Can only stop running tests');
    }

    test.status = 'stopped';
    test.ended_at = new Date();
    test.stop_reason = reason;

    // Final analysis
    const finalAnalysis = this.analyzeTest(testId);
    
    console.log(`⏹️ Stopped test: ${test.name} (${reason})`);
    
    return finalAnalysis;
  }

  // Get detailed test results
  getTestResults(testId) {
    const test = this.activeTests.get(testId);
    const analysis = this.testResults.get(testId);
    
    if (!test) {
      throw new Error('Test not found');
    }

    return {
      test_info: {
        id: test.id,
        name: test.name,
        status: test.status,
        duration: test.duration,
        started_at: test.started_at,
        ended_at: test.ended_at
      },
      analysis: analysis,
      variant_details: test.variants.map(variant => ({
        ...variant,
        results: this.calculateVariantMetrics(test.variant_results.get(variant.id))
      })),
      timeline: this.getTestTimeline(testId)
    };
  }

  getTestTimeline(testId) {
    const test = this.activeTests.get(testId);
    if (!test) return [];

    const timeline = [
      { event: 'test_created', timestamp: test.created_at },
      { event: 'test_started', timestamp: test.started_at }
    ];

    if (test.ended_at) {
      timeline.push({ event: 'test_ended', timestamp: test.ended_at });
    }

    if (test.winner) {
      timeline.push({ 
        event: 'winner_declared', 
        timestamp: test.ended_at,
        data: { winner: test.winner.variant_name }
      });
    }

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }
}

module.exports = new ABTestingService(); 
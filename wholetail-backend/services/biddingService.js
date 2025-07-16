const adPaymentService = require('./adPaymentService');

class BiddingService {
  constructor() {
    this.activeBids = new Map(); // Store active bids
    this.placements = new Map(); // Store placement auctions
    this.bidHistory = []; // Store bid history for analytics
    console.log('🏆 Real-time Bidding Service initialized');
    
    // Clean up expired bids every 10 seconds
    setInterval(() => this.cleanupExpiredBids(), 10000);
  }

  // Initialize placement auction
  initializePlacement(placementId, config = {}) {
    const placement = {
      id: placementId,
      type: config.type || 'featured_listing', // featured_listing, category_top, search_priority
      category: config.category || 'all',
      location: config.location || 'global',
      min_bid: config.min_bid || 0.10,
      auction_duration: config.auction_duration || 300000, // 5 minutes default
      current_winner: null,
      current_bid: config.min_bid || 0.10,
      bid_count: 0,
      started_at: new Date(),
      expires_at: new Date(Date.now() + (config.auction_duration || 300000)),
      bids: [],
      status: 'active'
    };
    
    this.placements.set(placementId, placement);
    console.log(`🎯 Initialized placement auction: ${placementId}`);
    return placement;
  }

  // Submit a bid for a placement
  async submitBid(wholesalerId, placementId, bidAmount, productId) {
    try {
      // Validate placement exists and is active
      const placement = this.placements.get(placementId);
      if (!placement) {
        throw new Error('Placement not found');
      }

      if (placement.status !== 'active' || new Date() > placement.expires_at) {
        throw new Error('Auction has ended');
      }

      // Validate bid amount
      if (bidAmount <= placement.current_bid) {
        throw new Error(`Bid must be higher than current bid of $${placement.current_bid}`);
      }

      if (bidAmount < placement.min_bid) {
        throw new Error(`Bid must be at least $${placement.min_bid}`);
      }

      // Process payment hold for the bid
      const bidResult = await adPaymentService.processRealTimeBid(
        wholesalerId, 
        bidAmount, 
        placementId
      );

      const bid = {
        id: bidResult.bid_id,
        wholesaler_id: wholesalerId,
        placement_id: placementId,
        product_id: productId,
        amount: bidAmount,
        timestamp: new Date(),
        status: 'active',
        hold_id: bidResult.hold_id,
        expires_at: bidResult.expires_at
      };

      // Store the bid
      this.activeBids.set(bid.id, bid);
      this.bidHistory.push({ ...bid, action: 'submitted' });

      // Update placement if this is the highest bid
      if (bidAmount > placement.current_bid) {
        // Release previous winner's hold (if any)
        if (placement.current_winner) {
          await this.releaseBidHold(placement.current_winner.hold_id);
        }

        placement.current_bid = bidAmount;
        placement.current_winner = bid;
        placement.bid_count++;
        placement.bids.push(bid);

        // Extend auction time if bid came in last 30 seconds
        const timeLeft = placement.expires_at.getTime() - Date.now();
        if (timeLeft < 30000) {
          placement.expires_at = new Date(Date.now() + 30000);
          console.log(`⏰ Extended auction for ${placementId} by 30 seconds`);
        }
      }

      return {
        success: true,
        bid: bid,
        placement_status: {
          current_bid: placement.current_bid,
          is_winning: bidAmount > placement.current_bid,
          time_left: Math.max(0, placement.expires_at.getTime() - Date.now()),
          bid_count: placement.bid_count
        }
      };

    } catch (error) {
      console.error('Error submitting bid:', error);
      throw error;
    }
  }

  // Get current auction status
  getPlacementStatus(placementId) {
    const placement = this.placements.get(placementId);
    if (!placement) {
      return null;
    }

    return {
      id: placement.id,
      type: placement.type,
      category: placement.category,
      current_bid: placement.current_bid,
      min_bid: placement.min_bid,
      bid_count: placement.bid_count,
      time_left: Math.max(0, placement.expires_at.getTime() - Date.now()),
      status: placement.status,
      winner: placement.current_winner ? {
        wholesaler_id: placement.current_winner.wholesaler_id,
        bid_amount: placement.current_winner.amount
      } : null
    };
  }

  // Get bidding recommendations based on competition
  getBiddingRecommendations(placementId, wholesalerId) {
    const placement = this.placements.get(placementId);
    if (!placement) {
      return null;
    }

    const recentBids = placement.bids.slice(-5); // Last 5 bids
    const avgBidIncrease = this.calculateAverageBidIncrease(recentBids);
    const competitionLevel = this.assessCompetitionLevel(placement);
    
    const recommendations = {
      placement_id: placementId,
      current_bid: placement.current_bid,
      suggested_bid_range: {
        conservative: placement.current_bid + 0.05,
        competitive: placement.current_bid + avgBidIncrease,
        aggressive: placement.current_bid + (avgBidIncrease * 1.5)
      },
      competition_level: competitionLevel,
      time_strategy: this.getTimeStrategy(placement),
      estimated_traffic: this.estimateTrafficValue(placement),
      roi_projection: this.calculateROIProjection(placement, wholesalerId)
    };

    return recommendations;
  }

  calculateAverageBidIncrease(bids) {
    if (bids.length < 2) return 0.10;
    
    let totalIncrease = 0;
    for (let i = 1; i < bids.length; i++) {
      totalIncrease += bids[i].amount - bids[i-1].amount;
    }
    return totalIncrease / (bids.length - 1);
  }

  assessCompetitionLevel(placement) {
    const bidsPerMinute = placement.bid_count / ((Date.now() - placement.started_at.getTime()) / 60000);
    
    if (bidsPerMinute > 2) return 'high';
    if (bidsPerMinute > 0.5) return 'medium';
    return 'low';
  }

  getTimeStrategy(placement) {
    const timeLeft = placement.expires_at.getTime() - Date.now();
    const totalDuration = placement.expires_at.getTime() - placement.started_at.getTime();
    const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

    if (progressPercent < 25) return 'early_bird';
    if (progressPercent < 75) return 'steady_bidding';
    if (progressPercent < 95) return 'final_push';
    return 'last_chance';
  }

  estimateTrafficValue(placement) {
    // Mock traffic estimates based on placement type and category
    const baseTraffic = {
      featured_listing: { impressions: 1500, clicks: 120, conversions: 8 },
      category_top: { impressions: 800, clicks: 64, conversions: 4 },
      search_priority: { impressions: 600, clicks: 48, conversions: 3 }
    };

    return baseTraffic[placement.type] || baseTraffic.featured_listing;
  }

  calculateROIProjection(placement, wholesalerId) {
    const traffic = this.estimateTrafficValue(placement);
    const avgOrderValue = 85; // Mock average order value
    const estimatedRevenue = traffic.conversions * avgOrderValue;
    const adCost = placement.current_bid;
    
    return {
      estimated_revenue: estimatedRevenue,
      ad_cost: adCost,
      roi_percentage: ((estimatedRevenue - adCost) / adCost) * 100,
      break_even_conversions: Math.ceil(adCost / avgOrderValue)
    };
  }

  // End auction and finalize placement
  async finalizeAuction(placementId) {
    const placement = this.placements.get(placementId);
    if (!placement || placement.status !== 'active') {
      return null;
    }

    placement.status = 'completed';
    placement.ended_at = new Date();

    if (placement.current_winner) {
      try {
        // Charge the winning bid
        const charge = await adPaymentService.chargeBid(
          placement.current_winner.id,
          placement.current_winner.amount
        );

        placement.current_winner.status = 'won';
        placement.current_winner.charge_id = charge.id;

        // Release holds for all other bids
        for (const bid of placement.bids) {
          if (bid.id !== placement.current_winner.id) {
            await this.releaseBidHold(bid.hold_id);
            bid.status = 'lost';
          }
        }

        console.log(`🏆 Auction finalized for ${placementId}: Winner ${placement.current_winner.wholesaler_id} - $${placement.current_winner.amount}`);

        return {
          placement_id: placementId,
          winner: placement.current_winner,
          final_bid: placement.current_bid,
          total_bids: placement.bid_count,
          duration: placement.ended_at.getTime() - placement.started_at.getTime()
        };

      } catch (error) {
        console.error('Error finalizing auction:', error);
        placement.status = 'error';
        throw error;
      }
    }

    return null;
  }

  async releaseBidHold(holdId) {
    // In real implementation, this would release the payment hold
    console.log(`💳 Released payment hold: ${holdId}`);
  }

  // Clean up expired bids and auctions
  cleanupExpiredBids() {
    const now = new Date();
    
    // Clean up expired individual bids
    for (const [bidId, bid] of this.activeBids) {
      if (now > bid.expires_at && bid.status === 'active') {
        bid.status = 'expired';
        this.releaseBidHold(bid.hold_id);
        this.activeBids.delete(bidId);
      }
    }

    // Finalize expired auctions
    for (const [placementId, placement] of this.placements) {
      if (now > placement.expires_at && placement.status === 'active') {
        this.finalizeAuction(placementId);
      }
    }
  }

  // Get active placements for bidding
  getActivePlacements(filters = {}) {
    const activePlacements = Array.from(this.placements.values())
      .filter(p => p.status === 'active')
      .filter(p => {
        if (filters.category && p.category !== 'all' && p.category !== filters.category) {
          return false;
        }
        if (filters.type && p.type !== filters.type) {
          return false;
        }
        return true;
      })
      .map(p => ({
        id: p.id,
        type: p.type,
        category: p.category,
        current_bid: p.current_bid,
        min_bid: p.min_bid,
        bid_count: p.bid_count,
        time_left: Math.max(0, p.expires_at.getTime() - Date.now()),
        estimated_traffic: this.estimateTrafficValue(p)
      }));

    return activePlacements;
  }

  // Get bidding analytics for wholesaler
  getBiddingAnalytics(wholesalerId, period = '7d') {
    const userBids = this.bidHistory.filter(bid => 
      bid.wholesaler_id === wholesalerId &&
      bid.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const wonBids = userBids.filter(bid => bid.status === 'won');
    const totalSpent = wonBids.reduce((sum, bid) => sum + bid.amount, 0);

    return {
      total_bids: userBids.length,
      won_auctions: wonBids.length,
      win_rate: userBids.length > 0 ? (wonBids.length / userBids.length) * 100 : 0,
      total_spent: totalSpent,
      average_winning_bid: wonBids.length > 0 ? totalSpent / wonBids.length : 0,
      most_competitive_categories: this.getMostCompetitiveCategories(userBids),
      bidding_patterns: this.analyzeBiddingPatterns(userBids)
    };
  }

  getMostCompetitiveCategories(bids) {
    const categoryStats = {};
    
    for (const bid of bids) {
      const placement = this.placements.get(bid.placement_id);
      if (placement) {
        if (!categoryStats[placement.category]) {
          categoryStats[placement.category] = { bids: 0, avgCompetition: 0 };
        }
        categoryStats[placement.category].bids++;
        categoryStats[placement.category].avgCompetition += placement.bid_count;
      }
    }

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        bid_count: stats.bids,
        avg_competition: stats.avgCompetition / stats.bids
      }))
      .sort((a, b) => b.avg_competition - a.avg_competition);
  }

  analyzeBiddingPatterns(bids) {
    const patterns = {
      preferred_times: {},
      bid_timing_strategy: 'unknown',
      average_bid_amount: 0
    };

    if (bids.length > 0) {
      patterns.average_bid_amount = bids.reduce((sum, bid) => sum + bid.amount, 0) / bids.length;
      
      // Analyze preferred bidding times
      bids.forEach(bid => {
        const hour = bid.timestamp.getHours();
        patterns.preferred_times[hour] = (patterns.preferred_times[hour] || 0) + 1;
      });
    }

    return patterns;
  }
}

module.exports = new BiddingService(); 
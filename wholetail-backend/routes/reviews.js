const express = require('express');
const { database } = require('../config/database');
const { requireAuth } = require('../middleware/clerk-auth');
const router = express.Router();

// Mock reviews data for development
const mockReviews = [
  {
    id: 'review-1',
    product_id: 'prod-1',
    reviewer_id: 'user-123',
    order_id: 'order-1',
    rating: 5,
    comment: 'Excellent quality tomatoes! Very fresh and arrived on time. Will definitely order again.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: {
      name: 'Jane Doe',
      business_name: 'Green Valley Store',
      verified_buyer: true
    }
  },
  {
    id: 'review-2',
    product_id: 'prod-1',
    reviewer_id: 'user-456',
    order_id: 'order-2',
    rating: 4,
    comment: 'Good quality but packaging could be improved. Overall satisfied with the purchase.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: {
      name: 'John Smith',
      business_name: 'City Mart',
      verified_buyer: true
    }
  },
  {
    id: 'review-3',
    product_id: 'prod-2',
    reviewer_id: 'user-789',
    order_id: 'order-3',
    rating: 5,
    comment: 'Best quality maize I\'ve purchased. Clean, well-sorted, and competitive pricing.',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: {
      name: 'Mary Johnson',
      business_name: 'Johnson\'s Store',
      verified_buyer: true
    }
  },
  {
    id: 'review-4',
    product_id: 'prod-1',
    reviewer_id: 'user-321',
    order_id: 'order-4',
    rating: 3,
    comment: 'Average quality. Some tomatoes were overripe. Delivery was on time though.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: {
      name: 'David Wilson',
      business_name: 'Wilson Groceries',
      verified_buyer: true
    }
  }
];

// Get reviews for a specific product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    // Mock implementation for development
    let productReviews = mockReviews.filter(review => review.product_id === productId);
    
    // Sort reviews
    if (sort === 'newest') {
      productReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'oldest') {
      productReviews.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'highest') {
      productReviews.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lowest') {
      productReviews.sort((a, b) => a.rating - b.rating);
    }

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedReviews = productReviews.slice(startIndex, endIndex);

    // Calculate average rating and rating distribution
    const totalReviews = productReviews.length;
    const averageRating = totalReviews > 0 
      ? productReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0;

    const ratingDistribution = {
      5: productReviews.filter(r => r.rating === 5).length,
      4: productReviews.filter(r => r.rating === 4).length,
      3: productReviews.filter(r => r.rating === 3).length,
      2: productReviews.filter(r => r.rating === 2).length,
      1: productReviews.filter(r => r.rating === 1).length
    };

    res.json({
      success: true,
      reviews: paginatedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalReviews,
        total_pages: Math.ceil(totalReviews / limit),
        has_next: endIndex < totalReviews,
        has_prev: page > 1
      },
      rating_summary: {
        average_rating: parseFloat(averageRating.toFixed(1)),
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create a new review
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { product_id, order_id, rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!product_id || !order_id || !rating) {
      return res.status(400).json({ error: 'Product ID, Order ID, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user has already reviewed this product for this order
    const existingReview = mockReviews.find(review => 
      review.product_id === product_id && 
      review.order_id === order_id && 
      review.reviewer_id === userId
    );

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this product for this order' });
    }

    // Create new review
    const newReview = {
      id: `review-${Date.now()}`,
      product_id,
      reviewer_id: userId,
      order_id,
      rating,
      comment: comment || '',
      created_at: new Date().toISOString(),
      reviewer: {
        name: 'Current User', // In production, get from user profile
        business_name: 'User Business',
        verified_buyer: true
      }
    };

    // In production, this would be saved to the database
    mockReviews.push(newReview);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: newReview
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update a review
router.put('/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const reviewIndex = mockReviews.findIndex(review => review.id === reviewId);
    
    if (reviewIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = mockReviews[reviewIndex];
    
    // Check if user owns this review
    if (review.reviewer_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    // Update review
    if (rating && rating >= 1 && rating <= 5) {
      mockReviews[reviewIndex].rating = rating;
    }
    if (comment !== undefined) {
      mockReviews[reviewIndex].comment = comment;
    }
    mockReviews[reviewIndex].updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: 'Review updated successfully',
      review: mockReviews[reviewIndex]
    });

  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { reviewId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const reviewIndex = mockReviews.findIndex(review => review.id === reviewId);
    
    if (reviewIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = mockReviews[reviewIndex];
    
    // Check if user owns this review
    if (review.reviewer_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    // Delete review
    mockReviews.splice(reviewIndex, 1);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Get reviews by user (for user's review history)
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const requestingUserId = req.auth?.userId;
    const { userId } = req.params;

    // Users can only view their own reviews
    if (requestingUserId !== userId) {
      return res.status(403).json({ error: 'You can only view your own reviews' });
    }

    const userReviews = mockReviews.filter(review => review.reviewer_id === userId);
    
    // Sort by newest first
    userReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      reviews: userReviews,
      total: userReviews.length
    });

  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// Get review statistics for a product
router.get('/stats/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const productReviews = mockReviews.filter(review => review.product_id === productId);
    const totalReviews = productReviews.length;
    
    if (totalReviews === 0) {
      return res.json({
        success: true,
        stats: {
          average_rating: 0,
          total_reviews: 0,
          rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          recent_reviews_count: 0,
          positive_reviews_percentage: 0
        }
      });
    }

    const averageRating = productReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    
    const ratingDistribution = {
      5: productReviews.filter(r => r.rating === 5).length,
      4: productReviews.filter(r => r.rating === 4).length,
      3: productReviews.filter(r => r.rating === 3).length,
      2: productReviews.filter(r => r.rating === 2).length,
      1: productReviews.filter(r => r.rating === 1).length
    };

    // Reviews from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviewsCount = productReviews.filter(review => 
      new Date(review.created_at) > thirtyDaysAgo
    ).length;

    // Positive reviews (4+ stars)
    const positiveReviews = productReviews.filter(r => r.rating >= 4).length;
    const positivePercentage = (positiveReviews / totalReviews) * 100;

    res.json({
      success: true,
      stats: {
        average_rating: parseFloat(averageRating.toFixed(1)),
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution,
        recent_reviews_count: recentReviewsCount,
        positive_reviews_percentage: parseFloat(positivePercentage.toFixed(1))
      }
    });

  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

module.exports = router;
const express = require('express');
const { database } = require('../config/database');
const { requireAuth } = require('../middleware/clerk-auth');
const router = express.Router();

// Mock user preferences data
const mockPreferences = [
  {
    user_id: 'user-123',
    language: 'en',
    theme: 'dark',
    notifications: {
      email: true,
      sms: true,
      whatsapp: true,
      push: true
    },
    dashboard: {
      default_view: 'overview',
      show_tips: true,
      currency: 'KSH'
    },
    privacy: {
      profile_visibility: 'public',
      show_online_status: true,
      allow_messages: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Get user preferences
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { userId } = req.params;
    
    // Users can only view their own preferences
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'You can only view your own preferences' });
    }
    
    // Find user preferences
    let preferences = mockPreferences.find(p => p.user_id === userId);
    
    if (!preferences) {
      // Create default preferences if none exist
      preferences = {
        user_id: userId,
        language: 'en',
        theme: 'dark',
        notifications: {
          email: true,
          sms: true,
          whatsapp: true,
          push: true
        },
        dashboard: {
          default_view: 'overview',
          show_tips: true,
          currency: 'KSH'
        },
        privacy: {
          profile_visibility: 'public',
          show_online_status: true,
          allow_messages: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockPreferences.push(preferences);
    }
    
    res.json({
      success: true,
      preferences
    });
    
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// Update user preferences
router.put('/user/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { userId } = req.params;
    const updates = req.body;
    
    // Users can only update their own preferences
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'You can only update your own preferences' });
    }
    
    // Find existing preferences
    let preferenceIndex = mockPreferences.findIndex(p => p.user_id === userId);
    
    if (preferenceIndex === -1) {
      // Create new preferences if none exist
      const newPreferences = {
        user_id: userId,
        language: updates.language || 'en',
        theme: updates.theme || 'dark',
        notifications: updates.notifications || {
          email: true,
          sms: true,
          whatsapp: true,
          push: true
        },
        dashboard: updates.dashboard || {
          default_view: 'overview',
          show_tips: true,
          currency: 'KSH'
        },
        privacy: updates.privacy || {
          profile_visibility: 'public',
          show_online_status: true,
          allow_messages: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockPreferences.push(newPreferences);
      
      return res.json({
        success: true,
        message: 'Preferences created successfully',
        preferences: newPreferences
      });
    }
    
    // Update existing preferences
    const currentPreferences = mockPreferences[preferenceIndex];
    
    // Merge updates with existing preferences
    mockPreferences[preferenceIndex] = {
      ...currentPreferences,
      language: updates.language !== undefined ? updates.language : currentPreferences.language,
      theme: updates.theme !== undefined ? updates.theme : currentPreferences.theme,
      notifications: updates.notifications ? 
        { ...currentPreferences.notifications, ...updates.notifications } : 
        currentPreferences.notifications,
      dashboard: updates.dashboard ? 
        { ...currentPreferences.dashboard, ...updates.dashboard } : 
        currentPreferences.dashboard,
      privacy: updates.privacy ? 
        { ...currentPreferences.privacy, ...updates.privacy } : 
        currentPreferences.privacy,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: mockPreferences[preferenceIndex]
    });
    
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// Update specific preference (language, theme, etc.)
router.patch('/user/:userId/:category', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { userId, category } = req.params;
    const updates = req.body;
    
    // Users can only update their own preferences
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'You can only update your own preferences' });
    }
    
    const validCategories = ['language', 'theme', 'notifications', 'dashboard', 'privacy'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Invalid category. Use: ${validCategories.join(', ')}` 
      });
    }
    
    // Find preferences
    let preferenceIndex = mockPreferences.findIndex(p => p.user_id === userId);
    
    if (preferenceIndex === -1) {
      return res.status(404).json({ error: 'User preferences not found' });
    }
    
    // Update specific category
    if (category === 'language' || category === 'theme') {
      mockPreferences[preferenceIndex][category] = updates.value;
    } else {
      mockPreferences[preferenceIndex][category] = {
        ...mockPreferences[preferenceIndex][category],
        ...updates
      };
    }
    
    mockPreferences[preferenceIndex].updated_at = new Date().toISOString();
    
    res.json({
      success: true,
      message: `${category} preferences updated successfully`,
      [category]: mockPreferences[preferenceIndex][category]
    });
    
  } catch (error) {
    console.error('Error updating preference category:', error);
    res.status(500).json({ error: 'Failed to update preference category' });
  }
});

// Reset preferences to default
router.post('/user/:userId/reset', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { userId } = req.params;
    
    // Users can only reset their own preferences
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'You can only reset your own preferences' });
    }
    
    // Find and update preferences with defaults
    let preferenceIndex = mockPreferences.findIndex(p => p.user_id === userId);
    
    const defaultPreferences = {
      user_id: userId,
      language: 'en',
      theme: 'dark',
      notifications: {
        email: true,
        sms: true,
        whatsapp: true,
        push: true
      },
      dashboard: {
        default_view: 'overview',
        show_tips: true,
        currency: 'KSH'
      },
      privacy: {
        profile_visibility: 'public',
        show_online_status: true,
        allow_messages: true
      },
      created_at: preferenceIndex !== -1 ? 
        mockPreferences[preferenceIndex].created_at : 
        new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (preferenceIndex !== -1) {
      mockPreferences[preferenceIndex] = defaultPreferences;
    } else {
      mockPreferences.push(defaultPreferences);
    }
    
    res.json({
      success: true,
      message: 'Preferences reset to defaults',
      preferences: defaultPreferences
    });
    
  } catch (error) {
    console.error('Error resetting preferences:', error);
    res.status(500).json({ error: 'Failed to reset preferences' });
  }
});

module.exports = router;
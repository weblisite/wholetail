const express = require('express');
const { database, clerk } = require('../config/database');
const { requireAuth } = require('../middleware/clerk-auth');
const router = express.Router();

// Clerk webhook for user creation
router.post('/webhook/user-created', async (req, res) => {
  try {
    // Verify the webhook (in production, verify the signature)
    const userData = req.body.data;
    
    if (!userData) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Extract user info from Clerk webhook
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      public_metadata = {}
    } = userData;

    const email = email_addresses?.[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim();

    if (!email || !name) {
      return res.status(400).json({ error: 'Missing required user data' });
    }

    // Create user in database
    const newUser = await database.createUser({
      id: clerkId,
      clerk_id: clerkId,
      type: public_metadata.user_type || 'retailer',
      name,
      phone: public_metadata.phone || '',
      email,
      whatsapp: public_metadata.whatsapp || public_metadata.phone || '',
      address: public_metadata.address || '',
      license_number: public_metadata.license_number || null,
      id_number: public_metadata.id_number || null
    });

    res.status(200).json({ message: 'User created successfully', user: newUser });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (called after Clerk registration to add business info)
router.post('/profile/complete', requireAuth, async (req, res) => {
  try {
    const { phone, address, type, whatsapp, license_number, id_number } = req.body;
    const userId = req.auth?.userId; // Middleware should provide this

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!phone || !address || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate user type
    const validTypes = ['wholesaler', 'farmer', 'retailer', 'financier'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Update user profile in database
    const updatedUser = await database.updateUser(userId, {
      type,
          phone,
      address,
      whatsapp: whatsapp || phone,
      license_number: type === 'wholesaler' || type === 'farmer' ? license_number : null,
      id_number: type === 'retailer' ? id_number : null
    });

    // Update Clerk user metadata
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        user_type: type,
        phone,
        address,
        whatsapp: whatsapp || phone,
        license_number,
        id_number,
        profile_completed: true
      }
    });

    res.status(200).json({
      message: 'Profile completed successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (Clerk handles auth client-side, this just gets profile)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId; // Middleware should provide this from Clerk JWT
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile from database
    const userProfile = await database.getUserById(userId);

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ user: userProfile });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates.id;
    delete updates.clerk_id;
    delete updates.created_at;
    delete updates.updated_at;

    const updatedUser = await database.updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete user from database
    await database.deleteUser(userId);

    // Delete user from Clerk
    await clerk.users.deleteUser(userId);

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
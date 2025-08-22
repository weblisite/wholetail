const express = require('express');
const { database } = require('../config/database');
const { requireAuth } = require('../middleware/clerk-auth');
const router = express.Router();

// Mock chat data for development
const mockChats = [
  {
    id: 'chat-1',
    participants: ['user-123', 'user-456'],
    type: 'direct',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 300000).toISOString()
  }
];

const mockMessages = [
  {
    id: 'msg-1',
    chat_id: 'chat-1',
    sender_id: 'user-456',
    sender_name: 'John Wholesaler',
    content: 'Hello! I saw your interest in our products. How can I help you?',
    type: 'text',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    status: 'read'
  },
  {
    id: 'msg-2',
    chat_id: 'chat-1',
    sender_id: 'user-123',
    sender_name: 'Mary Retailer',
    content: 'Hi! I\'m interested in bulk pricing for tomatoes. What quantities do you have available?',
    type: 'text',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    status: 'delivered'
  },
  {
    id: 'msg-3',
    chat_id: 'chat-1',
    sender_id: 'user-456',
    sender_name: 'John Wholesaler',
    content: 'We have excellent fresh tomatoes available. Minimum order is 50kg. Price is KSh 80 per kg for bulk orders.',
    type: 'text',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    status: 'read'
  }
];

const mockUsers = [
  {
    id: 'user-123',
    name: 'Mary Retailer',
    role: 'retailer',
    avatar: null,
    online: true,
    lastSeen: new Date().toISOString()
  },
  {
    id: 'user-456',
    name: 'John Wholesaler',
    role: 'wholesaler',
    avatar: null,
    online: false,
    lastSeen: new Date(Date.now() - 1800000).toISOString()
  }
];

// Get or create chat between two users
router.post('/create', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { participant_id } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!participant_id) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }
    
    if (currentUserId === participant_id) {
      return res.status(400).json({ error: 'Cannot create chat with yourself' });
    }
    
    // Check if chat already exists
    let existingChat = mockChats.find(chat => 
      chat.participants.includes(currentUserId) && 
      chat.participants.includes(participant_id) &&
      chat.type === 'direct'
    );
    
    if (existingChat) {
      return res.json({
        success: true,
        chat: existingChat,
        message: 'Chat already exists'
      });
    }
    
    // Create new chat
    const newChat = {
      id: `chat-${Date.now()}`,
      participants: [currentUserId, participant_id],
      type: 'direct',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockChats.push(newChat);
    
    res.status(201).json({
      success: true,
      chat: newChat,
      message: 'Chat created successfully'
    });
    
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Get user's chats
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { userId } = req.params;
    
    // Users can only view their own chats
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'You can only view your own chats' });
    }
    
    // Get chats where user is a participant
    const userChats = mockChats.filter(chat => 
      chat.participants.includes(userId)
    );
    
    // Enhance chats with participant info and last message
    const enhancedChats = userChats.map(chat => {
      const otherParticipantId = chat.participants.find(p => p !== userId);
      const otherParticipant = mockUsers.find(u => u.id === otherParticipantId);
      
      // Get last message
      const lastMessage = mockMessages
        .filter(msg => msg.chat_id === chat.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      // Count unread messages
      const unreadCount = mockMessages.filter(msg => 
        msg.chat_id === chat.id && 
        msg.sender_id !== userId && 
        msg.status !== 'read'
      ).length;
      
      return {
        ...chat,
        other_participant: otherParticipant,
        last_message: lastMessage,
        unread_count: unreadCount
      };
    });
    
    // Sort by last message timestamp
    enhancedChats.sort((a, b) => {
      const aTime = a.last_message ? new Date(a.last_message.timestamp).getTime() : 0;
      const bTime = b.last_message ? new Date(b.last_message.timestamp).getTime() : 0;
      return bTime - aTime;
    });
    
    res.json({
      success: true,
      chats: enhancedChats
    });
    
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get messages for a chat
router.get('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is participant in this chat
    const chat = mockChats.find(c => c.id === chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }
    
    // Get messages for this chat
    let messages = mockMessages.filter(msg => msg.chat_id === chatId);
    
    // Sort by timestamp (newest first for pagination)
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedMessages = messages.slice(startIndex, endIndex);
    
    // Reverse to show oldest first in UI
    paginatedMessages.reverse();
    
    res.json({
      success: true,
      messages: paginatedMessages,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: messages.length,
        has_more: endIndex < messages.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { chatId } = req.params;
    const { content, type = 'text' } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if user is participant in this chat
    const chat = mockChats.find(c => c.id === chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }
    
    // Get sender info
    const sender = mockUsers.find(u => u.id === currentUserId);
    
    // Create message
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chat_id: chatId,
      sender_id: currentUserId,
      sender_name: sender?.name || 'User',
      content: content.trim(),
      type,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    
    mockMessages.push(newMessage);
    
    // Update chat's updated_at timestamp
    const chatIndex = mockChats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      mockChats[chatIndex].updated_at = new Date().toISOString();
    }
    
    // Simulate message delivery
    setTimeout(() => {
      const msgIndex = mockMessages.findIndex(m => m.id === newMessage.id);
      if (msgIndex !== -1) {
        mockMessages[msgIndex].status = 'delivered';
      }
    }, 1000);
    
    res.status(201).json({
      success: true,
      message: newMessage
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/:chatId/messages/read', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { chatId } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is participant in this chat
    const chat = mockChats.find(c => c.id === chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }
    
    // Mark all messages from other participants as read
    let markedCount = 0;
    mockMessages.forEach(msg => {
      if (msg.chat_id === chatId && msg.sender_id !== currentUserId && msg.status !== 'read') {
        msg.status = 'read';
        markedCount++;
      }
    });
    
    res.json({
      success: true,
      message: `Marked ${markedCount} messages as read`
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get online users
router.get('/users/online', async (req, res) => {
  try {
    const onlineUsers = mockUsers.filter(user => user.online);
    
    res.json({
      success: true,
      users: onlineUsers,
      count: onlineUsers.length
    });
    
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Update user online status
router.put('/users/:userId/status', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.auth?.userId;
    const { userId } = req.params;
    const { online } = req.body;
    
    // Users can only update their own status
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'You can only update your own status' });
    }
    
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    mockUsers[userIndex].online = Boolean(online);
    mockUsers[userIndex].lastSeen = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      user: mockUsers[userIndex]
    });
    
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
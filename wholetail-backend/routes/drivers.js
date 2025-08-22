const express = require('express');
const { database } = require('../config/database');
const { requireAuth } = require('../middleware/clerk-auth');
const router = express.Router();

// Mock driver data for development
const mockDrivers = [
  {
    id: 'driver-1',
    name: 'John Kiprotich',
    phone: '+254701234567',
    email: 'john.kiprotich@wholetail.co.ke',
    rating: 4.8,
    experience_years: 5,
    status: 'online',
    license_number: 'DL123456',
    verified: true,
    vehicle: {
      id: 'vehicle-1',
      type: 'truck',
      plate_number: 'KBC 123A',
      model: 'Toyota Hiace',
      capacity_kg: 1500,
      status: 'active'
    },
    current_location: {
      lat: -1.2921,
      lng: 36.8219,
      address: 'Nairobi CBD'
    }
  }
];

const mockDeliveries = [
  {
    id: 'del-1',
    order_id: 'ORD-001',
    driver_id: 'driver-1',
    pickup_location: {
      lat: -0.3031,
      lng: 36.0800,
      address: 'Nakuru Farm, Nakuru'
    },
    delivery_location: {
      lat: -1.2921,
      lng: 36.8219,
      address: 'Green Valley Store, Nairobi CBD'
    },
    status: 'picked_up',
    priority: 'high',
    estimated_delivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    distance_km: 145.5,
    delivery_fee: 500,
    customer_name: 'Mary Wanjiku',
    customer_phone: '+254709876543',
    items: [
      { product_name: 'Potatoes', quantity: 50, weight: 25 },
      { product_name: 'Cabbages', quantity: 30, weight: 15 }
    ]
  }
];

const mockStats = {
  driver: {
    'driver-1': {
      today: {
        deliveries_completed: 3,
        total_earnings: 1500,
        distance_traveled: 89.2,
        online_hours: 6.5,
        average_rating: 4.8
      },
      week: {
        deliveries_completed: 18,
        total_earnings: 8500,
        distance_traveled: 542.8,
        online_hours: 42,
        average_rating: 4.7
      },
      month: {
        deliveries_completed: 75,
        total_earnings: 32500,
        distance_traveled: 2156.4,
        online_hours: 168,
        average_rating: 4.8
      }
    }
  }
};

// Get driver profile by ID
router.get('/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Mock implementation
    const driver = mockDrivers.find(d => d.id === driverId);
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json({
      success: true,
      driver
    });
    
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Failed to fetch driver information' });
  }
});

// Update driver status (online/offline)
router.put('/:driverId/status', requireAuth, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;
    
    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: online, offline, busy' });
    }
    
    // Mock implementation - update driver status
    const driverIndex = mockDrivers.findIndex(d => d.id === driverId);
    
    if (driverIndex === -1) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    mockDrivers[driverIndex].status = status;
    
    res.json({
      success: true,
      message: `Driver status updated to ${status}`,
      driver: mockDrivers[driverIndex]
    });
    
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Get current deliveries for driver
router.get('/:driverId/current-deliveries', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Mock implementation
    const deliveries = mockDeliveries.filter(d => 
      d.driver_id === driverId && 
      ['assigned', 'picked_up', 'in_transit'].includes(d.status)
    );
    
    res.json({
      success: true,
      deliveries
    });
    
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch current deliveries' });
  }
});

// Get performance stats for driver
router.get('/:driverId/stats', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { period = 'today' } = req.query;
    
    // Mock implementation
    const driverStats = mockStats.driver[driverId];
    
    if (!driverStats) {
      return res.status(404).json({ error: 'Driver stats not found' });
    }
    
    const stats = period === 'all' ? driverStats : { [period]: driverStats[period] };
    
    res.json({
      success: true,
      stats,
      period
    });
    
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ error: 'Failed to fetch driver statistics' });
  }
});

// Update delivery status
router.put('/deliveries/:deliveryId/status', requireAuth, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Use: ${validStatuses.join(', ')}` 
      });
    }
    
    // Mock implementation - update delivery status
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    
    if (deliveryIndex === -1) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    mockDeliveries[deliveryIndex].status = status;
    
    if (status === 'delivered') {
      mockDeliveries[deliveryIndex].completed_at = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: `Delivery status updated to ${status}`,
      delivery: mockDeliveries[deliveryIndex]
    });
    
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// Get driver earnings summary
router.get('/:driverId/earnings', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { period = 'month' } = req.query;
    
    // Mock earnings data
    const earnings = {
      today: {
        total_earnings: 1500,
        deliveries: 3,
        avg_per_delivery: 500,
        tips: 150,
        bonuses: 0
      },
      week: {
        total_earnings: 8500,
        deliveries: 18,
        avg_per_delivery: 472,
        tips: 850,
        bonuses: 200
      },
      month: {
        total_earnings: 32500,
        deliveries: 75,
        avg_per_delivery: 433,
        tips: 3200,
        bonuses: 1000
      }
    };
    
    res.json({
      success: true,
      earnings: earnings[period] || earnings.month,
      period
    });
    
  } catch (error) {
    console.error('Error fetching driver earnings:', error);
    res.status(500).json({ error: 'Failed to fetch driver earnings' });
  }
});

// Get all drivers (admin endpoint)
router.get('/', async (req, res) => {
  try {
    const { status, location, limit = 50 } = req.query;
    
    let drivers = [...mockDrivers];
    
    if (status) {
      drivers = drivers.filter(d => d.status === status);
    }
    
    // Apply limit
    drivers = drivers.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      drivers,
      total: drivers.length
    });
    
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

module.exports = router;
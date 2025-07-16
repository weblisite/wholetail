const express = require('express');
const router = express.Router();
const GPSTrackingService = require('../services/gpsTrackingService');

// Initialize GPS tracking service
const gpsService = new GPSTrackingService();

// WebSocket connections for real-time updates
const activeConnections = new Map();

// Register driver for GPS tracking
router.post('/drivers/register', async (req, res) => {
  try {
    const { driver_id, driver_info } = req.body;

    if (!driver_id || !driver_info) {
      return res.status(400).json({
        error: 'Driver ID and driver info are required'
      });
    }

    const result = await gpsService.registerDriver(driver_id, driver_info);

    res.json({
      success: true,
      message: 'Driver registered for GPS tracking',
      data: result
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({
      error: 'Failed to register driver for GPS tracking',
      details: error.message
    });
  }
});

// Update driver location
router.post('/drivers/:driver_id/location', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const locationData = req.body;

    if (!locationData.latitude || !locationData.longitude) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const result = await gpsService.updateLocation(driver_id, locationData);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      error: 'Failed to update location',
      details: error.message
    });
  }
});

// Get driver's current location
router.get('/drivers/:driver_id/location', async (req, res) => {
  try {
    const { driver_id } = req.params;
    
    const activeDrivers = await gpsService.getActiveDriverLocations();
    const driver = activeDrivers.drivers.find(d => d.driver_id === driver_id);

    if (!driver) {
      return res.status(404).json({
        error: 'Driver not found or not currently tracking'
      });
    }

    res.json({
      success: true,
      driver: driver
    });

  } catch (error) {
    console.error('Get driver location error:', error);
    res.status(500).json({
      error: 'Failed to get driver location',
      details: error.message
    });
  }
});

// Get all active driver locations
router.get('/drivers/active', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      near_location: req.query.lat && req.query.lng ? {
        latitude: parseFloat(req.query.lat),
        longitude: parseFloat(req.query.lng),
        radius: req.query.radius ? parseInt(req.query.radius) : 5000
      } : null
    };

    const result = await gpsService.getActiveDriverLocations(filters);

    res.json({
      success: true,
      message: `Found ${result.active_drivers} active drivers`,
      data: result
    });

  } catch (error) {
    console.error('Get active drivers error:', error);
    res.status(500).json({
      error: 'Failed to get active drivers',
      details: error.message
    });
  }
});

// Find nearest available drivers
router.post('/drivers/nearest', async (req, res) => {
  try {
    const { latitude, longitude, max_distance, limit } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const nearestDrivers = await gpsService.findNearestDrivers(
      { latitude, longitude },
      max_distance || 10000,
      limit || 5
    );

    res.json({
      success: true,
      message: `Found ${nearestDrivers.length} nearby drivers`,
      drivers: nearestDrivers
    });

  } catch (error) {
    console.error('Find nearest drivers error:', error);
    res.status(500).json({
      error: 'Failed to find nearest drivers',
      details: error.message
    });
  }
});

// Start delivery tracking
router.post('/deliveries/:delivery_id/start', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    const deliveryInfo = req.body;

    if (!deliveryInfo.driver_id || !deliveryInfo.pickup_location || !deliveryInfo.delivery_location) {
      return res.status(400).json({
        error: 'Driver ID, pickup location, and delivery location are required'
      });
    }

    const result = await gpsService.startDeliveryTracking(delivery_id, deliveryInfo);

    res.json({
      success: true,
      message: 'Delivery tracking started',
      data: result
    });

  } catch (error) {
    console.error('Start delivery tracking error:', error);
    res.status(500).json({
      error: 'Failed to start delivery tracking',
      details: error.message
    });
  }
});

// Get delivery tracking information
router.get('/deliveries/:delivery_id/track', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    
    const trackingInfo = await gpsService.getDeliveryTracking(delivery_id);

    res.json({
      success: true,
      tracking: trackingInfo
    });

  } catch (error) {
    console.error('Get delivery tracking error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Delivery not found',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to get delivery tracking',
      details: error.message
    });
  }
});

// Update delivery status
router.put('/deliveries/:delivery_id/status', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    const { status, location, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }

    // Update delivery status in the tracking service
    const delivery = gpsService.deliveryRoutes.get(delivery_id);
    if (!delivery) {
      return res.status(404).json({
        error: 'Delivery not found'
      });
    }

    const previousStatus = delivery.status;
    delivery.status = status;
    delivery.status_updated_at = new Date().toISOString();

    if (location) {
      delivery.status_update_location = location;
    }

    if (notes) {
      delivery.status_notes = notes;
    }

    // Add checkpoint
    delivery.checkpoints.push({
      status,
      timestamp: new Date().toISOString(),
      location,
      notes
    });

    // Emit status update event
    gpsService.emit('deliveryStatusUpdate', {
      delivery_id,
      previous_status: previousStatus,
      new_status: status,
      timestamp: new Date().toISOString(),
      location,
      notes
    });

    res.json({
      success: true,
      message: `Delivery status updated to ${status}`,
      delivery: {
        id: delivery_id,
        status: delivery.status,
        checkpoints: delivery.checkpoints
      }
    });

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      error: 'Failed to update delivery status',
      details: error.message
    });
  }
});

// Optimize route for multiple deliveries
router.post('/routes/optimize', async (req, res) => {
  try {
    const { driver_location, deliveries } = req.body;

    if (!driver_location || !deliveries) {
      return res.status(400).json({
        error: 'Driver location and deliveries array are required'
      });
    }

    const optimizedRoute = await gpsService.optimizeMultiDeliveryRoute(driver_location, deliveries);

    res.json({
      success: true,
      message: 'Route optimized successfully',
      route: optimizedRoute
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      error: 'Failed to optimize route',
      details: error.message
    });
  }
});

// Get driver's delivery history
router.get('/drivers/:driver_id/history', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const { days = 7 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Get tracking history for the driver
    const history = gpsService.trackingHistory.get(driver_id) || [];
    const recentHistory = history.filter(point => 
      new Date(point.timestamp) >= cutoffDate
    );

    // Get completed deliveries
    const completedDeliveries = Array.from(gpsService.deliveryRoutes.values())
      .filter(delivery => 
        delivery.driver_id === driver_id &&
        new Date(delivery.started_at) >= cutoffDate
      );

    // Calculate statistics
    const stats = {
      total_distance: recentHistory.reduce((sum, point) => sum + (point.distance_from_previous || 0), 0),
      total_deliveries: completedDeliveries.length,
      completed_deliveries: completedDeliveries.filter(d => d.status === 'completed').length,
      average_speed: recentHistory.length > 0 ? 
        recentHistory.reduce((sum, point) => sum + (point.speed || 0), 0) / recentHistory.length : 0,
      online_time: recentHistory.length * 30 // Approximate based on 30-second intervals
    };

    res.json({
      success: true,
      driver_id,
      period_days: parseInt(days),
      history: recentHistory,
      deliveries: completedDeliveries,
      statistics: stats
    });

  } catch (error) {
    console.error('Get driver history error:', error);
    res.status(500).json({
      error: 'Failed to get driver history',
      details: error.message
    });
  }
});

// Get live tracking analytics
router.get('/analytics/live', async (req, res) => {
  try {
    const stats = gpsService.getStats();
    
    // Calculate additional analytics
    const activeDrivers = await gpsService.getActiveDriverLocations();
    const statusBreakdown = activeDrivers.drivers.reduce((acc, driver) => {
      acc[driver.status] = (acc[driver.status] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      overview: stats,
      driver_status_breakdown: statusBreakdown,
      active_deliveries: Array.from(gpsService.deliveryRoutes.values()).map(delivery => ({
        id: delivery.delivery_id,
        status: delivery.status,
        driver_id: delivery.driver_id,
        progress: delivery.current_progress || 0,
        started_at: delivery.started_at
      })),
      geofences: {
        total: gpsService.geofences.size,
        active: Array.from(gpsService.geofences.values()).filter(gf => 
          Date.now() - new Date(gf.created_at).getTime() < 24 * 60 * 60 * 1000
        ).length
      },
      system_health: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      details: error.message
    });
  }
});

// GPS service health check
router.get('/health', async (req, res) => {
  try {
    const health = await gpsService.healthCheck();
    
    res.json({
      success: true,
      health
    });

  } catch (error) {
    console.error('GPS health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Test endpoints for development
router.post('/test/simulate-location', async (req, res) => {
  try {
    const { driver_id, route_points, interval = 5000 } = req.body;

    if (!driver_id || !route_points || !Array.isArray(route_points)) {
      return res.status(400).json({
        error: 'Driver ID and route points array are required'
      });
    }

    // Simulate movement along route points
    let currentIndex = 0;
    const simulationId = `sim_${Date.now()}`;

    const simulate = async () => {
      if (currentIndex >= route_points.length) {
        console.log(`📍 Simulation completed for driver ${driver_id}`);
        return;
      }

      const point = route_points[currentIndex];
      
      try {
        await gpsService.updateLocation(driver_id, {
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: new Date().toISOString(),
          accuracy: 5,
          battery_level: Math.max(20, 100 - currentIndex * 2), // Simulate battery drain
          speed: point.speed || 30
        });

        currentIndex++;
        setTimeout(simulate, interval);
      } catch (error) {
        console.error('Simulation error:', error);
      }
    };

    // Start simulation
    simulate();

    res.json({
      success: true,
      message: 'Location simulation started',
      simulation_id: simulationId,
      driver_id,
      total_points: route_points.length,
      interval_ms: interval
    });

  } catch (error) {
    console.error('Start simulation error:', error);
    res.status(500).json({
      error: 'Failed to start location simulation',
      details: error.message
    });
  }
});

// WebSocket upgrade for real-time tracking
router.ws = function(ws, req) {
  console.log('📡 New WebSocket connection for GPS tracking');
  
  const connectionId = `conn_${Date.now()}`;
  activeConnections.set(connectionId, ws);

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    connection_id: connectionId,
    timestamp: new Date().toISOString()
  }));

  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe_driver':
          // Subscribe to specific driver updates
          ws.driver_subscription = data.driver_id;
          ws.send(JSON.stringify({
            type: 'subscribed',
            driver_id: data.driver_id,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'subscribe_delivery':
          // Subscribe to specific delivery updates
          ws.delivery_subscription = data.delivery_id;
          ws.send(JSON.stringify({
            type: 'subscribed',
            delivery_id: data.delivery_id,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    activeConnections.delete(connectionId);
    console.log(`📡 WebSocket connection closed: ${connectionId}`);
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(connectionId);
  });
};

// Set up event listeners for real-time updates
gpsService.on('locationUpdate', (data) => {
  // Broadcast location updates to subscribed clients
  activeConnections.forEach((ws) => {
    if (ws.driver_subscription === data.driver_id && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'location_update',
        ...data
      }));
    }
  });
});

gpsService.on('deliveryUpdate', (data) => {
  // Broadcast delivery updates to subscribed clients
  activeConnections.forEach((ws) => {
    if (ws.delivery_subscription === data.delivery_id && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'delivery_update',
        ...data
      }));
    }
  });
});

gpsService.on('progressUpdate', (data) => {
  // Broadcast progress updates to subscribed clients
  activeConnections.forEach((ws) => {
    if (ws.delivery_subscription === data.delivery_id && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'progress_update',
        ...data
      }));
    }
  });
});

gpsService.on('alert', (data) => {
  // Broadcast alerts to all connected clients
  activeConnections.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'alert',
        ...data
      }));
    }
  });
});

module.exports = router; 
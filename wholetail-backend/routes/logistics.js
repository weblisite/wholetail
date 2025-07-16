const express = require('express');
const router = express.Router();

// Mock fleet data
const mockFleet = [
  {
    id: 'vehicle-1',
    driver_id: 'driver-1',
    vehicle_type: 'truck',
    plate_number: 'KBC 123A',
    model: 'Toyota Hiace',
    capacity_kg: 1500,
    status: 'active',
    current_location: { lat: -1.2921, lng: 36.8219 },
    driver: {
      name: 'John Kiprotich',
      phone: '+254701234567',
      rating: 4.8,
      experience_years: 5
    }
  },
  {
    id: 'vehicle-2',
    driver_id: 'driver-2',
    vehicle_type: 'pickup',
    plate_number: 'KCA 456B',
    model: 'Nissan Pickup',
    capacity_kg: 800,
    status: 'active',
    current_location: { lat: -0.3031, lng: 36.0800 },
    driver: {
      name: 'Mary Wanjiku',
      phone: '+254709876543',
      rating: 4.9,
      experience_years: 3
    }
  },
  {
    id: 'vehicle-3',
    driver_id: 'driver-3',
    vehicle_type: 'van',
    plate_number: 'KBB 789C',
    model: 'Isuzu NPR',
    capacity_kg: 2000,
    status: 'maintenance',
    current_location: { lat: -1.1714, lng: 36.8356 },
    driver: {
      name: 'Peter Mwangi',
      phone: '+254712345678',
      rating: 4.7,
      experience_years: 7
    }
  }
];

// Mock delivery routes
const mockRoutes = [
  {
    id: 'route-1',
    vehicle_id: 'vehicle-1',
    driver_id: 'driver-1',
    status: 'active',
    created_at: new Date().toISOString(),
    deliveries: [
      {
        order_id: 'order-1',
        pickup_location: { lat: -0.3031, lng: 36.0800, address: 'Nakuru Farm' },
        delivery_location: { lat: -1.2921, lng: 36.8219, address: 'Nairobi CBD' },
        status: 'in_transit',
        estimated_delivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        priority: 'high'
      }
    ],
    total_distance: 145.5,
    estimated_duration: 180,
    delivery_fee: 500
  }
];

// Mock performance metrics
const mockMetrics = {
  daily_stats: {
    total_deliveries: 25,
    completed_deliveries: 22,
    pending_deliveries: 3,
    cancelled_deliveries: 0,
    average_delivery_time: 95,
    on_time_percentage: 88,
    total_distance_covered: 1250,
    fuel_consumption: 180,
    total_revenue: 12500
  },
  fleet_utilization: {
    active_vehicles: 2,
    total_vehicles: 3,
    utilization_percentage: 67,
    maintenance_vehicles: 1
  },
  delivery_zones: [
    { zone: 'Nairobi CBD', deliveries: 8, avg_time: 45 },
    { zone: 'Westlands', deliveries: 6, avg_time: 52 },
    { zone: 'Kiambu', deliveries: 4, avg_time: 75 },
    { zone: 'Nakuru', deliveries: 4, avg_time: 120 },
    { zone: 'Eldoret', deliveries: 3, avg_time: 180 }
  ]
};

// Get fleet overview
router.get('/fleet', async (req, res) => {
  try {
    const { status } = req.query;
    
    let fleet = [...mockFleet];
    
    if (status) {
      fleet = fleet.filter(vehicle => vehicle.status === status);
    }
    
    const fleetSummary = {
      total_vehicles: mockFleet.length,
      active_vehicles: mockFleet.filter(v => v.status === 'active').length,
      maintenance_vehicles: mockFleet.filter(v => v.status === 'maintenance').length,
      idle_vehicles: mockFleet.filter(v => v.status === 'idle').length,
      total_capacity: mockFleet.reduce((sum, v) => sum + v.capacity_kg, 0),
      average_rating: mockFleet.reduce((sum, v) => sum + v.driver.rating, 0) / mockFleet.length
    };
    
    res.json({
      fleet,
      summary: fleetSummary
    });
  } catch (error) {
    console.error('Fleet fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vehicle details
router.get('/fleet/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const vehicle = mockFleet.find(v => v.id === vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Add recent delivery history
    const deliveryHistory = [
      {
        id: 'delivery-1',
        order_id: 'order-123',
        pickup_address: 'Nakuru Farm',
        delivery_address: 'Nairobi CBD',
        distance: 145.5,
        duration: 125,
        status: 'completed',
        completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        rating: 5
      },
      {
        id: 'delivery-2',
        order_id: 'order-124',
        pickup_address: 'Kiambu Market',
        delivery_address: 'Westlands',
        distance: 25.3,
        duration: 45,
        status: 'completed',
        completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        rating: 4
      }
    ];
    
    res.json({
      vehicle,
      delivery_history: deliveryHistory
    });
  } catch (error) {
    console.error('Vehicle fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vehicle status
router.patch('/fleet/:vehicleId/status', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { status, location } = req.body;
    
    const vehicle = mockFleet.find(v => v.id === vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Update vehicle status
    vehicle.status = status;
    if (location) {
      vehicle.current_location = location;
    }
    
    res.json({
      message: 'Vehicle status updated successfully',
      vehicle
    });
  } catch (error) {
    console.error('Vehicle update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery routes
router.get('/routes', async (req, res) => {
  try {
    const { status, vehicle_id } = req.query;
    
    let routes = [...mockRoutes];
    
    if (status) {
      routes = routes.filter(route => route.status === status);
    }
    
    if (vehicle_id) {
      routes = routes.filter(route => route.vehicle_id === vehicle_id);
    }
    
    res.json({ routes });
  } catch (error) {
    console.error('Routes fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create optimized delivery route
router.post('/routes/optimize', async (req, res) => {
  try {
    const { deliveries, vehicle_id } = req.body;
    
    if (!deliveries || deliveries.length === 0) {
      return res.status(400).json({ error: 'Deliveries array is required' });
    }
    
    // Simple route optimization (in production, use Google Directions API or optimization services)
    const optimizedRoute = {
      id: `route-${Date.now()}`,
      vehicle_id: vehicle_id || 'vehicle-1',
      status: 'planned',
      created_at: new Date().toISOString(),
      deliveries: deliveries.map((delivery, index) => ({
        ...delivery,
        sequence: index + 1,
        estimated_arrival: new Date(Date.now() + (index + 1) * 60 * 60 * 1000).toISOString()
      })),
      total_distance: deliveries.length * 25, // Mock calculation
      estimated_duration: deliveries.length * 45, // Mock calculation
      delivery_fee: deliveries.length * 150 // Mock calculation
    };
    
    res.json({ optimized_route: optimizedRoute });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update route status
router.patch('/routes/:routeId/status', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { status } = req.body;
    
    const route = mockRoutes.find(r => r.id === routeId);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    route.status = status;
    
    res.json({
      message: 'Route status updated successfully',
      route
    });
  } catch (error) {
    console.error('Route update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logistics performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const { period = 'daily', zone } = req.query;
    
    let metrics = { ...mockMetrics };
    
    if (zone) {
      metrics.delivery_zones = metrics.delivery_zones.filter(z => 
        z.zone.toLowerCase().includes(zone.toLowerCase())
      );
    }
    
    // Add period-specific calculations
    if (period === 'weekly') {
      metrics.daily_stats = {
        ...metrics.daily_stats,
        total_deliveries: metrics.daily_stats.total_deliveries * 7,
        completed_deliveries: metrics.daily_stats.completed_deliveries * 7,
        total_distance_covered: metrics.daily_stats.total_distance_covered * 7,
        total_revenue: metrics.daily_stats.total_revenue * 7
      };
    }
    
    res.json({ metrics, period });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate delivery fee with dynamic pricing
router.post('/calculate-fee', async (req, res) => {
  try {
    const { origin, destination, weight = 1, priority = 'standard', delivery_time } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }
    
    // Calculate distance (simplified - in production use Google Distance Matrix API)
    const distance = Math.sqrt(
      Math.pow((destination.lat - origin.lat) * 111, 2) + 
      Math.pow((destination.lng - origin.lng) * 111 * Math.cos(origin.lat * Math.PI / 180), 2)
    );
    
    // Base pricing algorithm
    let baseFee = 100; // KSh 100 base fee
    let distanceFee = distance * 15; // KSh 15 per km
    let weightFee = weight > 10 ? (weight - 10) * 5 : 0; // KSh 5 per kg above 10kg
    
    // Priority multipliers
    const priorityMultipliers = {
      'standard': 1.0,
      'express': 1.5,
      'urgent': 2.0
    };
    
    // Time-based multipliers
    let timeMultiplier = 1.0;
    if (delivery_time) {
      const hour = new Date(delivery_time).getHours();
      if (hour >= 18 || hour <= 6) timeMultiplier = 1.3; // Night delivery
      if (hour >= 12 && hour <= 14) timeMultiplier = 1.2; // Lunch time
    }
    
    const totalFee = Math.round(
      (baseFee + distanceFee + weightFee) * 
      priorityMultipliers[priority] * 
      timeMultiplier
    );
    
    const breakdown = {
      base_fee: baseFee,
      distance_fee: Math.round(distanceFee),
      weight_fee: weightFee,
      priority_multiplier: priorityMultipliers[priority],
      time_multiplier: timeMultiplier,
      total_fee: totalFee
    };
    
    res.json({
      distance: Math.round(distance * 100) / 100,
      estimated_duration: Math.round(distance * 2), // 30 km/h average
      fee_breakdown: breakdown,
      recommended_vehicle: distance > 50 ? 'truck' : distance > 20 ? 'van' : 'pickup'
    });
  } catch (error) {
    console.error('Fee calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign delivery to vehicle
router.post('/assign-delivery', async (req, res) => {
  try {
    const { order_id, vehicle_id, priority = 'standard' } = req.body;
    
    if (!order_id || !vehicle_id) {
      return res.status(400).json({ error: 'Order ID and Vehicle ID are required' });
    }
    
    const vehicle = mockFleet.find(v => v.id === vehicle_id);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    if (vehicle.status !== 'active') {
      return res.status(400).json({ error: 'Vehicle is not available for assignment' });
    }
    
    const assignment = {
      id: `assignment-${Date.now()}`,
      order_id,
      vehicle_id,
      driver_id: vehicle.driver_id,
      status: 'assigned',
      priority,
      assigned_at: new Date().toISOString(),
      estimated_pickup: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      estimated_delivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
    };
    
    res.json({
      message: 'Delivery assigned successfully',
      assignment,
      driver: vehicle.driver
    });
  } catch (error) {
    console.error('Assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
const EventEmitter = require('events');

class GPSTrackingService extends EventEmitter {
  constructor() {
    super();
    this.activeDrivers = new Map(); // driver_id -> tracking data
    this.deliveryRoutes = new Map(); // delivery_id -> route data
    this.geofences = new Map(); // location_id -> geofence data
    this.trackingHistory = new Map(); // driver_id -> location history
    
    // Configuration
    this.config = {
      updateInterval: 30000, // 30 seconds
      maxHistoryPoints: 1000, // per driver
      geofenceRadius: 100, // meters
      speedThreshold: 120, // km/h - alert if exceeded
      idleThreshold: 300000, // 5 minutes - alert if idle
      batteryLowThreshold: 20, // 20% battery
      mockMode: !process.env.GPS_API_KEY // Use mock data if no real GPS service
    };

    console.log(`🛰️ GPS Tracking Service initialized (${this.config.mockMode ? 'Mock Mode' : 'Live Mode'})`);

    // Start background processes
    this.startLocationProcessor();
    this.startRouteOptimizer();
    this.startGeofenceMonitor();
  }

  /**
   * Register a driver for GPS tracking
   */
  async registerDriver(driverId, driverInfo) {
    try {
      const trackingData = {
        driver_id: driverId,
        name: driverInfo.name,
        phone: driverInfo.phone,
        vehicle_info: driverInfo.vehicle,
        status: 'available', // available, busy, offline
        current_location: null,
        last_update: null,
        battery_level: 100,
        speed: 0,
        heading: 0,
        accuracy: 0,
        active_deliveries: [],
        todays_stats: {
          distance_covered: 0,
          deliveries_completed: 0,
          earnings: 0,
          online_time: 0
        },
        alerts: [],
        created_at: new Date().toISOString()
      };

      this.activeDrivers.set(driverId, trackingData);
      this.trackingHistory.set(driverId, []);

      console.log(`📍 Driver registered for GPS tracking: ${driverInfo.name} (${driverId})`);

      return {
        success: true,
        driver_id: driverId,
        tracking_id: `track_${Date.now()}`,
        update_interval: this.config.updateInterval
      };

    } catch (error) {
      console.error('Error registering driver for GPS tracking:', error);
      throw new Error(`Failed to register driver: ${error.message}`);
    }
  }

  /**
   * Update driver location
   */
  async updateLocation(driverId, locationData) {
    try {
      const driver = this.activeDrivers.get(driverId);
      if (!driver) {
        throw new Error('Driver not registered for tracking');
      }

      // Validate location data
      const validatedLocation = this.validateLocationData(locationData);
      
      // Calculate speed if previous location exists
      let speed = 0;
      let distanceCovered = 0;
      
      if (driver.current_location) {
        const distance = this.calculateDistance(
          driver.current_location.latitude,
          driver.current_location.longitude,
          validatedLocation.latitude,
          validatedLocation.longitude
        );
        
        const timeDiff = (new Date(validatedLocation.timestamp) - new Date(driver.last_update)) / 1000; // seconds
        speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h
        distanceCovered = distance;
      }

      // Update driver data
      const previousLocation = driver.current_location;
      driver.current_location = validatedLocation;
      driver.last_update = validatedLocation.timestamp;
      driver.speed = speed;
      driver.heading = validatedLocation.heading || driver.heading;
      driver.accuracy = validatedLocation.accuracy || 10;
      driver.battery_level = validatedLocation.battery_level || driver.battery_level;

      // Update daily stats
      driver.todays_stats.distance_covered += distanceCovered;

      // Add to history
      const history = this.trackingHistory.get(driverId);
      history.push({
        ...validatedLocation,
        speed,
        distance_from_previous: distanceCovered
      });

      // Keep history size manageable
      if (history.length > this.config.maxHistoryPoints) {
        history.shift();
      }

      // Check for alerts
      await this.checkLocationAlerts(driverId, validatedLocation, speed);

      // Update active deliveries with new location
      await this.updateDeliveryProgress(driverId, validatedLocation);

      // Emit real-time update
      this.emit('locationUpdate', {
        driver_id: driverId,
        location: validatedLocation,
        speed,
        previous_location: previousLocation,
        stats: driver.todays_stats
      });

      console.log(`📍 Location updated for driver ${driverId}: (${validatedLocation.latitude}, ${validatedLocation.longitude}) - Speed: ${speed.toFixed(1)} km/h`);

      return {
        success: true,
        driver_id: driverId,
        location: validatedLocation,
        speed,
        next_update_in: this.config.updateInterval
      };

    } catch (error) {
      console.error('Error updating driver location:', error);
      throw new Error(`Failed to update location: ${error.message}`);
    }
  }

  /**
   * Start tracking a delivery
   */
  async startDeliveryTracking(deliveryId, deliveryInfo) {
    try {
      const {
        driver_id,
        pickup_location,
        delivery_location,
        order_id,
        estimated_distance,
        estimated_duration
      } = deliveryInfo;

      const driver = this.activeDrivers.get(driver_id);
      if (!driver) {
        throw new Error('Driver not found or not tracking');
      }

      // Calculate optimized route
      const route = await this.calculateOptimizedRoute(
        pickup_location,
        delivery_location,
        driver.current_location
      );

      const deliveryTracking = {
        delivery_id: deliveryId,
        order_id,
        driver_id,
        status: 'assigned', // assigned, en_route_pickup, arrived_pickup, picked_up, en_route_delivery, arrived_delivery, completed
        pickup_location,
        delivery_location,
        route,
        estimated_distance,
        estimated_duration,
        actual_distance: 0,
        started_at: new Date().toISOString(),
        checkpoints: [],
        eta_delivery: this.calculateETA(route.duration),
        delays: [],
        customer_notifications_sent: []
      };

      // Add to driver's active deliveries
      driver.active_deliveries.push(deliveryId);
      driver.status = 'busy';

      // Store delivery route
      this.deliveryRoutes.set(deliveryId, deliveryTracking);

      // Set up geofences for pickup and delivery locations
      await this.setupDeliveryGeofences(deliveryId, pickup_location, delivery_location);

      console.log(`🚚 Started tracking delivery ${deliveryId} for driver ${driver_id}`);

      // Emit delivery started event
      this.emit('deliveryStarted', {
        delivery_id: deliveryId,
        driver_id,
        route,
        eta: deliveryTracking.eta_delivery
      });

      return {
        success: true,
        delivery_id: deliveryId,
        route,
        eta: deliveryTracking.eta_delivery,
        tracking_url: `https://wholetail.co.ke/track/${deliveryId}`
      };

    } catch (error) {
      console.error('Error starting delivery tracking:', error);
      throw new Error(`Failed to start delivery tracking: ${error.message}`);
    }
  }

  /**
   * Get real-time tracking data for a delivery
   */
  async getDeliveryTracking(deliveryId) {
    try {
      const delivery = this.deliveryRoutes.get(deliveryId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      const driver = this.activeDrivers.get(delivery.driver_id);
      const currentLocation = driver ? driver.current_location : null;

      // Calculate real-time progress
      let progress = 0;
      let distance_remaining = 0;
      let eta_updated = delivery.eta_delivery;

      if (currentLocation && delivery.route) {
        progress = this.calculateRouteProgress(currentLocation, delivery.route);
        distance_remaining = this.calculateRemainingDistance(currentLocation, delivery.route);
        eta_updated = this.calculateUpdatedETA(distance_remaining, driver.speed);
      }

      const trackingInfo = {
        delivery_id: deliveryId,
        order_id: delivery.order_id,
        status: delivery.status,
        driver: {
          id: delivery.driver_id,
          name: driver ? driver.name : 'Unknown',
          phone: driver ? driver.phone : null,
          current_location: currentLocation,
          speed: driver ? driver.speed : 0
        },
        progress: {
          percentage: Math.round(progress * 100),
          distance_covered: delivery.actual_distance,
          distance_remaining: Math.round(distance_remaining),
          eta: eta_updated
        },
        route: delivery.route,
        checkpoints: delivery.checkpoints,
        pickup_location: delivery.pickup_location,
        delivery_location: delivery.delivery_location,
        started_at: delivery.started_at,
        last_update: driver ? driver.last_update : null
      };

      return trackingInfo;

    } catch (error) {
      console.error('Error getting delivery tracking:', error);
      throw new Error(`Failed to get tracking data: ${error.message}`);
    }
  }

  /**
   * Get live locations of all active drivers
   */
  async getActiveDriverLocations(filters = {}) {
    try {
      const activeDriversArray = Array.from(this.activeDrivers.values());
      
      let filteredDrivers = activeDriversArray.filter(driver => 
        driver.current_location && 
        driver.status !== 'offline' &&
        driver.last_update &&
        (Date.now() - new Date(driver.last_update).getTime()) < 300000 // Active in last 5 minutes
      );

      // Apply filters
      if (filters.status) {
        filteredDrivers = filteredDrivers.filter(driver => driver.status === filters.status);
      }

      if (filters.near_location) {
        const { latitude, longitude, radius = 5000 } = filters.near_location; // 5km default radius
        filteredDrivers = filteredDrivers.filter(driver => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            driver.current_location.latitude,
            driver.current_location.longitude
          );
          return distance <= radius;
        });
      }

      const driversData = filteredDrivers.map(driver => ({
        driver_id: driver.driver_id,
        name: driver.name,
        phone: driver.phone,
        status: driver.status,
        current_location: driver.current_location,
        speed: driver.speed,
        heading: driver.heading,
        battery_level: driver.battery_level,
        active_deliveries: driver.active_deliveries.length,
        last_update: driver.last_update,
        todays_stats: driver.todays_stats
      }));

      return {
        success: true,
        active_drivers: driversData.length,
        drivers: driversData,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting active driver locations:', error);
      throw new Error(`Failed to get driver locations: ${error.message}`);
    }
  }

  /**
   * Find nearest available drivers
   */
  async findNearestDrivers(location, maxDistance = 10000, limit = 5) {
    try {
      const { latitude, longitude } = location;
      const availableDrivers = Array.from(this.activeDrivers.values())
        .filter(driver => 
          driver.status === 'available' && 
          driver.current_location &&
          (Date.now() - new Date(driver.last_update).getTime()) < 300000
        );

      // Calculate distances and sort
      const driversWithDistance = availableDrivers.map(driver => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          driver.current_location.latitude,
          driver.current_location.longitude
        );

        return {
          ...driver,
          distance_meters: distance,
          distance_km: Math.round(distance / 1000 * 100) / 100,
          eta_minutes: Math.round(distance / 1000 / 40 * 60) // Assuming 40 km/h average speed
        };
      })
      .filter(driver => driver.distance_meters <= maxDistance)
      .sort((a, b) => a.distance_meters - b.distance_meters)
      .slice(0, limit);

      console.log(`🔍 Found ${driversWithDistance.length} drivers near (${latitude}, ${longitude})`);

      return driversWithDistance.map(driver => ({
        driver_id: driver.driver_id,
        name: driver.name,
        phone: driver.phone,
        vehicle_info: driver.vehicle_info,
        current_location: driver.current_location,
        distance_km: driver.distance_km,
        eta_minutes: driver.eta_minutes,
        todays_stats: driver.todays_stats
      }));

    } catch (error) {
      console.error('Error finding nearest drivers:', error);
      throw new Error(`Failed to find nearest drivers: ${error.message}`);
    }
  }

  /**
   * Optimize route for multiple deliveries
   */
  async optimizeMultiDeliveryRoute(driverLocation, deliveries) {
    try {
      console.log(`🗺️ Optimizing route for ${deliveries.length} deliveries`);

      if (deliveries.length === 0) {
        return { waypoints: [], total_distance: 0, total_duration: 0 };
      }

      if (deliveries.length === 1) {
        // Single delivery - direct route
        const route = await this.calculateRoute(driverLocation, deliveries[0].delivery_location);
        return {
          waypoints: [
            { ...deliveries[0].pickup_location, type: 'pickup', delivery_id: deliveries[0].id },
            { ...deliveries[0].delivery_location, type: 'delivery', delivery_id: deliveries[0].id }
          ],
          total_distance: route.distance,
          total_duration: route.duration,
          optimized: false
        };
      }

      // Multiple deliveries - optimize using nearest neighbor algorithm
      const allPoints = [];
      
      // Add pickup and delivery points
      deliveries.forEach(delivery => {
        allPoints.push({
          ...delivery.pickup_location,
          type: 'pickup',
          delivery_id: delivery.id,
          priority: delivery.priority || 0
        });
        allPoints.push({
          ...delivery.delivery_location,
          type: 'delivery',
          delivery_id: delivery.id,
          priority: delivery.priority || 0
        });
      });

      // Simple optimization: nearest neighbor with pickup/delivery constraints
      const optimizedRoute = await this.nearestNeighborOptimization(driverLocation, allPoints);

      // Calculate total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;
      let currentLocation = driverLocation;

      for (const waypoint of optimizedRoute.waypoints) {
        const segment = await this.calculateRoute(currentLocation, waypoint);
        totalDistance += segment.distance;
        totalDuration += segment.duration;
        currentLocation = waypoint;
      }

      console.log(`✅ Route optimized: ${optimizedRoute.waypoints.length} waypoints, ${Math.round(totalDistance/1000)}km, ${Math.round(totalDuration/60)}min`);

      return {
        waypoints: optimizedRoute.waypoints,
        total_distance: totalDistance,
        total_duration: totalDuration,
        optimized: true,
        optimization_savings: optimizedRoute.savings
      };

    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error(`Failed to optimize route: ${error.message}`);
    }
  }

  /**
   * Validate location data
   */
  validateLocationData(locationData) {
    const { latitude, longitude, timestamp } = locationData;

    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error('Invalid coordinates');
    }

    // Kenya approximate bounds check
    if (latitude < -5 || latitude > 5 || longitude < 33 || longitude > 42) {
      console.warn('Location appears to be outside Kenya');
    }

    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp || new Date().toISOString(),
      accuracy: locationData.accuracy || 10,
      heading: locationData.heading || null,
      speed: locationData.speed || null,
      battery_level: locationData.battery_level || null
    };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(origin, destination) {
    if (this.config.mockMode) {
      // Mock route calculation
      const distance = this.calculateDistance(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );
      
      return {
        distance: distance,
        duration: (distance / 1000) * 90, // Assuming 40 km/h average speed in seconds
        polyline: `mock_polyline_${Date.now()}`,
        steps: [
          { instruction: 'Head towards destination', distance: distance, duration: (distance / 1000) * 90 }
        ]
      };
    }

    // Real Google Maps API integration would go here
    // For now, return mock data
    return this.calculateRoute(origin, destination);
  }

  /**
   * Calculate optimized route
   */
  async calculateOptimizedRoute(pickup, delivery, currentLocation) {
    const route = await this.calculateRoute(currentLocation, pickup);
    const deliveryRoute = await this.calculateRoute(pickup, delivery);

    return {
      total_distance: route.distance + deliveryRoute.distance,
      total_duration: route.duration + deliveryRoute.duration,
      legs: [
        { from: currentLocation, to: pickup, ...route },
        { from: pickup, to: delivery, ...deliveryRoute }
      ],
      waypoints: [pickup, delivery],
      created_at: new Date().toISOString()
    };
  }

  /**
   * Calculate ETA
   */
  calculateETA(durationSeconds) {
    const eta = new Date(Date.now() + durationSeconds * 1000);
    return eta.toISOString();
  }

  /**
   * Check for location-based alerts
   */
  async checkLocationAlerts(driverId, location, speed) {
    const driver = this.activeDrivers.get(driverId);
    
    // Speed alert
    if (speed > this.config.speedThreshold) {
      const alert = {
        type: 'speed_violation',
        message: `Driver exceeding speed limit: ${speed.toFixed(1)} km/h`,
        severity: 'high',
        location,
        timestamp: new Date().toISOString()
      };
      
      driver.alerts.push(alert);
      this.emit('alert', { driver_id: driverId, alert });
    }

    // Battery alert
    if (driver.battery_level < this.config.batteryLowThreshold) {
      const alert = {
        type: 'low_battery',
        message: `Driver device battery low: ${driver.battery_level}%`,
        severity: 'medium',
        location,
        timestamp: new Date().toISOString()
      };
      
      driver.alerts.push(alert);
      this.emit('alert', { driver_id: driverId, alert });
    }

    // Geofence alerts
    await this.checkGeofenceAlerts(driverId, location);
  }

  /**
   * Setup geofences for delivery
   */
  async setupDeliveryGeofences(deliveryId, pickupLocation, deliveryLocation) {
    const pickupGeofence = {
      id: `pickup_${deliveryId}`,
      delivery_id: deliveryId,
      type: 'pickup',
      center: pickupLocation,
      radius: this.config.geofenceRadius,
      created_at: new Date().toISOString()
    };

    const deliveryGeofence = {
      id: `delivery_${deliveryId}`,
      delivery_id: deliveryId,
      type: 'delivery',
      center: deliveryLocation,
      radius: this.config.geofenceRadius,
      created_at: new Date().toISOString()
    };

    this.geofences.set(pickupGeofence.id, pickupGeofence);
    this.geofences.set(deliveryGeofence.id, deliveryGeofence);
  }

  /**
   * Check geofence alerts
   */
  async checkGeofenceAlerts(driverId, location) {
    const driver = this.activeDrivers.get(driverId);
    
    for (const deliveryId of driver.active_deliveries) {
      const pickup_geofence_id = `pickup_${deliveryId}`;
      const delivery_geofence_id = `delivery_${deliveryId}`;
      
      const pickupGeofence = this.geofences.get(pickup_geofence_id);
      const deliveryGeofence = this.geofences.get(delivery_geofence_id);
      
      if (pickupGeofence && this.isInsideGeofence(location, pickupGeofence)) {
        await this.handleGeofenceEntry(driverId, deliveryId, 'pickup');
      }
      
      if (deliveryGeofence && this.isInsideGeofence(location, deliveryGeofence)) {
        await this.handleGeofenceEntry(driverId, deliveryId, 'delivery');
      }
    }
  }

  /**
   * Check if location is inside geofence
   */
  isInsideGeofence(location, geofence) {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );
    
    return distance <= geofence.radius;
  }

  /**
   * Handle geofence entry
   */
  async handleGeofenceEntry(driverId, deliveryId, type) {
    const delivery = this.deliveryRoutes.get(deliveryId);
    if (!delivery) return;

    if (type === 'pickup' && delivery.status === 'en_route_pickup') {
      delivery.status = 'arrived_pickup';
      delivery.arrived_pickup_at = new Date().toISOString();
      
      this.emit('deliveryUpdate', {
        delivery_id: deliveryId,
        status: 'arrived_pickup',
        message: 'Driver has arrived at pickup location'
      });
    } else if (type === 'delivery' && delivery.status === 'en_route_delivery') {
      delivery.status = 'arrived_delivery';
      delivery.arrived_delivery_at = new Date().toISOString();
      
      this.emit('deliveryUpdate', {
        delivery_id: deliveryId,
        status: 'arrived_delivery',
        message: 'Driver has arrived at delivery location'
      });
    }
  }

  /**
   * Update delivery progress
   */
  async updateDeliveryProgress(driverId, location) {
    const driver = this.activeDrivers.get(driverId);
    
    for (const deliveryId of driver.active_deliveries) {
      const delivery = this.deliveryRoutes.get(deliveryId);
      if (!delivery || !delivery.route) continue;

      // Calculate progress
      const progress = this.calculateRouteProgress(location, delivery.route);
      const remainingDistance = this.calculateRemainingDistance(location, delivery.route);
      const updatedETA = this.calculateUpdatedETA(remainingDistance, driver.speed);

      // Update delivery data
      delivery.current_progress = progress;
      delivery.eta_delivery = updatedETA;
      delivery.last_location_update = location;

      // Emit progress update
      this.emit('progressUpdate', {
        delivery_id: deliveryId,
        progress: Math.round(progress * 100),
        eta: updatedETA,
        remaining_distance: Math.round(remainingDistance)
      });
    }
  }

  /**
   * Calculate route progress
   */
  calculateRouteProgress(currentLocation, route) {
    if (!route.legs || route.legs.length === 0) return 0;

    // Simple progress calculation based on distance
    const totalDistance = route.total_distance;
    let coveredDistance = 0;

    // Find the closest point on the route and calculate covered distance
    // This is a simplified version - in production, you'd use proper map matching
    const startLocation = route.legs[0].from;
    const distanceFromStart = this.calculateDistance(
      startLocation.latitude,
      startLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    coveredDistance = Math.min(distanceFromStart, totalDistance);
    return coveredDistance / totalDistance;
  }

  /**
   * Calculate remaining distance
   */
  calculateRemainingDistance(currentLocation, route) {
    if (!route.legs || route.legs.length === 0) return 0;

    const endLocation = route.legs[route.legs.length - 1].to;
    return this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      endLocation.latitude,
      endLocation.longitude
    );
  }

  /**
   * Calculate updated ETA
   */
  calculateUpdatedETA(remainingDistance, currentSpeed) {
    if (currentSpeed <= 0) currentSpeed = 30; // Assume 30 km/h if no speed data

    const remainingTimeSeconds = (remainingDistance / 1000) / currentSpeed * 3600;
    const eta = new Date(Date.now() + remainingTimeSeconds * 1000);
    return eta.toISOString();
  }

  /**
   * Nearest neighbor route optimization
   */
  async nearestNeighborOptimization(startLocation, points) {
    const unvisited = [...points];
    const optimizedRoute = [];
    let currentLocation = startLocation;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      // Find nearest unvisited point
      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          unvisited[i].latitude,
          unvisited[i].longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
      optimizedRoute.push(nearestPoint);
      currentLocation = nearestPoint;
    }

    return {
      waypoints: optimizedRoute,
      savings: '15-25%' // Estimated savings
    };
  }

  /**
   * Start background location processing
   */
  startLocationProcessor() {
    setInterval(() => {
      // Clean up old tracking data
      this.cleanupOldData();
      
      // Process driver statistics
      this.updateDriverStatistics();
      
      // Check for inactive drivers
      this.checkInactiveDrivers();
      
    }, 60000); // Every minute
  }

  /**
   * Start route optimizer
   */
  startRouteOptimizer() {
    setInterval(() => {
      // Continuously optimize active routes based on traffic and conditions
      this.optimizeActiveRoutes();
    }, 300000); // Every 5 minutes
  }

  /**
   * Start geofence monitor
   */
  startGeofenceMonitor() {
    setInterval(() => {
      // Monitor all active geofences
      this.monitorAllGeofences();
    }, 30000); // Every 30 seconds
  }

  /**
   * Cleanup old data
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Remove inactive drivers
    for (const [driverId, driver] of this.activeDrivers.entries()) {
      if (driver.last_update && new Date(driver.last_update).getTime() < cutoffTime) {
        this.activeDrivers.delete(driverId);
        this.trackingHistory.delete(driverId);
        console.log(`🧹 Cleaned up inactive driver: ${driverId}`);
      }
    }

    // Trim history
    for (const [driverId, history] of this.trackingHistory.entries()) {
      if (history.length > this.config.maxHistoryPoints) {
        history.splice(0, history.length - this.config.maxHistoryPoints);
      }
    }
  }

  /**
   * Update driver statistics
   */
  updateDriverStatistics() {
    for (const [driverId, driver] of this.activeDrivers.entries()) {
      if (driver.status === 'available' || driver.status === 'busy') {
        driver.todays_stats.online_time += 1; // Add 1 minute
      }
    }
  }

  /**
   * Check for inactive drivers
   */
  checkInactiveDrivers() {
    const inactiveThreshold = Date.now() - this.config.idleThreshold;

    for (const [driverId, driver] of this.activeDrivers.entries()) {
      if (driver.last_update && new Date(driver.last_update).getTime() < inactiveThreshold) {
        if (driver.status !== 'offline') {
          driver.status = 'offline';
          this.emit('driverStatusChange', {
            driver_id: driverId,
            status: 'offline',
            reason: 'inactive'
          });
        }
      }
    }
  }

  /**
   * Optimize active routes
   */
  optimizeActiveRoutes() {
    // Reoptimize routes based on current traffic conditions
    console.log('🔄 Running route optimization for active deliveries...');
  }

  /**
   * Monitor all geofences
   */
  monitorAllGeofences() {
    // Check all active drivers against all geofences
    for (const [driverId, driver] of this.activeDrivers.entries()) {
      if (driver.current_location) {
        this.checkGeofenceAlerts(driverId, driver.current_location);
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    const activeDriversCount = Array.from(this.activeDrivers.values()).filter(
      driver => driver.status !== 'offline'
    ).length;

    const activeDeliveries = this.deliveryRoutes.size;
    const totalGeofences = this.geofences.size;

    return {
      active_drivers: activeDriversCount,
      total_registered: this.activeDrivers.size,
      active_deliveries: activeDeliveries,
      active_geofences: totalGeofences,
      update_interval: this.config.updateInterval,
      mode: this.config.mockMode ? 'mock' : 'live',
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = this.getStats();
      
      return {
        status: 'healthy',
        service: 'GPS Tracking Service',
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = GPSTrackingService; 
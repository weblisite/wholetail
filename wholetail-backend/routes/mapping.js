const express = require('express');
const { google } = require('googleapis');
const { supabase } = require('../config/database');
const router = express.Router();

// Initialize Google Maps API
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

// Geocode an address
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    if (!googleMapsApiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    // Use Google Maps Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}&region=ke`
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.results.length) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry.location;
    const formattedAddress = result.formatted_address;

    res.json({
      latitude: lat,
      longitude: lng,
      formatted_address: formattedAddress,
      address_components: result.address_components
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Calculate distance between two points
router.post('/distance', async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    if (!googleMapsApiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    // Format coordinates or addresses for API
    const originStr = typeof origin === 'object' 
      ? `${origin.latitude},${origin.longitude}` 
      : origin;
    const destinationStr = typeof destination === 'object' 
      ? `${destination.latitude},${destination.longitude}` 
      : destination;

    // Use Google Maps Distance Matrix API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destinationStr)}&mode=${mode}&units=metric&key=${googleMapsApiKey}&region=ke`
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.rows.length || !data.rows[0].elements.length) {
      return res.status(404).json({ error: 'Unable to calculate distance' });
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      return res.status(404).json({ error: 'Route not found' });
    }

    const distanceKm = element.distance.value / 1000; // Convert meters to kilometers
    const durationMinutes = element.duration.value / 60; // Convert seconds to minutes

    res.json({
      distance: {
        text: element.distance.text,
        value: element.distance.value,
        kilometers: distanceKm
      },
      duration: {
        text: element.duration.text,
        value: element.duration.value,
        minutes: durationMinutes
      },
      origin_addresses: data.origin_addresses[0],
      destination_addresses: data.destination_addresses[0]
    });

  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ error: 'Distance calculation failed' });
  }
});

// Calculate delivery fee based on distance and weight
router.post('/delivery-fee', async (req, res) => {
  try {
    const { weight, origin, destination } = req.body;

    if (!weight || !origin || !destination) {
      return res.status(400).json({ error: 'Weight, origin, and destination are required' });
    }

    // First calculate distance
    const distanceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/mapping/distance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ origin, destination })
    });

    if (!distanceResponse.ok) {
      return res.status(400).json({ error: 'Unable to calculate distance' });
    }

    const distanceData = await distanceResponse.json();
    const distanceKm = distanceData.distance.kilometers;

    // Calculate delivery fee based on Wholetail pricing model
    const baseWeightLimit = parseFloat(process.env.BASE_WEIGHT_LIMIT) || 90;
    const baseFee = parseFloat(process.env.BASE_DELIVERY_FEE) || 300;
    const additionalDistanceFee = parseFloat(process.env.ADDITIONAL_DISTANCE_FEE) || 100;
    const distanceThreshold = parseFloat(process.env.DISTANCE_THRESHOLD) || 100;

    // Calculate number of 90kg units
    const weightUnits = Math.ceil(weight / baseWeightLimit);
    
    // Base fee for first 100km
    let totalFee = baseFee * weightUnits;
    
    // Additional fee for distance beyond 100km
    if (distanceKm > distanceThreshold) {
      const additionalDistance = distanceKm - distanceThreshold;
      const additionalDistanceUnits = Math.ceil(additionalDistance / distanceThreshold);
      totalFee += (additionalDistanceFee * additionalDistanceUnits * weightUnits);
    }

    res.json({
      distance: distanceData.distance,
      duration: distanceData.duration,
      weight: weight,
      weight_units: weightUnits,
      delivery_fee: totalFee,
      fee_breakdown: {
        base_fee: baseFee * weightUnits,
        additional_distance_fee: distanceKm > distanceThreshold ? 
          (Math.ceil((distanceKm - distanceThreshold) / distanceThreshold) * additionalDistanceFee * weightUnits) : 0,
        total_fee: totalFee
      }
    });

  } catch (error) {
    console.error('Delivery fee calculation error:', error);
    res.status(500).json({ error: 'Delivery fee calculation failed' });
  }
});

// Get optimized route for multiple destinations
router.post('/optimize-route', async (req, res) => {
  try {
    const { origin, destinations } = req.body;

    if (!origin || !destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({ error: 'Origin and destinations array are required' });
    }

    if (!googleMapsApiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    // Format waypoints for optimization
    const waypoints = destinations.map(dest => 
      typeof dest === 'object' ? `${dest.latitude},${dest.longitude}` : dest
    ).join('|');

    // Use Google Maps Directions API with waypoint optimization
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}&waypoints=optimize:true|${waypoints}&key=${googleMapsApiKey}&region=ke`
    );

    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(400).json({ error: 'Unable to optimize route' });
    }

    const route = data.routes[0];
    const optimizedOrder = route.waypoint_order;
    const legs = route.legs;

    // Calculate total distance and duration
    const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value, 0);

    res.json({
      optimized_waypoint_order: optimizedOrder,
      total_distance: {
        text: `${(totalDistance / 1000).toFixed(1)} km`,
        value: totalDistance,
        kilometers: totalDistance / 1000
      },
      total_duration: {
        text: `${Math.round(totalDuration / 60)} mins`,
        value: totalDuration,
        minutes: totalDuration / 60
      },
      legs: legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        start_address: leg.start_address,
        end_address: leg.end_address
      })),
      polyline: route.overview_polyline.points
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ error: 'Route optimization failed' });
  }
});

// Cache frequent routes to reduce API calls
router.post('/cache-route', async (req, res) => {
  try {
    const { origin, destination, distance_km, duration_minutes } = req.body;

    if (!origin || !destination || !distance_km || !duration_minutes) {
      return res.status(400).json({ error: 'All route data fields are required' });
    }

    // Cache the route in Supabase
    const { data, error } = await supabase
      .from('route_cache')
      .upsert({
        origin: typeof origin === 'object' ? JSON.stringify(origin) : origin,
        destination: typeof destination === 'object' ? JSON.stringify(destination) : destination,
        distance_km,
        duration_minutes,
        cached_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to cache route' });
    }

    res.json({ message: 'Route cached successfully', cached_route: data });

  } catch (error) {
    console.error('Route caching error:', error);
    res.status(500).json({ error: 'Route caching failed' });
  }
});

// Get cached route
router.get('/cached-route', async (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const { data, error } = await supabase
      .from('route_cache')
      .select('*')
      .or(`and(origin.eq.${origin},destination.eq.${destination}),and(origin.eq.${destination},destination.eq.${origin})`)
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Cached route not found' });
    }

    // Check if cache is still valid (e.g., within 24 hours)
    const cacheAge = new Date() - new Date(data.cached_at);
    const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (cacheAge > maxCacheAge) {
      return res.status(404).json({ error: 'Cached route expired' });
    }

    res.json({
      distance: {
        kilometers: data.distance_km,
        text: `${data.distance_km} km`
      },
      duration: {
        minutes: data.duration_minutes,
        text: `${Math.round(data.duration_minutes)} mins`
      },
      cached_at: data.cached_at
    });

  } catch (error) {
    console.error('Cached route retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve cached route' });
  }
});

module.exports = router; 
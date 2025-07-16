const express = require('express');
const router = express.Router();

// Mock location data for development
const mockLocations = {
  'nairobi': { lat: -1.2921, lng: 36.8219 },
  'nakuru': { lat: -0.3031, lng: 36.0800 },
  'kiambu': { lat: -1.1714, lng: 36.8356 },
  'meru': { lat: 0.0467, lng: 37.6556 },
  'mombasa': { lat: -4.0435, lng: 39.6682 },
  'eldoret': { lat: 0.5143, lng: 35.2698 }
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate delivery fee based on distance
function calculateDeliveryFee(distance) {
  const baseFee = 100; // KSh 100 base fee
  const perKmRate = 15; // KSh 15 per km
  const maxFee = 500; // KSh 500 maximum fee
  
  if (distance <= 5) {
    return baseFee;
  } else if (distance <= 50) {
    return Math.min(baseFee + ((distance - 5) * perKmRate), maxFee);
  } else {
    return maxFee;
  }
}

// Geocode address to coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Mock geocoding for development
    const normalizedAddress = address.toLowerCase();
    let coordinates = null;
    
    // Try to match with known locations
    for (const [city, coords] of Object.entries(mockLocations)) {
      if (normalizedAddress.includes(city)) {
        coordinates = coords;
        break;
      }
    }
    
    // Default to Nairobi if no match found
    if (!coordinates) {
      coordinates = mockLocations['nairobi'];
    }

    const result = {
      address,
      coordinates,
      formatted_address: `${address}, Kenya`,
      place_id: `mock_place_id_${Date.now()}`
    };

    res.json(result);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate distance between two locations
router.post('/distance', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const distance = calculateDistance(
      origin.lat, origin.lng,
      destination.lat, destination.lng
    );

    const result = {
      distance: Math.round(distance * 100) / 100,
      duration: Math.round(distance * 2), // Assume 30 km/h average speed
      delivery_fee: calculateDeliveryFee(distance),
      status: 'OK'
    };

    res.json(result);
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery tracking information
router.get('/delivery-tracking/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Mock delivery tracking data
    const mockDeliveryData = {
      order_id: orderId,
      driver: {
        name: 'John Kiprotich',
        phone: '+254701234567',
        vehicle: 'Toyota Hiace - KBC 123A'
      },
      pickup_location: {
        address: 'Nakuru Farm',
        coordinates: mockLocations['nakuru'],
        timestamp: new Date(Date.now() - 120 * 60000).toISOString()
      },
      delivery_location: {
        address: 'Nairobi CBD',
        coordinates: mockLocations['nairobi'],
        estimated_arrival: new Date(Date.now() + 60 * 60000).toISOString()
      },
      current_location: {
        coordinates: {
          lat: mockLocations['nakuru'].lat + 0.02,
          lng: mockLocations['nakuru'].lng + 0.02
        },
        timestamp: new Date().toISOString()
      },
      status: 'in_transit',
      updates: [
        {
          id: '1',
          timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
          status: 'pickup',
          message: 'Order picked up from seller',
          location: mockLocations['nakuru']
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
          status: 'in_transit',
          message: 'In transit to delivery location',
          location: {
            lat: mockLocations['nakuru'].lat + 0.01,
            lng: mockLocations['nakuru'].lng + 0.01
          }
        }
      ]
    };

    res.json(mockDeliveryData);
  } catch (error) {
    console.error('Delivery tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery status
router.patch('/delivery-tracking/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, message } = req.body;
    
    // Mock status update
    const update = {
      order_id: orderId,
      status,
      location: location || mockLocations['nairobi'],
      message: message || `Order status updated to ${status}`,
      timestamp: new Date().toISOString()
    };

    res.json(update);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby delivery drivers
router.get('/drivers/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Mock nearby drivers
    const mockDrivers = [
      {
        id: 'driver-1',
        name: 'John Kiprotich',
        phone: '+254701234567',
        vehicle: 'Toyota Hiace - KBC 123A',
        rating: 4.8,
        location: {
          lat: parseFloat(lat) + 0.01,
          lng: parseFloat(lng) + 0.01
        },
        distance: 1.2,
        estimated_arrival: 15
      },
      {
        id: 'driver-2',
        name: 'Mary Wanjiku',
        phone: '+254709876543',
        vehicle: 'Nissan Pickup - KCA 456B',
        rating: 4.9,
        location: {
          lat: parseFloat(lat) - 0.01,
          lng: parseFloat(lng) - 0.01
        },
        distance: 1.8,
        estimated_arrival: 20
      }
    ];

    // Filter drivers within radius
    const nearbyDrivers = mockDrivers.filter(driver => driver.distance <= radius);

    res.json({ drivers: nearbyDrivers });
  } catch (error) {
    console.error('Nearby drivers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
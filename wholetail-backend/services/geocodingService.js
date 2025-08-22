const axios = require('axios');

/**
 * Geocoding Service for Wholetail Platform
 * Handles location-based services including address geocoding, reverse geocoding,
 * and distance calculations for delivery and logistics
 */
class GeocodingService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'placeholder';
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    this.distanceMatrixUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    
    // Mock data for development when API key is not configured
    this.mockLocations = [
      {
        address: 'Nairobi, Kenya',
        latitude: -1.2921,
        longitude: 36.8219,
        formatted_address: 'Nairobi, Kenya',
        place_id: 'ChIJp0lN2HIRLxgRVwYjHybhDAE'
      },
      {
        address: 'Mombasa, Kenya',
        latitude: -4.0435,
        longitude: 39.6682,
        formatted_address: 'Mombasa, Kenya',
        place_id: 'ChIJD_FLneL7HhgRg_cSBW4LdAQ'
      },
      {
        address: 'Kisumu, Kenya',
        latitude: -0.0917,
        longitude: 34.7680,
        formatted_address: 'Kisumu, Kenya',
        place_id: 'ChIJ8y3W3BMYHRQR1VzQf0zZoQY'
      },
      {
        address: 'Nakuru, Kenya',
        latitude: -0.3031,
        longitude: 36.0800,
        formatted_address: 'Nakuru, Kenya',
        place_id: 'ChIJw7qVr0QbLxgRUQHi5Hp8F2A'
      }
    ];

    this.initializeService();
  }

  initializeService() {
    if (this.googleMapsApiKey === 'placeholder') {
      console.log('⚠️  Google Maps API key not configured, using mock geocoding service');
    } else {
      console.log('✅ Google Maps Geocoding Service initialized');
    }
  }

  /**
   * Convert address to coordinates (latitude, longitude)
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} Location data with coordinates
   */
  async geocodeAddress(address) {
    try {
      // Use mock data if API key not configured
      if (this.googleMapsApiKey === 'placeholder') {
        return this.getMockLocation(address);
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          address: address,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;

        return {
          success: true,
          data: {
            address: address,
            formatted_address: result.formatted_address,
            latitude: location.lat,
            longitude: location.lng,
            place_id: result.place_id,
            address_components: result.address_components
          }
        };
      } else {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        success: false,
        error: error.message,
        mock_data: this.getMockLocation(address)
      };
    }
  }

  /**
   * Convert coordinates to address (reverse geocoding)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude  
   * @returns {Promise<Object>} Address data
   */
  async reverseGeocode(latitude, longitude) {
    try {
      // Use mock data if API key not configured
      if (this.googleMapsApiKey === 'placeholder') {
        return this.getMockAddressFromCoords(latitude, longitude);
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];

        return {
          success: true,
          data: {
            latitude: latitude,
            longitude: longitude,
            formatted_address: result.formatted_address,
            place_id: result.place_id,
            address_components: result.address_components
          }
        };
      } else {
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        success: false,
        error: error.message,
        mock_data: this.getMockAddressFromCoords(latitude, longitude)
      };
    }
  }

  /**
   * Calculate distance and duration between two points
   * @param {Object} origin - Origin coordinates {lat, lng}
   * @param {Object} destination - Destination coordinates {lat, lng}
   * @returns {Promise<Object>} Distance and duration data
   */
  async calculateDistance(origin, destination) {
    try {
      // Use mock data if API key not configured
      if (this.googleMapsApiKey === 'placeholder') {
        return this.getMockDistance(origin, destination);
      }

      const response = await axios.get(this.distanceMatrixUrl, {
        params: {
          origins: `${origin.lat},${origin.lng}`,
          destinations: `${destination.lat},${destination.lng}`,
          key: this.googleMapsApiKey,
          units: 'metric'
        }
      });

      if (response.data.status === 'OK' && 
          response.data.rows[0].elements[0].status === 'OK') {
        
        const element = response.data.rows[0].elements[0];

        return {
          success: true,
          data: {
            origin: origin,
            destination: destination,
            distance: {
              text: element.distance.text,
              value: element.distance.value // meters
            },
            duration: {
              text: element.duration.text,
              value: element.duration.value // seconds
            }
          }
        };
      } else {
        throw new Error('Distance calculation failed');
      }

    } catch (error) {
      console.error('Distance calculation error:', error);
      return {
        success: false,
        error: error.message,
        mock_data: this.getMockDistance(origin, destination)
      };
    }
  }

  /**
   * Get delivery cost estimate based on distance and weight
   * @param {Object} origin - Origin coordinates
   * @param {Object} destination - Destination coordinates  
   * @param {number} weight - Package weight in kg
   * @returns {Promise<Object>} Delivery cost estimate
   */
  async getDeliveryCostEstimate(origin, destination, weight = 1) {
    try {
      const distanceResult = await this.calculateDistance(origin, destination);
      
      if (!distanceResult.success) {
        throw new Error('Failed to calculate distance for delivery cost');
      }

      const distanceKm = distanceResult.data.distance.value / 1000; // Convert to km
      const baseRate = 100; // KSh per km
      const weightMultiplier = Math.max(1, Math.ceil(weight / 10)); // Every 10kg adds multiplier
      const minimumCharge = 200; // Minimum delivery charge

      const estimatedCost = Math.max(
        minimumCharge,
        Math.round(distanceKm * baseRate * weightMultiplier)
      );

      return {
        success: true,
        data: {
          ...distanceResult.data,
          weight: weight,
          estimated_cost: estimatedCost,
          currency: 'KSh',
          base_rate_per_km: baseRate,
          weight_multiplier: weightMultiplier,
          minimum_charge: minimumCharge
        }
      };

    } catch (error) {
      console.error('Delivery cost estimation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get mock location data for development
   * @param {string} address - Address query
   * @returns {Object} Mock location data
   */
  getMockLocation(address) {
    // Try to find a matching mock location
    const matchingLocation = this.mockLocations.find(loc => 
      loc.address.toLowerCase().includes(address.toLowerCase()) ||
      address.toLowerCase().includes(loc.address.toLowerCase())
    );

    if (matchingLocation) {
      return {
        success: true,
        mock: true,
        data: matchingLocation
      };
    }

    // Return Nairobi as default
    return {
      success: true,
      mock: true,
      data: {
        address: address,
        formatted_address: `${address}, Kenya`,
        latitude: -1.2921,
        longitude: 36.8219,
        place_id: 'mock_place_id'
      }
    };
  }

  /**
   * Get mock address from coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Object} Mock address data
   */
  getMockAddressFromCoords(latitude, longitude) {
    return {
      success: true,
      mock: true,
      data: {
        latitude: latitude,
        longitude: longitude,
        formatted_address: 'Mock Address, Nairobi, Kenya',
        place_id: 'mock_place_id'
      }
    };
  }

  /**
   * Calculate mock distance between two points
   * @param {Object} origin - Origin coordinates
   * @param {Object} destination - Destination coordinates
   * @returns {Object} Mock distance data
   */
  getMockDistance(origin, destination) {
    // Simple distance calculation using Haversine formula approximation
    const R = 6371; // Earth radius in km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLng = (destination.lng - origin.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    const distanceMeters = Math.round(distance * 1000);
    const durationSeconds = Math.round(distance * 120); // Assume 30 km/h average speed

    return {
      success: true,
      mock: true,
      data: {
        origin: origin,
        destination: destination,
        distance: {
          text: `${distance.toFixed(1)} km`,
          value: distanceMeters
        },
        duration: {
          text: `${Math.round(durationSeconds / 60)} mins`,
          value: durationSeconds
        }
      }
    };
  }

  /**
   * Batch geocode multiple addresses
   * @param {string[]} addresses - Array of addresses to geocode
   * @returns {Promise<Object[]>} Array of geocoded locations
   */
  async batchGeocode(addresses) {
    const results = [];
    
    for (const address of addresses) {
      try {
        const result = await this.geocodeAddress(address);
        results.push({
          address: address,
          ...result
        });
        
        // Add delay to respect API rate limits
        if (this.googleMapsApiKey !== 'placeholder') {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        results.push({
          address: address,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = GeocodingService;
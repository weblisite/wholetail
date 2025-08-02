const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'placeholder',
  api_key: process.env.CLOUDINARY_API_KEY || 'placeholder',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'placeholder'
};

// Initialize Cloudinary if we have real credentials
if (cloudinaryConfig.cloud_name !== 'placeholder' && 
    cloudinaryConfig.api_key !== 'placeholder' && 
    cloudinaryConfig.api_secret !== 'placeholder') {
  cloudinary.config(cloudinaryConfig);
  console.log('✅ Cloudinary storage initialized successfully');
} else {
  console.warn('⚠️  Cloudinary credentials not configured. File upload will not work.');
  console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
}

const storage = {
  /**
   * Upload a file to Cloudinary
   * @param {Buffer|string} file - File buffer or base64 string
   * @param {Object} options - Upload options
   * @param {string} options.folder - Folder to upload to
   * @param {string} options.resource_type - Resource type (image, video, raw, auto)
   * @param {string} options.public_id - Custom public ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, options = {}) {
    try {
      if (cloudinaryConfig.cloud_name === 'placeholder') {
        return {
          success: false,
          error: 'Cloudinary not configured',
          url: null
        };
      }

      const uploadOptions = {
        folder: options.folder || 'wholetail',
        resource_type: options.resource_type || 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        ...options
      };

      const result = await cloudinary.uploader.upload(file, uploadOptions);

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message,
        url: null
      };
    }
  },

  /**
   * Upload product image
   * @param {Buffer|string} file - Image file
   * @param {string} productId - Product ID for naming
   * @returns {Promise<Object>} Upload result
   */
  async uploadProductImage(file, productId) {
    return this.uploadFile(file, {
      folder: 'wholetail/products',
      public_id: `product_${productId}_${Date.now()}`,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
  },

  /**
   * Upload user document (ID, license, etc.)
   * @param {Buffer|string} file - Document file
   * @param {string} userId - User ID
   * @param {string} docType - Document type (id, license, etc.)
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocument(file, userId, docType) {
    return this.uploadFile(file, {
      folder: 'wholetail/documents',
      public_id: `user_${userId}_${docType}_${Date.now()}`,
      resource_type: 'auto'
    });
  },

  /**
   * Upload order receipt
   * @param {Buffer|string} file - Receipt file
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadReceipt(file, orderId) {
    return this.uploadFile(file, {
      folder: 'wholetail/receipts',
      public_id: `receipt_${orderId}_${Date.now()}`,
      resource_type: 'auto'
    });
  },

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Public ID of the file to delete
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId, resourceType = 'image') {
    try {
      if (cloudinaryConfig.cloud_name === 'placeholder') {
        return {
          success: false,
          error: 'Cloudinary not configured'
        };
      }

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Generate optimized image URL
   * @param {string} publicId - Public ID of the image
   * @param {Object} transformations - Image transformations
   * @returns {string} Optimized image URL
   */
  getOptimizedImageUrl(publicId, transformations = {}) {
    if (cloudinaryConfig.cloud_name === 'placeholder') {
      return null;
    }

    const defaultTransformations = {
      quality: 'auto',
      fetch_format: 'auto'
    };

    return cloudinary.url(publicId, {
      ...defaultTransformations,
      ...transformations
    });
  }
};

module.exports = storage;
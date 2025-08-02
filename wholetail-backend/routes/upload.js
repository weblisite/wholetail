const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/clerk-auth');
const storage = require('../services/storage');
const router = express.Router();

// Configure multer for file upload
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// Upload product image
router.post('/product-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Convert file to base64 for Cloudinary
    const fileBuffer = req.file.buffer;
    const base64File = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;

    const result = await storage.uploadProductImage(base64File, productId);

    if (result.success) {
      res.json({
        success: true,
        url: result.url,
        public_id: result.public_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Product image upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload user document
router.post('/document', requireAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { docType } = req.body;
    const userId = req.auth.userId;

    if (!docType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Convert file to base64 for Cloudinary
    const fileBuffer = req.file.buffer;
    const base64File = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;

    const result = await storage.uploadDocument(base64File, userId, docType);

    if (result.success) {
      res.json({
        success: true,
        url: result.url,
        public_id: result.public_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload order receipt
router.post('/receipt', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Convert file to base64 for Cloudinary
    const fileBuffer = req.file.buffer;
    const base64File = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;

    const result = await storage.uploadReceipt(base64File, orderId);

    if (result.success) {
      res.json({
        success: true,
        url: result.url,
        public_id: result.public_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete uploaded file
router.delete('/file/:publicId', requireAuth, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType } = req.query;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    const result = await storage.deleteFile(publicId, resourceType);

    if (result.success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get optimized image URL
router.get('/optimize/:publicId', (req, res) => {
  try {
    const { publicId } = req.params;
    const transformations = req.query;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    const optimizedUrl = storage.getOptimizedImageUrl(publicId, transformations);

    if (optimizedUrl) {
      res.json({
        success: true,
        url: optimizedUrl
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate optimized URL'
      });
    }
  } catch (error) {
    console.error('Image optimization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
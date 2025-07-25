const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Mock data for development
const mockProducts = [
  {
    id: '1',
    name: 'Fresh Tomatoes',
    description: 'Premium quality tomatoes from Nakuru farms',
    category: 'Vegetables',
    price_per_unit: 120,
    unit_type: 'kg',
    minimum_order_quantity: 5,
    availability_status: 'available',
    image_url: null,
    seller_id: 'farmer-1',
    users: {
      name: 'Peter Kamau',
      type: 'farmer',
      location: 'Nakuru'
    }
  },
  {
    id: '2',
    name: 'White Maize',
    description: 'Grade A white maize suitable for human consumption',
    category: 'Grains',
    price_per_unit: 80,
    unit_type: 'kg',
    minimum_order_quantity: 90,
    availability_status: 'available',
    image_url: null,
    seller_id: 'farmer-2',
    users: {
      name: 'Sarah Wanjiku',
      type: 'farmer',
      location: 'Kiambu'
    }
  },
  {
    id: '3',
    name: 'Fresh Milk',
    description: 'Pure cow milk from dairy farms',
    category: 'Dairy',
    price_per_unit: 60,
    unit_type: 'liter',
    minimum_order_quantity: 10,
    availability_status: 'available',
    image_url: null,
    seller_id: 'farmer-3',
    users: {
      name: 'John Mwangi',
      type: 'farmer',
      location: 'Meru'
    }
  }
];

const mockCategories = ['Vegetables', 'Grains', 'Dairy', 'Fruits', 'Legumes'];

// Get all products with search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      min_price, 
      max_price, 
      location,
      page = 1, 
      limit = 20 
    } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder')) {
      console.log('Using mock products data for development');
      
      let filteredProducts = [...mockProducts];
      
      // Apply search filter
      if (search) {
        filteredProducts = filteredProducts.filter(product => 
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.description.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Apply category filter
      if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category);
      }
      
      // Apply price range filter
      if (min_price) {
        filteredProducts = filteredProducts.filter(product => product.price_per_unit >= parseFloat(min_price));
      }
      if (max_price) {
        filteredProducts = filteredProducts.filter(product => product.price_per_unit <= parseFloat(max_price));
      }
      
      // Apply location filter
      if (location) {
        filteredProducts = filteredProducts.filter(product => product.users.location.includes(location));
      }
      
      return res.json({ 
        products: filteredProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredProducts.length
        }
      });
    }

    // Real Supabase implementation
    let query = supabase
      .from('product_listings')
      .select('*')
      .eq('is_active', true);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category);
    }

    // Apply price range filter
    if (min_price) {
      query = query.gte('price', parseFloat(min_price));
    }
    if (max_price) {
      query = query.lte('price', parseFloat(max_price));
    }

    // Apply location filter
    if (location) {
      query = query.ilike('supplier_address', `%${location}%`);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await query
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      products: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock categories data for development');
      return res.json({ categories: mockCategories });
    }

    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const categories = [...new Set(data.map(item => item.category))];
    res.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock product data for development');
      const product = mockProducts.find(p => p.id === req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.json({ product });
    }

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        users:seller_id (
          name,
          type,
          phone,
          location,
          verification_status
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: data });
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products for a specific seller (wholesaler)
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { 
      status,
      category, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock seller products data for development');
      
      let filteredProducts = mockProducts.filter(product => product.seller_id === sellerId);
      
      // Apply status filter
      if (status) {
        filteredProducts = filteredProducts.filter(product => product.availability_status === status);
      }
      
      // Apply category filter
      if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category);
      }
      
      return res.json({ 
        products: filteredProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredProducts.length
        }
      });
    }

    // Real Supabase implementation
    let query = supabase
      .from('products')
      .select(`
        *,
        users:seller_id (
          name,
          type,
          location
        )
      `)
      .eq('seller_id', sellerId);

    if (status) {
      query = query.eq('availability_status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error } = await query
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      products: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: data.length
      }
    });
  } catch (error) {
    console.error('Seller products fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new product (for wholesalers)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price_per_unit,
      unit_type,
      minimum_order_quantity,
      stock_quantity,
      seller_id,
      image_url
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !price_per_unit || !unit_type || !seller_id) {
      return res.status(400).json({ 
        error: 'Name, description, category, price_per_unit, unit_type, and seller_id are required' 
      });
    }

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Creating mock product for development');
      
      const newProduct = {
        id: `product-${Date.now()}`,
        name,
        description,
        category,
        price_per_unit: parseFloat(price_per_unit),
        unit_type,
        minimum_order_quantity: parseInt(minimum_order_quantity) || 1,
        stock_quantity: parseInt(stock_quantity) || 100,
        availability_status: 'available',
        seller_id,
        image_url,
        created_at: new Date().toISOString(),
        users: {
          name: 'Mock Seller',
          type: 'wholesaler',
          location: 'Nairobi'
        }
      };

      // Add to mock data (in real app this would be persisted)
      mockProducts.push(newProduct);
      
      return res.status(201).json({ 
        success: true,
        product: newProduct,
        message: 'Product created successfully' 
      });
    }

    // Real Supabase implementation
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name,
        description,
        category,
        price_per_unit: parseFloat(price_per_unit),
        unit_type,
        minimum_order_quantity: parseInt(minimum_order_quantity) || 1,
        stock_quantity: parseInt(stock_quantity) || 100,
        availability_status: 'available',
        seller_id,
        image_url
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ 
      success: true,
      product: data,
      message: 'Product created successfully' 
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      price_per_unit,
      unit_type,
      minimum_order_quantity,
      stock_quantity,
      availability_status,
      image_url
    } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Updating mock product for development');
      
      const productIndex = mockProducts.findIndex(p => p.id === id);
      if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Update the product
      const updatedProduct = {
        ...mockProducts[productIndex],
        ...(name && { name }),
        ...(description && { description }),
        ...(category && { category }),
        ...(price_per_unit && { price_per_unit: parseFloat(price_per_unit) }),
        ...(unit_type && { unit_type }),
        ...(minimum_order_quantity && { minimum_order_quantity: parseInt(minimum_order_quantity) }),
        ...(stock_quantity && { stock_quantity: parseInt(stock_quantity) }),
        ...(availability_status && { availability_status }),
        ...(image_url && { image_url }),
        updated_at: new Date().toISOString()
      };

      mockProducts[productIndex] = updatedProduct;
      
      return res.json({ 
        success: true,
        product: updatedProduct,
        message: 'Product updated successfully' 
      });
    }

    // Real Supabase implementation
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (price_per_unit) updateData.price_per_unit = parseFloat(price_per_unit);
    if (unit_type) updateData.unit_type = unit_type;
    if (minimum_order_quantity) updateData.minimum_order_quantity = parseInt(minimum_order_quantity);
    if (stock_quantity) updateData.stock_quantity = parseInt(stock_quantity);
    if (availability_status) updateData.availability_status = availability_status;
    if (image_url) updateData.image_url = image_url;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ 
      success: true,
      product: data,
      message: 'Product updated successfully' 
    });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Deleting mock product for development');
      
      const productIndex = mockProducts.findIndex(p => p.id === id);
      if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }

      mockProducts.splice(productIndex, 1);
      
      return res.json({ 
        success: true,
        message: 'Product deleted successfully' 
      });
    }

    // Real Supabase implementation
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
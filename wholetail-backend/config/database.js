const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { eq, and, desc } = require('drizzle-orm');
const schema = require('../db/schema');
const { clerk } = require('./clerk');

// Neon configuration with safe defaults
const neonConnectionString = process.env.NEON_DATABASE_URL || 'postgresql://placeholder';

let db = null;
let sql = null;

try {
  // Check if we have real Neon credentials (not placeholders)
  if (neonConnectionString.includes('placeholder')) {
    console.warn('⚠️  Neon database credentials not configured. Using mock client for development.');
    console.warn('   Please set NEON_DATABASE_URL environment variable.');
    
    // Create mock database client for development
    const mockResponse = () => Promise.resolve([]);
    
    sql = {
      query: mockResponse,
      execute: mockResponse
    };
    
    db = {
      select: () => ({ from: () => ({ where: () => ({ execute: mockResponse }) }) }),
      insert: () => ({ into: () => ({ values: () => ({ returning: () => ({ execute: mockResponse }) }) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => ({ execute: mockResponse }) }) }) }),
      delete: () => ({ from: () => ({ where: () => ({ execute: mockResponse }) }) }),
    };
  } else {
    // Create real Neon database connection
    sql = neon(neonConnectionString);
    db = drizzle(sql, { schema });
    console.log('✅ Neon database with Drizzle initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing Neon database:', error.message);
  process.exit(1);
}

// Database helper functions using Drizzle ORM
const database = {
  // Users
  async getUserById(id) {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0] || null;
  },

  async getUserByEmail(email) {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0] || null;
  },

  async createUser(userData) {
    const { id, clerk_id, type, name, phone, email, whatsapp, address, license_number, id_number } = userData;
    const result = await db.insert(schema.users).values({
      id,
      clerkId: clerk_id,
      type,
      name,
      phone,
      email,
      whatsapp,
      address,
      licenseNumber: license_number,
      idNumber: id_number
    }).returning();
    return result[0];
  },

  async updateUser(id, updates) {
    // Convert snake_case to camelCase for Drizzle
    const drizzleUpdates = {};
    Object.keys(updates).forEach(key => {
      switch(key) {
        case 'license_number':
          drizzleUpdates.licenseNumber = updates[key];
          break;
        case 'id_number':
          drizzleUpdates.idNumber = updates[key];
          break;
        case 'verification_status':
          drizzleUpdates.verificationStatus = updates[key];
          break;
        default:
          drizzleUpdates[key] = updates[key];
      }
    });

    const result = await db.update(schema.users)
      .set(drizzleUpdates)
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  },

  async deleteUser(id) {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  },

  // Products
  async getProducts(filters = {}) {
    let query = db.select().from(schema.products).where(eq(schema.products.isActive, true));
    
    if (filters.supplier_id) {
      query = query.where(and(eq(schema.products.isActive, true), eq(schema.products.supplierId, filters.supplier_id)));
    }
    
    if (filters.category) {
      const conditions = [eq(schema.products.isActive, true), eq(schema.products.category, filters.category)];
      if (filters.supplier_id) {
        conditions.push(eq(schema.products.supplierId, filters.supplier_id));
      }
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(schema.products.createdAt));
  },

  async createProduct(productData) {
    const { supplier_id, name, description, category, price, weight, stock, image_urls } = productData;
    const result = await db.insert(schema.products).values({
      supplierId: supplier_id,
      name,
      description,
      category,
      price,
      weight,
      stock,
      imageUrls: image_urls
    }).returning();
    return result[0];
  },

  // Orders
  async getOrders(filters = {}) {
    let query = db.select().from(schema.orders);
    const conditions = [];
    
    if (filters.retailer_id) {
      conditions.push(eq(schema.orders.retailerId, filters.retailer_id));
    }
    
    if (filters.supplier_id) {
      conditions.push(eq(schema.orders.supplierId, filters.supplier_id));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(schema.orders.createdAt));
  },

  async createOrder(orderData) {
    const { retailer_id, supplier_id, products, quantities, total_cost, delivery_fee, delivery_address } = orderData;
    const result = await db.insert(schema.orders).values({
      retailerId: retailer_id,
      supplierId: supplier_id,
      products,
      quantities,
      totalCost: total_cost,
      deliveryFee: delivery_fee,
      deliveryAddress: delivery_address
    }).returning();
    return result[0];
  },

  async updateOrderStatus(id, status) {
    const result = await db.update(schema.orders)
      .set({ status })
      .where(eq(schema.orders.id, id))
      .returning();
    return result[0];
  }
};

module.exports = {
  sql,
  db,
  database,
  clerk,
  schema
}; 
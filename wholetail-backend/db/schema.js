const { pgTable, varchar, text, decimal, integer, boolean, timestamp, uuid, jsonb, pgEnum, uniqueIndex } = require('drizzle-orm/pg-core');

// Define enums
const userTypeEnum = pgEnum('user_type', ['wholesaler', 'retailer', 'farmer', 'financier']);
const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);
const orderStatusEnum = pgEnum('order_status', ['placed', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled']);
const notificationTypeEnum = pgEnum('notification_type', ['order', 'payment', 'financing', 'delivery']);
const notificationChannelEnum = pgEnum('notification_channel', ['sms', 'email', 'whatsapp']);
const financingStatusEnum = pgEnum('financing_status', ['pending', 'approved', 'repaid', 'defaulted']);

// Users table (modified for Clerk integration)
const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk user ID
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(), // Explicit Clerk ID reference
  type: userTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  whatsapp: varchar('whatsapp', { length: 20 }),
  address: text('address').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  licenseNumber: varchar('license_number', { length: 100 }), // For wholesalers/farmers
  idNumber: varchar('id_number', { length: 50 }), // For retailers
  verificationStatus: verificationStatusEnum('verification_status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products table
const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: varchar('supplier_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  weight: decimal('weight', { precision: 8, scale: 2 }).notNull(), // in kg
  stock: integer('stock').notNull().default(0),
  imageUrls: text('image_urls').array(), // Array of image URLs
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders table
const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  retailerId: varchar('retailer_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  supplierId: varchar('supplier_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  products: jsonb('products').notNull(), // Array of product details
  quantities: jsonb('quantities').notNull(), // Quantities for each product
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('placed'),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryLatitude: decimal('delivery_latitude', { precision: 10, scale: 8 }),
  deliveryLongitude: decimal('delivery_longitude', { precision: 11, scale: 8 }),
  distanceKm: decimal('distance_km', { precision: 6, scale: 2 }), // Distance in kilometers
  estimatedDelivery: timestamp('estimated_delivery'),
  actualDelivery: timestamp('actual_delivery'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Financing table
const financing = pgTable('financing', {
  id: uuid('id').defaultRandom().primaryKey(),
  retailerId: varchar('retailer_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  financierId: varchar('financier_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  loanAmount: decimal('loan_amount', { precision: 10, scale: 2 }).notNull(),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull(),
  repaymentPeriod: integer('repayment_period').notNull(), // in months
  repaymentStatus: financingStatusEnum('repayment_status').default('pending'),
  commission: decimal('commission', { precision: 10, scale: 2 }).notNull(),
  disbursedAt: timestamp('disbursed_at'),
  dueDate: timestamp('due_date'),
  repaidAt: timestamp('repaid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Notifications table
const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  sentAt: timestamp('sent_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Confidence scores table (for financing eligibility)
const confidenceScores = pgTable('confidence_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  retailerId: varchar('retailer_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  purchaseVolumeScore: integer('purchase_volume_score').notNull(), // 0-100
  repaymentHistoryScore: integer('repayment_history_score').notNull(), // 0-100
  platformActivityScore: integer('platform_activity_score').notNull(), // 0-100
  totalScore: integer('total_score').notNull(), // Calculated weighted score
  lastCalculated: timestamp('last_calculated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueRetailer: uniqueIndex('confidence_scores_retailer_id_unique').on(table.retailerId),
}));

// Route cache table (for Google Maps API optimization)
const routeCache = pgTable('route_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  distanceKm: decimal('distance_km', { precision: 6, scale: 2 }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  cachedAt: timestamp('cached_at').defaultNow(),
}, (table) => ({
  uniqueRoute: uniqueIndex('route_cache_origin_destination_unique').on(table.origin, table.destination),
}));

// Payments table
const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  commission: decimal('commission', { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
  mpesaTransactionId: varchar('mpesa_transaction_id', { length: 100 }),
  mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 100 }),
  paymentMethod: varchar('payment_method', { length: 50 }).default('mpesa'),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Delivery tracking table
const deliveryTracking = pgTable('delivery_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  driverName: varchar('driver_name', { length: 255 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  vehicleType: varchar('vehicle_type', { length: 50 }),
  vehicleNumber: varchar('vehicle_number', { length: 20 }),
  currentLatitude: decimal('current_latitude', { precision: 10, scale: 8 }),
  currentLongitude: decimal('current_longitude', { precision: 11, scale: 8 }),
  lastUpdate: timestamp('last_update').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Product reviews table
const productReviews = pgTable('product_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  reviewerId: varchar('reviewer_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Supplier ratings table (aggregated)
const supplierRatings = pgTable('supplier_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: varchar('supplier_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).notNull(),
  totalReviews: integer('total_reviews').notNull().default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  uniqueSupplier: uniqueIndex('supplier_ratings_supplier_id_unique').on(table.supplierId),
}));

module.exports = {
  userTypeEnum,
  verificationStatusEnum,
  orderStatusEnum,
  notificationTypeEnum,
  notificationChannelEnum,
  financingStatusEnum,
  users,
  products,
  orders,
  financing,
  notifications,
  confidenceScores,
  routeCache,
  payments,
  deliveryTracking,
  productReviews,
  supplierRatings,
};
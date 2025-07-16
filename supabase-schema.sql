-- Wholetail Database Schema for Supabase PostgreSQL
-- This file contains the complete database schema for the Wholetail B2B Platform

-- Enable Row Level Security
-- This will be managed through Supabase dashboard

-- Create custom types
CREATE TYPE user_type AS ENUM ('wholesaler', 'farmer', 'retailer', 'financier');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE order_status AS ENUM ('placed', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled');
CREATE TYPE notification_type AS ENUM ('order', 'payment', 'financing', 'delivery');
CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'whatsapp');
CREATE TYPE financing_status AS ENUM ('pending', 'approved', 'repaid', 'defaulted');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type user_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    whatsapp VARCHAR(20),
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    license_number VARCHAR(100), -- For wholesalers/farmers
    id_number VARCHAR(50), -- For retailers
    verification_status verification_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    weight DECIMAL(8, 2) NOT NULL, -- in kg
    stock INTEGER NOT NULL DEFAULT 0,
    image_urls TEXT[], -- Array of image URLs
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    products JSONB NOT NULL, -- Array of product details
    quantities JSONB NOT NULL, -- Quantities for each product
    total_cost DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    status order_status DEFAULT 'placed',
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    distance_km DECIMAL(6, 2), -- Distance in kilometers
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financing table
CREATE TABLE financing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    financier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_amount DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    repayment_period INTEGER NOT NULL, -- in months
    repayment_status financing_status DEFAULT 'pending',
    commission DECIMAL(10, 2) NOT NULL,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    repaid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Confidence scores table (for financing eligibility)
CREATE TABLE confidence_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purchase_volume_score INTEGER NOT NULL, -- 0-100
    repayment_history_score INTEGER NOT NULL, -- 0-100
    platform_activity_score INTEGER NOT NULL, -- 0-100
    total_score INTEGER NOT NULL, -- Calculated weighted score
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route cache table (for Google Maps API optimization)
CREATE TABLE route_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance_km DECIMAL(6, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(origin, destination)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    commission DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    mpesa_transaction_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'mpesa',
    payment_status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery tracking table
CREATE TABLE delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(20),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product reviews table
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier ratings table (aggregated)
CREATE TABLE supplier_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    average_rating DECIMAL(3, 2) NOT NULL,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_location ON users(latitude, longitude);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_retailer ON orders(retailer_id);
CREATE INDEX idx_orders_supplier ON orders(supplier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_confidence_scores_retailer ON confidence_scores(retailer_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_delivery_tracking_order ON delivery_tracking(order_id);
CREATE INDEX idx_route_cache_lookup ON route_cache(origin, destination);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financing_updated_at BEFORE UPDATE ON financing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confidence_scores_updated_at BEFORE UPDATE ON confidence_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- This can be uncommented for initial testing

/*
-- Sample wholesaler/farmer
INSERT INTO users (type, name, phone, email, address, latitude, longitude, license_number, verification_status) 
VALUES 
    ('wholesaler', 'Gikomba Traders Ltd', '+254700000001', 'gikomba@example.com', 'Gikomba Market, Nairobi', -1.2921, 36.8219, 'LIC001', 'verified'),
    ('farmer', 'Kiambu Fresh Produce', '+254700000002', 'kiambu@example.com', 'Kiambu Town, Kiambu', -1.1719, 36.8356, 'LIC002', 'verified');

-- Sample retailer
INSERT INTO users (type, name, phone, email, address, latitude, longitude, id_number, verification_status) 
VALUES 
    ('retailer', 'Mama Njeri Shop', '+254700000003', 'njeri@example.com', 'Westlands, Nairobi', -1.2676, 36.8108, 'ID123456', 'verified');

-- Sample financier
INSERT INTO users (type, name, phone, email, address, license_number, verification_status) 
VALUES 
    ('financier', 'Nairobi Micro Finance', '+254700000004', 'finance@example.com', 'CBD, Nairobi', 'FIN001', 'verified');

-- Sample products
INSERT INTO products (supplier_id, name, description, category, price, weight, stock, image_urls) 
VALUES 
    ((SELECT id FROM users WHERE email = 'gikomba@example.com'), 'Maize Flour 2kg', 'High quality maize flour', 'FMCG', 150.00, 2.0, 500, '{"https://example.com/maize1.jpg"}'),
    ((SELECT id FROM users WHERE email = 'kiambu@example.com'), 'Fresh Tomatoes', 'Fresh tomatoes from Kiambu', 'vegetables', 80.00, 1.0, 200, '{"https://example.com/tomatoes1.jpg"}');
*/

-- Row Level Security Policies (to be configured in Supabase dashboard)
-- These policies ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Note: Specific RLS policies should be created in Supabase dashboard
-- based on user authentication and business requirements

-- Create a view for supplier listings with ratings
CREATE VIEW supplier_listings AS
SELECT 
    u.id,
    u.type,
    u.name,
    u.phone,
    u.email,
    u.address,
    u.latitude,
    u.longitude,
    u.verification_status,
    COALESCE(sr.average_rating, 0) as average_rating,
    COALESCE(sr.total_reviews, 0) as total_reviews,
    u.created_at
FROM users u
LEFT JOIN supplier_ratings sr ON u.id = sr.supplier_id
WHERE u.type IN ('wholesaler', 'farmer') AND u.verification_status = 'verified';

-- Create a view for product listings with supplier info
CREATE VIEW product_listings AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.category,
    p.price,
    p.weight,
    p.stock,
    p.image_urls,
    p.is_active,
    p.created_at,
    u.name as supplier_name,
    u.address as supplier_address,
    u.latitude as supplier_latitude,
    u.longitude as supplier_longitude,
    COALESCE(sr.average_rating, 0) as supplier_rating
FROM products p
JOIN users u ON p.supplier_id = u.id
LEFT JOIN supplier_ratings sr ON u.id = sr.supplier_id
WHERE p.is_active = true AND u.verification_status = 'verified';

-- Function to calculate confidence score
CREATE OR REPLACE FUNCTION calculate_confidence_score(retailer_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    purchase_score INTEGER := 0;
    repayment_score INTEGER := 0;
    activity_score INTEGER := 0;
    total_score INTEGER := 0;
    total_spent DECIMAL := 0;
    total_orders INTEGER := 0;
    successful_repayments INTEGER := 0;
    total_loans INTEGER := 0;
    last_order_days INTEGER := 0;
BEGIN
    -- Calculate purchase volume score (50% weight)
    SELECT COALESCE(SUM(total_cost), 0), COUNT(*) 
    INTO total_spent, total_orders
    FROM orders 
    WHERE retailer_id = retailer_uuid;
    
    -- Score based on spending (0-100)
    purchase_score := LEAST(100, (total_spent / 10000) * 100);
    
    -- Calculate repayment history score (40% weight)
    SELECT 
        COUNT(CASE WHEN repayment_status = 'repaid' THEN 1 END),
        COUNT(*)
    INTO successful_repayments, total_loans
    FROM financing 
    WHERE retailer_id = retailer_uuid;
    
    IF total_loans > 0 THEN
        repayment_score := (successful_repayments * 100) / total_loans;
    ELSE
        repayment_score := 50; -- Default score for new users
    END IF;
    
    -- Calculate activity score (10% weight)
    SELECT COALESCE(DATE_PART('day', NOW() - MAX(created_at)), 999)
    INTO last_order_days
    FROM orders 
    WHERE retailer_id = retailer_uuid;
    
    -- Recent activity gets higher score
    activity_score := GREATEST(0, 100 - last_order_days);
    
    -- Calculate weighted total score
    total_score := (purchase_score * 0.5) + (repayment_score * 0.4) + (activity_score * 0.1);
    
    -- Insert or update confidence score
    INSERT INTO confidence_scores (retailer_id, purchase_volume_score, repayment_history_score, platform_activity_score, total_score)
    VALUES (retailer_uuid, purchase_score, repayment_score, activity_score, total_score)
    ON CONFLICT (retailer_id) DO UPDATE SET
        purchase_volume_score = EXCLUDED.purchase_volume_score,
        repayment_history_score = EXCLUDED.repayment_history_score,
        platform_activity_score = EXCLUDED.platform_activity_score,
        total_score = EXCLUDED.total_score,
        last_calculated = NOW(),
        updated_at = NOW();
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update supplier ratings
CREATE OR REPLACE FUNCTION update_supplier_rating(supplier_uuid UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL;
    review_count INTEGER;
BEGIN
    SELECT AVG(rating), COUNT(*)
    INTO avg_rating, review_count
    FROM product_reviews pr
    JOIN products p ON pr.product_id = p.id
    WHERE p.supplier_id = supplier_uuid;
    
    INSERT INTO supplier_ratings (supplier_id, average_rating, total_reviews)
    VALUES (supplier_uuid, COALESCE(avg_rating, 0), COALESCE(review_count, 0))
    ON CONFLICT (supplier_id) DO UPDATE SET
        average_rating = EXCLUDED.average_rating,
        total_reviews = EXCLUDED.total_reviews,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update supplier ratings when a review is added
CREATE OR REPLACE FUNCTION trigger_update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_supplier_rating((SELECT supplier_id FROM products WHERE id = NEW.product_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_rating_trigger
    AFTER INSERT ON product_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_update_supplier_rating();

-- Create storage buckets (to be created in Supabase dashboard)
-- 1. product-images (for product photos)
-- 2. documents (for verification documents)
-- 3. receipts (for order receipts)

-- This schema provides a comprehensive foundation for the Wholetail platform
-- Next steps: Create the database in Supabase and run this schema 
-- Enhanced affiliate tracking tables
CREATE TABLE affiliate_links (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT REFERENCES cards(id) ON DELETE CASCADE,
  affiliate_id BIGINT REFERENCES affiliates(id) ON DELETE CASCADE,
  tracking_url VARCHAR(1000) NOT NULL,
  original_url VARCHAR(1000) NOT NULL,
  click_count BIGINT DEFAULT 0,
  conversion_count BIGINT DEFAULT 0,
  revenue DOUBLE PRECISION DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced click tracking with more details
ALTER TABLE clicks ADD COLUMN conversion_value DOUBLE PRECISION DEFAULT 0;
ALTER TABLE clicks ADD COLUMN session_id VARCHAR(255);
ALTER TABLE clicks ADD COLUMN device_type VARCHAR(50);
ALTER TABLE clicks ADD COLUMN location VARCHAR(100);

-- Commission tracking
CREATE TABLE commissions (
  id BIGSERIAL PRIMARY KEY,
  affiliate_id BIGINT REFERENCES affiliates(id) ON DELETE CASCADE,
  card_id BIGINT REFERENCES cards(id) ON DELETE CASCADE,
  click_id BIGINT REFERENCES clicks(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payout_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription enhancements
CREATE TABLE subscription_plans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  features JSONB,
  max_downloads BIGINT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced subscriptions table
ALTER TABLE subscriptions ADD COLUMN plan_id BIGINT REFERENCES subscription_plans(id);
ALTER TABLE subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT true;
ALTER TABLE subscriptions ADD COLUMN trial_end TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN discount_applied DOUBLE PRECISION DEFAULT 0;

-- User preferences and recommendations
CREATE TABLE user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories BIGINT[],
  preferred_tags TEXT[],
  price_range_min DOUBLE PRECISION,
  price_range_max DOUBLE PRECISION,
  notification_settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- User interactions for recommendations
CREATE TABLE user_interactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  card_id BIGINT REFERENCES cards(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'like', 'bookmark', 'purchase', 'share', 'download')),
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications system
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Content moderation
CREATE TABLE moderation_queue (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT REFERENCES cards(id) ON DELETE CASCADE,
  submitted_by BIGINT REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
  reviewer_id BIGINT REFERENCES users(id),
  review_notes TEXT,
  auto_moderation_score DOUBLE PRECISION,
  flags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- Add content approval status to cards
ALTER TABLE cards ADD COLUMN moderation_status VARCHAR(50) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'needs_review'));
ALTER TABLE cards ADD COLUMN auto_moderation_score DOUBLE PRECISION;

-- Indexes for performance
CREATE INDEX idx_affiliate_links_card ON affiliate_links(card_id);
CREATE INDEX idx_affiliate_links_affiliate ON affiliate_links(affiliate_id);
CREATE INDEX idx_clicks_session ON clicks(session_id);
CREATE INDEX idx_clicks_device ON clicks(device_type);
CREATE INDEX idx_commissions_affiliate ON commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_card ON user_interactions(card_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_moderation_status ON moderation_queue(status);
CREATE INDEX idx_cards_moderation ON cards(moderation_status);
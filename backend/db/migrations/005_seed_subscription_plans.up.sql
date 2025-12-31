-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_period, features, max_downloads, is_active) VALUES
(
  'Free',
  'Basic access to platform features',
  0.00,
  'monthly',
  '{"features": ["Browse free content", "Limited bookmarks", "Basic support"]}',
  10,
  true
),
(
  'Monthly Pro',
  'Full access to all premium content',
  9.99,
  'monthly',
  '{"features": ["Unlimited premium content", "Priority support", "Advanced analytics", "Download resources", "No ads"]}',
  100,
  true
),
(
  'Yearly Pro',
  'Full access with annual savings',
  99.99,
  'yearly',
  '{"features": ["Unlimited premium content", "Priority support", "Advanced analytics", "Download resources", "No ads", "Early access to new features"]}',
  0,
  true
),
(
  'Lifetime',
  'One-time payment for lifetime access',
  299.99,
  'lifetime',
  '{"features": ["Unlimited everything", "VIP support", "Advanced analytics", "Unlimited downloads", "No ads", "Early access", "Exclusive community"]}',
  0,
  true
)
ON CONFLICT DO NOTHING;

-- Insert default analytics funnel
INSERT INTO analytics_funnels (name, steps, is_active) VALUES
(
  'Purchase Funnel',
  '[
    {"name": "landing_page", "description": "User visits landing page"},
    {"name": "browse_cards", "description": "User browses cards"},
    {"name": "view_card", "description": "User views card details"},
    {"name": "add_to_cart", "description": "User adds to cart"},
    {"name": "checkout", "description": "User reaches checkout"},
    {"name": "purchase", "description": "User completes purchase"}
  ]',
  true
),
(
  'Signup Funnel',
  '[
    {"name": "visit", "description": "User visits site"},
    {"name": "view_auth", "description": "User views auth page"},
    {"name": "start_signup", "description": "User starts signup"},
    {"name": "complete_signup", "description": "User completes signup"}
  ]',
  true
)
ON CONFLICT DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
('AI Tools', 'ai-tools', 'Artificial Intelligence tools and platforms'),
('Machine Learning', 'machine-learning', 'Machine learning models and frameworks'),
('Tutorials', 'tutorials', 'Learning tutorials and guides'),
('Articles', 'articles', 'Educational articles and blog posts'),
('Templates', 'templates', 'Ready-to-use templates and resources');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, name, password_hash, role) VALUES
('admin@guideitsol.com', 'Admin User', '$2b$10$k8Y6DJZUO7hj4PlSvJqXmOJ7KV1gOGGOCOX5t.r7.8EXOZKxOJ0Xi', 'admin');

-- Insert sample cards
INSERT INTO cards (title, slug, description, preview_content, full_content, images, price, tags, category_id, is_premium) VALUES
('ChatGPT Pro Guide', 'chatgpt-pro-guide', 'Complete guide to using ChatGPT for professional tasks', 'Learn the basics of ChatGPT...', 'Full comprehensive guide with advanced techniques...', ARRAY['https://example.com/chatgpt1.jpg'], 29.99, ARRAY['chatgpt', 'ai', 'productivity'], 1, true),
('Free AI Image Generator', 'free-ai-image-generator', 'Free tool for generating AI images', 'Generate stunning images with AI...', 'Complete tutorial on AI image generation...', ARRAY['https://example.com/ai-image1.jpg'], 0, ARRAY['ai', 'images', 'free'], 1, false),
('Python ML Tutorial', 'python-ml-tutorial', 'Learn machine learning with Python', 'Introduction to machine learning...', 'Complete Python ML course with examples...', ARRAY['https://example.com/python1.jpg'], 49.99, ARRAY['python', 'machine-learning'], 2, true);

-- Insert sample coupons
INSERT INTO coupons (code, discount_type, discount_value, usage_limit, cashback_percentage, expires_at) VALUES
('WELCOME20', 'percentage', 20, 100, 5, CURRENT_TIMESTAMP + INTERVAL '30 days'),
('SAVE10', 'fixed', 10, 50, 2, CURRENT_TIMESTAMP + INTERVAL '15 days');

-- Execute this SQL to fix the "System Error" and initialize Maintenance Mode settings

INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES 
('maintenance_mode', 'false'),
('maintenance_secret', 'ilk_kurulum_anahtari_12345'), 
('maintenance_target_date', '2025-12-30 09:00:00');

-- After running this, the magic link usage will work.
-- You should then go to Admin Panel -> Maintenance Mode and generate a new random key.

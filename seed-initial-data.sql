-- Seed initial data for your Supabase project
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Seed app_settings (signup toggle)
INSERT INTO app_settings (key, value)
VALUES ('signup_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Seed initial site_config (empty config — defaults come from code)
INSERT INTO site_config (config)
VALUES ('{}'::jsonb)
ON CONFLICT DO NOTHING;

-- 3. Verify tables were created
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

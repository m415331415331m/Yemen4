/*
# Add governorates, expand electricity/water providers, add admin management tables

## Overview
1. Adds governorates reference table with Yemeni governorates
2. Expands electricity providers to cover all major Yemeni governorates
3. Expands water providers to cover all major Yemeni governorates
4. Updates brand colors to match real companies
5. Adds admin_users table for admin authentication
6. Adds admin_activity audit log

## Security
- RLS enabled on all new tables
- admin_users uses TO anon, authenticated (no Supabase auth)
- Passwords hashed with bcrypt
*/

-- ============================================
-- GOVERNORATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  code text UNIQUE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE governorates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_governorates" ON governorates;
CREATE POLICY "anon_select_governorates" ON governorates FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO governorates (name_ar, name_en, code, sort_order) VALUES
  ('صنعاء', 'Sanaa', 'sanaa', 1),
  ('عدن', 'Aden', 'aden', 2),
  ('تعز', 'Taiz', 'taiz', 3),
  ('الحديدة', 'Hodeidah', 'hodeidah', 4),
  ('حضرموت', 'Hadhramaut', 'hadhramaut', 5),
  ('إب', 'Ibb', 'ibb', 6),
  ('ذمار', 'Dhamar', 'dhamar', 7),
  ('المكلا', 'Mukalla', 'mukalla', 8),
  ('حجة', 'Hajjah', 'hajjah', 9),
  ('صعدة', 'Saada', 'saada', 10),
  ('مأرب', 'Marib', 'marib', 11),
  ('البيضاء', 'Al-Bayda', 'bayda', 12),
  ('لحج', 'Lahj', 'lahj', 13),
  ('أبين', 'Abyan', 'abyan', 14),
  ('شبوة', 'Shabwa', 'shabwa', 15),
  ('المهرة', 'Al-Mahra', 'mahra', 16),
  ('الجوف', 'Al-Jawf', 'jawf', 17),
  ('عمران', 'Amran', 'amran', 18),
  ('الضالع', 'Al-Dalea', 'dalea', 19),
  ('ريمة', 'Raymah', 'raymah', 20),
  ('المحويت', 'Al-Mahwit', 'mahwit', 21),
  ('سقطرى', 'Socotra', 'socotra', 22)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admin_users" ON admin_users;
CREATE POLICY "anon_select_admin_users" ON admin_users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_users" ON admin_users;
CREATE POLICY "anon_insert_admin_users" ON admin_users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admin_users" ON admin_users;
CREATE POLICY "anon_update_admin_users" ON admin_users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_admin_users" ON admin_users;
CREATE POLICY "anon_delete_admin_users" ON admin_users FOR DELETE
  TO anon, authenticated USING (true);

-- Default admin: username=admin, password=admin123
INSERT INTO admin_users (username, password_hash, display_name, role)
SELECT 'admin', crypt('admin123', gen_salt('bf')), 'المدير العام', 'super_admin'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

-- ============================================
-- ADMIN ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_username text,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admin_activity" ON admin_activity;
CREATE POLICY "anon_select_admin_activity" ON admin_activity FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_activity" ON admin_activity;
CREATE POLICY "anon_insert_admin_activity" ON admin_activity FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity(created_at DESC);

-- ============================================
-- ADD GEVERNORATE_ID TO SERVICE_PROVIDERS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_providers' AND column_name = 'governorate_id'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN governorate_id uuid REFERENCES governorates(id);
  END IF;
END $$;

-- ============================================
-- ADD GEVERNORATE_ID TO FUEL_STATIONS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fuel_stations' AND column_name = 'governorate_id'
  ) THEN
    ALTER TABLE fuel_stations ADD COLUMN governorate_id uuid REFERENCES governorates(id);
  END IF;
END $$;

-- ============================================
-- ADD ELECTRICITY PROVIDERS BY GOVERNORATE
-- ============================================
DO $$
DECLARE
  gov_rec RECORD;
BEGIN
  FOR gov_rec IN
    SELECT id, code, name_ar, name_en FROM governorates
    WHERE code IN ('sanaa', 'aden', 'taiz', 'hodeidah', 'hadhramaut', 'ibb', 'dhamar', 'mukalla')
    ORDER BY sort_order
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM service_providers
      WHERE type = 'electricity' AND code = 'elec_' || gov_rec.code
    ) THEN
      INSERT INTO service_providers (code, name_ar, name_en, type, icon_name, brand_color, is_active, sort_order, phone_prefixes, governorate_id)
      VALUES (
        'elec_' || gov_rec.code,
        'كهرباء ' || gov_rec.name_ar,
        COALESCE(gov_rec.name_en, gov_rec.name_ar) || ' Electricity',
        'electricity',
        'Zap',
        '#1565C0',
        true,
        30,
        ARRAY[]::text[],
        gov_rec.id
      );
    END IF;
  END LOOP;
END $$;

-- ============================================
-- ADD WATER PROVIDERS BY GOVERNORATE
-- ============================================
DO $$
DECLARE
  gov_rec RECORD;
BEGIN
  FOR gov_rec IN
    SELECT id, code, name_ar, name_en FROM governorates
    WHERE code IN ('sanaa', 'aden', 'taiz', 'hodeidah', 'mukalla', 'ibb', 'dhamar', 'hadhramaut')
    ORDER BY sort_order
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM service_providers
      WHERE type = 'water' AND code = 'water_' || gov_rec.code
    ) THEN
      INSERT INTO service_providers (code, name_ar, name_en, type, icon_name, brand_color, is_active, sort_order, phone_prefixes, governorate_id)
      VALUES (
        'water_' || gov_rec.code,
        'مياه ' || gov_rec.name_ar,
        COALESCE(gov_rec.name_en, gov_rec.name_ar) || ' Water',
        'water',
        'Droplet',
        '#0277BD',
        true,
        40,
        ARRAY[]::text[],
        gov_rec.id
      );
    END IF;
  END LOOP;
END $$;

-- ============================================
-- UPDATE BRAND COLORS TO MATCH REAL COMPANIES
-- ============================================
UPDATE service_providers SET brand_color = '#1A2A6C' WHERE code = 'yemen_mobile';
UPDATE service_providers SET brand_color = '#E63946' WHERE code = 'yu';
UPDATE service_providers SET brand_color = '#D32128' WHERE code = 'sabafon';
UPDATE service_providers SET brand_color = '#0066B3' WHERE code = 'way';
UPDATE service_providers SET brand_color = '#1565C0' WHERE code = 'yemen_net';

UPDATE fuel_stations SET brand_color = '#D32128' WHERE code = 'safir';
UPDATE fuel_stations SET brand_color = '#E63946' WHERE code = 'total';
UPDATE fuel_stations SET brand_color = '#1B7F3B' WHERE code = 'yemen_oil';
UPDATE fuel_stations SET brand_color = '#1565C0' WHERE code = 'baf';
UPDATE fuel_stations SET brand_color = '#E8A317' WHERE code = 'hikma';
UPDATE fuel_stations SET brand_color = '#0D9488' WHERE code = 'amal';
UPDATE fuel_stations SET brand_color = '#6E7680' WHERE code = 'yps';

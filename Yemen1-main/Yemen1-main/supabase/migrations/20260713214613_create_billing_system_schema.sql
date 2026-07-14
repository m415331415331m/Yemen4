/*
# Yemen Bills Payment System - Database Schema

## Overview
Creates the complete database schema for a Yemeni bills payment and recharge platform.
The system has two parts: a client app (no auth, uses anon key) and an admin dashboard (Supabase Auth, email/password).

## New Tables

### 1. service_providers
Stores the list of Yemeni telecom/utility companies available for payment.
- id (uuid, PK)
- code (text, unique) - e.g. 'yemen_mobile', 'yu', 'sabafon', 'way', 'yemen_net', 'electricity', 'water'
- name_ar (text) - Arabic display name
- name_en (text) - English name
- type (text) - 'mobile', 'internet', 'electricity', 'water'
- icon_name (text) - Lucide icon name for the service
- brand_color (text) - hex color for branding
- is_active (boolean, default true)
- sort_order (int, default 0)
- created_at (timestamptz)

### 2. provider_packages
Predefined recharge packages per provider (e.g. data bundles, voice plans).
- id (uuid, PK)
- provider_id (uuid, FK -> service_providers)
- name_ar (text) - package name in Arabic
- amount (numeric) - package price
- description_ar (text) - package description
- is_active (boolean, default true)
- sort_order (int, default 0)

### 3. api_settings
Stores API credentials per provider (URLs, keys, tokens, merchant IDs).
Only accessible to authenticated admin users.
- id (uuid, PK)
- provider_id (uuid, FK -> service_providers)
- api_url (text) - provider API endpoint URL
- api_key (text) - API key
- api_token (text) - API token
- api_secret (text) - API secret
- merchant_id (text) - merchant/account ID
- additional_config (jsonb) - extra provider-specific config
- is_active (boolean, default true)
- updated_at (timestamptz)

### 4. transactions
Records all payment transactions from the client app.
- id (uuid, PK)
- provider_id (uuid, FK -> service_providers)
- phone_number (text) - customer phone/account number
- customer_name (text, nullable) - customer name
- amount (numeric) - payment amount
- package_code (text, nullable) - selected package code if applicable
- status (text) - 'pending', 'success', 'failed'
- provider_transaction_id (text, nullable) - ID returned by provider
- provider_response (jsonb, nullable) - full provider response
- receipt_number (text, nullable) - generated receipt number
- error_message (text, nullable) - error details if failed
- client_token (text) - anonymous client identifier for history filtering
- created_at (timestamptz)
- completed_at (timestamptz, nullable)

## Security (RLS)
- service_providers: anon + authenticated can read (public catalog); authenticated can write (admin only)
- provider_packages: anon + authenticated can read; authenticated can write
- api_settings: authenticated ONLY can read/write (admin dashboard, never exposed to client)
- transactions: anon + authenticated can read and insert; authenticated can update (admin/edge function via service role)
*/

-- ============================================
-- 1. service_providers
-- ============================================
CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  type text NOT NULL DEFAULT 'mobile',
  icon_name text NOT NULL DEFAULT 'Smartphone',
  brand_color text NOT NULL DEFAULT '#0D9488',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_providers" ON service_providers;
CREATE POLICY "anon_read_providers" ON service_providers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_providers" ON service_providers;
CREATE POLICY "admin_insert_providers" ON service_providers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_providers" ON service_providers;
CREATE POLICY "admin_update_providers" ON service_providers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_providers" ON service_providers;
CREATE POLICY "admin_delete_providers" ON service_providers FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 2. provider_packages
-- ============================================
CREATE TABLE IF NOT EXISTS provider_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  amount numeric(10,2) NOT NULL,
  description_ar text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_packages" ON provider_packages;
CREATE POLICY "anon_read_packages" ON provider_packages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_packages" ON provider_packages;
CREATE POLICY "admin_insert_packages" ON provider_packages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_packages" ON provider_packages;
CREATE POLICY "admin_update_packages" ON provider_packages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_packages" ON provider_packages;
CREATE POLICY "admin_delete_packages" ON provider_packages FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 3. api_settings
-- ============================================
CREATE TABLE IF NOT EXISTS api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  api_url text,
  api_key text,
  api_token text,
  api_secret text,
  merchant_id text,
  additional_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_api_settings" ON api_settings;
CREATE POLICY "admin_read_api_settings" ON api_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_api_settings" ON api_settings;
CREATE POLICY "admin_insert_api_settings" ON api_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_api_settings" ON api_settings;
CREATE POLICY "admin_update_api_settings" ON api_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_api_settings" ON api_settings;
CREATE POLICY "admin_delete_api_settings" ON api_settings FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 4. transactions
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  customer_name text,
  amount numeric(10,2) NOT NULL,
  package_code text,
  status text NOT NULL DEFAULT 'pending',
  provider_transaction_id text,
  provider_response jsonb,
  receipt_number text,
  error_message text,
  client_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_transactions" ON transactions;
CREATE POLICY "anon_read_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_transactions" ON transactions;
CREATE POLICY "admin_update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_transactions" ON transactions;
CREATE POLICY "admin_delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_client_token ON transactions(client_token);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_api_settings_provider_id ON api_settings(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_packages_provider_id ON provider_packages(provider_id);

-- ============================================
-- Seed Data: Service Providers
-- ============================================
INSERT INTO service_providers (code, name_ar, name_en, type, icon_name, brand_color, sort_order) VALUES
  ('yemen_mobile', 'يمن موبايل', 'Yemen Mobile', 'mobile', 'Smartphone', '#1B7F3B', 1),
  ('yu', 'يو', 'Y', 'mobile', 'Smartphone', '#E63946', 2),
  ('sabafon', 'سبأفون', 'Sabafon', 'mobile', 'Smartphone', '#2D8659', 3),
  ('way', 'واي', 'Way Telecom', 'mobile', 'Smartphone', '#00796B', 4),
  ('yemen_net', 'يمن نت', 'Yemen Net', 'internet', 'Wifi', '#1565C0', 5),
  ('electricity', 'الكهرباء', 'Electricity', 'electricity', 'Zap', '#E8A317', 6),
  ('water', 'المياه', 'Water', 'water', 'Droplet', '#0277BD', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed Data: Provider Packages (examples)
-- ============================================
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 500 ريال', 500, 'شحن رصيد 500 ريال', 1 FROM service_providers WHERE code = 'yemen_mobile'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 1000 ريال', 1000, 'شحن رصيد 1000 ريال', 2 FROM service_providers WHERE code = 'yemen_mobile'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 2000 ريال', 2000, 'شحن رصيد 2000 ريال', 3 FROM service_providers WHERE code = 'yemen_mobile'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 500 ريال', 500, 'شحن رصيد 500 ريال', 1 FROM service_providers WHERE code = 'yu'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 1000 ريال', 1000, 'شحن رصيد 1000 ريال', 2 FROM service_providers WHERE code = 'yu'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 500 ريال', 500, 'شحن رصيد 500 ريال', 1 FROM service_providers WHERE code = 'sabafon'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 1000 ريال', 1000, 'شحن رصيد 1000 ريال', 2 FROM service_providers WHERE code = 'sabafon'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 500 ريال', 500, 'شحن رصيد 500 ريال', 1 FROM service_providers WHERE code = 'way'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 1000 ريال', 1000, 'شحن رصيد 1000 ريال', 2 FROM service_providers WHERE code = 'way'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 4 ميجا - شهري', 2000, 'إنترنت أرضي 4 ميجابت - شهر كامل', 1 FROM service_providers WHERE code = 'yemen_net'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 8 ميجا - شهري', 3500, 'إنترنت أرضي 8 ميجابت - شهر كامل', 2 FROM service_providers WHERE code = 'yemen_net'
ON CONFLICT DO NOTHING;

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, sort_order)
SELECT id, 'باقة 16 ميجا - شهري', 5500, 'إنترنت أرضي 16 ميجابت - شهر كامل', 3 FROM service_providers WHERE code = 'yemen_net'
ON CONFLICT DO NOTHING;

-- ============================================
-- Function: generate_receipt_number
-- ============================================
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  seq_val bigint;
  receipt text;
BEGIN
  SELECT nextval('receipt_seq') INTO seq_val;
  receipt := 'RCP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq_val::text, 6, '0');
  RETURN receipt;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for receipt numbers
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
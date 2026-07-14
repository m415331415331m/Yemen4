/*
# Add debts, expenses, income, and fuel station tables

## Overview
This migration adds financial management features to the Rasidi app:
- Debts tracking (money you owe, money owed to you, installments)
- Daily expenses tracking
- Monthly income tracking
- Fuel station bill payments
- Debt reminders (grocery, house, etc.)

## New Tables

### 1. debts
Tracks debts - both money the user owes and money owed to the user.
- id (uuid, primary key)
- client_token (text) - links to anonymous user
- person_name (text) - name of the person/entity
- person_type (text) - 'owed_to_me' (someone owes me) or 'i_owe' (I owe someone)
- amount (numeric) - total debt amount
- paid_amount (numeric) - amount already paid
- installments_count (integer) - number of installments (0 = lump sum)
- installments_paid (integer) - installments completed
- installment_amount (numeric) - per-installment amount
- due_date (date) - when the debt is due
- category (text) - 'grocery', 'house', 'personal', 'loan', 'other'
- notes (text)
- status (text) - 'active', 'paid', 'overdue'
- created_at, updated_at

### 2. debt_reminders
Simple reminders for debts at specific places.
- id, client_token, title, amount, place (grocery/house name), due_date, is_paid, created_at

### 3. expenses
Daily expense tracking.
- id, client_token, amount, category, description, expense_date, created_at
- category: 'food', 'transport', 'fuel', 'bills', 'health', 'shopping', 'other'

### 4. income
Monthly/daily income tracking.
- id, client_token, amount, source, income_type, income_date, notes, created_at
- income_type: 'monthly_salary', 'daily', 'freelance', 'business', 'other'

### 5. fuel_stations
Fuel station providers for bill/account payment.
- id, name_ar, name_en, code, brand_color, is_active, sort_order, created_at
- Pre-populated with Yemeni fuel companies

## Security
- RLS enabled on all tables
- All tables use `TO anon, authenticated` since this is a no-auth app (client_token based)
- All CRUD operations allowed for anon + authenticated

## Notes
- All financial tables are scoped by `client_token` which is generated client-side
- Fuel stations are shared reference data (not scoped by client_token)
- Existing `service_providers` table gets new type values: 'fuel'
*/

-- ============================================
-- DEBTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_token text NOT NULL,
  person_name text NOT NULL,
  person_type text NOT NULL DEFAULT 'i_owe' CHECK (person_type IN ('i_owe', 'owed_to_me')),
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  installments_count integer NOT NULL DEFAULT 0,
  installments_paid integer NOT NULL DEFAULT 0,
  installment_amount numeric NOT NULL DEFAULT 0,
  due_date date,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('grocery', 'house', 'personal', 'loan', 'fuel', 'other')),
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_debts" ON debts;
CREATE POLICY "anon_select_debts" ON debts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_debts" ON debts;
CREATE POLICY "anon_insert_debts" ON debts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_debts" ON debts;
CREATE POLICY "anon_update_debts" ON debts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_debts" ON debts;
CREATE POLICY "anon_delete_debts" ON debts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_debts_client_token ON debts(client_token);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

-- ============================================
-- DEBT REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS debt_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_token text NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  place text,
  due_date date,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE debt_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_debt_reminders" ON debt_reminders;
CREATE POLICY "anon_select_debt_reminders" ON debt_reminders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_debt_reminders" ON debt_reminders;
CREATE POLICY "anon_insert_debt_reminders" ON debt_reminders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_debt_reminders" ON debt_reminders;
CREATE POLICY "anon_update_debt_reminders" ON debt_reminders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_debt_reminders" ON debt_reminders;
CREATE POLICY "anon_delete_debt_reminders" ON debt_reminders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_debt_reminders_client_token ON debt_reminders(client_token);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_token text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'transport', 'fuel', 'bills', 'health', 'shopping', 'debt_payment', 'other')),
  description text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_expenses_client_token ON expenses(client_token);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ============================================
-- INCOME TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_token text NOT NULL,
  amount numeric NOT NULL,
  source text NOT NULL,
  income_type text NOT NULL DEFAULT 'other' CHECK (income_type IN ('monthly_salary', 'daily', 'freelance', 'business', 'other')),
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_income" ON income;
CREATE POLICY "anon_select_income" ON income FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_income" ON income;
CREATE POLICY "anon_insert_income" ON income FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_income" ON income;
CREATE POLICY "anon_update_income" ON income FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_income" ON income;
CREATE POLICY "anon_delete_income" ON income FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_income_client_token ON income(client_token);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date);

-- ============================================
-- FUEL STATIONS TABLE (shared reference data)
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  code text UNIQUE NOT NULL,
  brand_color text NOT NULL DEFAULT '#E8A317',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fuel_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fuel_stations" ON fuel_stations;
CREATE POLICY "anon_select_fuel_stations" ON fuel_stations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_fuel_stations" ON fuel_stations;
CREATE POLICY "anon_insert_fuel_stations" ON fuel_stations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_fuel_stations" ON fuel_stations;
CREATE POLICY "anon_update_fuel_stations" ON fuel_stations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_fuel_stations" ON fuel_stations;
CREATE POLICY "anon_delete_fuel_stations" ON fuel_stations FOR DELETE
  TO anon, authenticated USING (true);

-- Pre-populate Yemeni fuel companies
INSERT INTO fuel_stations (name_ar, name_en, code, brand_color, sort_order) VALUES
  ('محطات السفير', 'Al-Safir Stations', 'safir', '#D32128', 1),
  ('محطات توتال', 'Total Stations', 'total', '#E63946', 2),
  ('محطات النفط اليمنية', 'Yemen Oil Co', 'yemen_oil', '#1B7F3B', 3),
  ('محطات باف', 'BAF Stations', 'baf', '#1565C0', 4),
  ('محطات الحكمة', 'Al-Hikma Stations', 'hikma', '#E8A317', 5),
  ('محطات الأمل', 'Al-Amal Stations', 'amal', '#0D9488', 6),
  ('محطات اليمن لخدمات النفط', 'Yemen Petroleum Services', 'yps', '#6E7680', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Update service_providers to allow 'fuel' type
-- ============================================
DO $$
BEGIN
  -- Add fuel type providers if they don't exist
  IF NOT EXISTS (SELECT 1 FROM service_providers WHERE code = 'fuel_payment') THEN
    INSERT INTO service_providers (code, name_ar, name_en, type, icon_name, brand_color, is_active, sort_order, phone_prefixes)
    VALUES ('fuel_payment', 'محطات وقود', 'Fuel Stations', 'fuel', 'Fuel', '#E8A317', true, 20, ARRAY[]::text[]);
  END IF;
END $$;

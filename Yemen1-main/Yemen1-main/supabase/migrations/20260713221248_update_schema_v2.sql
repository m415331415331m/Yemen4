/*
# Update schema: phone prefixes, package durations, balance inquiry, loan support

## Overview
Updates the billing system to support:
1. Auto-detection of telecom provider from phone number prefix
2. Package duration categories (daily/weekly/monthly/max)
3. Balance inquiry transactions
4. Loan (salaf) check and fee addition
5. Updated provider data with correct prefixes and branding

## Changes

### service_providers (ALTER)
- Add `phone_prefixes` (text[]) - array of prefixes for auto-detection (e.g. ['77','78'])
- Add `ussd_balance` (text) - USSD code for balance inquiry (e.g. '*100#')
- Add `ussd_loan` (text) - USSD code for loan check (e.g. '*50#')

### provider_packages (ALTER)
- Add `duration_type` (text) - 'daily', 'weekly', 'monthly', 'max'
- Add `data_mb` (int) - data amount in MB
- Add `minutes` (int) - included minutes
- Add `sms` (int) - included SMS count
- Add `validity_days` (int) - validity period in days

### transactions (ALTER)
- Add `transaction_type` (text) - 'recharge', 'balance_inquiry', 'bill_payment'
- Add `balance_before` (numeric, nullable) - balance before transaction
- Add `balance_after` (numeric, nullable) - balance after transaction
- Add `loan_amount` (numeric, nullable) - loan/salaf amount if applicable
- Add `total_amount` (numeric) - amount including loan fees

### Data updates
- Update all providers with correct phone prefixes and branding colors
- Replace all packages with real Yemen Mobile 4G packages
- Add packages for Sabafon, YOU, Y with daily/weekly/monthly categories
*/

-- ============================================
-- 1. Add columns to service_providers
-- ============================================
DO $$ BEGIN
  ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS phone_prefixes text[] DEFAULT '{}';
  ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS ussd_balance text;
  ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS ussd_loan text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- 2. Add columns to provider_packages
-- ============================================
DO $$ BEGIN
  ALTER TABLE provider_packages ADD COLUMN IF NOT EXISTS duration_type text DEFAULT 'monthly';
  ALTER TABLE provider_packages ADD COLUMN IF NOT EXISTS data_mb int;
  ALTER TABLE provider_packages ADD COLUMN IF NOT EXISTS minutes int;
  ALTER TABLE provider_packages ADD COLUMN IF NOT EXISTS sms int;
  ALTER TABLE provider_packages ADD COLUMN IF NOT EXISTS validity_days int;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- 3. Add columns to transactions
-- ============================================
DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'recharge';
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_before numeric(10,2);
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_after numeric(10,2);
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS loan_amount numeric(10,2) DEFAULT 0;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_amount numeric(10,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- 4. Update service_providers with prefixes and branding
-- ============================================
UPDATE service_providers SET
  phone_prefixes = '{77,78}',
  ussd_balance = '*100#',
  ussd_loan = '*50#',
  brand_color = '#1B7F3B',
  icon_name = 'Smartphone'
WHERE code = 'yemen_mobile';

UPDATE service_providers SET
  phone_prefixes = '{73}',
  ussd_balance = '*102#',
  ussd_loan = NULL,
  brand_color = '#E63946',
  icon_name = 'Smartphone'
WHERE code = 'yu';

UPDATE service_providers SET
  phone_prefixes = '{71}',
  ussd_balance = '*101#',
  ussd_loan = NULL,
  brand_color = '#2D8659',
  icon_name = 'Smartphone'
WHERE code = 'sabafon';

UPDATE service_providers SET
  phone_prefixes = '{70}',
  ussd_balance = '*103#',
  ussd_loan = NULL,
  brand_color = '#00796B',
  icon_name = 'Smartphone'
WHERE code = 'way';

UPDATE service_providers SET
  phone_prefixes = '{}',
  ussd_balance = NULL,
  ussd_loan = NULL,
  brand_color = '#1565C0',
  icon_name = 'Wifi'
WHERE code = 'yemen_net';

UPDATE service_providers SET
  phone_prefixes = '{}',
  ussd_balance = NULL,
  ussd_loan = NULL,
  brand_color = '#E8A317',
  icon_name = 'Zap'
WHERE code = 'electricity';

UPDATE service_providers SET
  phone_prefixes = '{}',
  ussd_balance = NULL,
  ussd_loan = NULL,
  brand_color = '#0277BD',
  icon_name = 'Droplet'
WHERE code = 'water';

-- ============================================
-- 5. Clear old packages and insert real ones
-- ============================================
DELETE FROM provider_packages;

-- Yemen Mobile (77, 78) - Real 4G packages
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا 24 ساعة', 300, '512 ميجابايت 4G + 20 دقيقة + 40 رسالة', 'daily', 512, 20, 40, 1, 1 FROM service_providers WHERE code = 'yemen_mobile';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا 48 ساعة', 600, '1 جيجابايت 4G + 50 دقيقة + 100 رسالة', 'daily', 1024, 50, 100, 2, 2 FROM service_providers WHERE code = 'yemen_mobile';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا الأسبوعية', 1500, '2 جيجابايت 4G + 200 دقيقة + 300 رسالة', 'weekly', 2048, 200, 300, 7, 3 FROM service_providers WHERE code = 'yemen_mobile';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا الشهرية', 2500, '4 جيجابايت 4G + 300 دقيقة + 350 رسالة', 'monthly', 4096, 300, 350, 30, 4 FROM service_providers WHERE code = 'yemen_mobile';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا ماكس', 4000, '4 جيجابايت 4G + 1100 دقيقة + 600 رسالة', 'max', 4096, 1100, 600, 30, 5 FROM service_providers WHERE code = 'yemen_mobile';

-- Sabafon (71) - Packages
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة يومية', 500, '1 جيجابايت + 30 دقيقة', 'daily', 1024, 30, 0, 1, 1 FROM service_providers WHERE code = 'sabafon';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة أسبوعية', 1500, '3 جيجابايت + 100 دقيقة', 'weekly', 3072, 100, 0, 7, 2 FROM service_providers WHERE code = 'sabafon';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة شهرية', 3000, '10 جيجابايت + 300 دقيقة', 'monthly', 10240, 300, 0, 30, 3 FROM service_providers WHERE code = 'sabafon';

-- YOU (73) - Packages
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة يومية', 400, '750 ميجابايت + 20 دقيقة', 'daily', 750, 20, 0, 1, 1 FROM service_providers WHERE code = 'yu';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة أسبوعية', 1200, '2.5 جيجابايت + 80 دقيقة', 'weekly', 2560, 80, 0, 7, 2 FROM service_providers WHERE code = 'yu';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة شهرية', 2500, '8 جيجابايت + 250 دقيقة', 'monthly', 8192, 250, 0, 30, 3 FROM service_providers WHERE code = 'yu';

-- Way (70) - Packages
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة يومية', 450, '1 جيجابايت + 25 دقيقة', 'daily', 1024, 25, 0, 1, 1 FROM service_providers WHERE code = 'way';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة أسبوعية', 1400, '3 جيجابايت + 100 دقيقة', 'weekly', 3072, 100, 0, 7, 2 FROM service_providers WHERE code = 'way';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة شهرية', 2800, '10 جيجابايت + 300 دقيقة', 'monthly', 10240, 300, 0, 30, 3 FROM service_providers WHERE code = 'way';

-- Yemen Net - Internet packages
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة 4 ميجا - شهري', 2000, 'إنترنت أرضي 4 ميجابت/ثانية - شهر كامل', 'monthly', 0, 0, 0, 30, 1 FROM service_providers WHERE code = 'yemen_net';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة 8 ميجا - شهري', 3500, 'إنترنت أرضي 8 ميجابت/ثانية - شهر كامل', 'monthly', 0, 0, 0, 30, 2 FROM service_providers WHERE code = 'yemen_net';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'باقة 16 ميجا - شهري', 5500, 'إنترنت أرضي 16 ميجابت/ثانية - شهر كامل', 'monthly', 0, 0, 0, 30, 3 FROM service_providers WHERE code = 'yemen_net';

-- Electricity - Bill payment amounts
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1000 ريال', 1000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 1 FROM service_providers WHERE code = 'electricity';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2000 ريال', 2000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 2 FROM service_providers WHERE code = 'electricity';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5000 ريال', 5000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 3 FROM service_providers WHERE code = 'electricity';

-- Water - Bill payment amounts
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1000 ريال', 1000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 1 FROM service_providers WHERE code = 'water';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2000 ريال', 2000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 2 FROM service_providers WHERE code = 'water';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5000 ريال', 5000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 3 FROM service_providers WHERE code = 'water';

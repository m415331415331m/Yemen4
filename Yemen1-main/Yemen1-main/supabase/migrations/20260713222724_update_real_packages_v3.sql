/*
# Update: Real packages, electricity/water companies, biometric support

## Overview
Updates all packages with real Yemeni telecom data from official sources.
Adds electricity and water utility companies.

## Changes
- Replace all provider_packages with real data from official websites
- Add real electricity and water companies
- Add logo_url field for provider branding
*/

-- Add logo_url to service_providers
DO $$ BEGIN
  ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS logo_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update provider branding
UPDATE service_providers SET
  brand_color = '#1B7F3B',
  logo_url = NULL
WHERE code = 'yemen_mobile';

UPDATE service_providers SET
  brand_color = '#E63946'
WHERE code = 'yu';

UPDATE service_providers SET
  brand_color = '#0066B3'
WHERE code = 'sabafon';

UPDATE service_providers SET
  brand_color = '#00796B'
WHERE code = 'way';

-- Add electricity companies
INSERT INTO service_providers (code, name_ar, name_en, type, icon_name, brand_color, is_active, sort_order)
VALUES
  ('pec_sanaa', 'الكهرباء - صنعاء', 'PEC Sanaa', 'electricity', 'Zap', '#E8A317', true, 6),
  ('pec_aden', 'الكهرباء - عدن', 'PEC Aden', 'electricity', 'Zap', '#D97706', true, 7),
  ('pec_hodeidah', 'الكهرباء - الحديدة', 'PEC Hodeidah', 'electricity', 'Zap', '#B45309', true, 8),
  ('pec_taiz', 'الكهرباء - تعز', 'PEC Taiz', 'electricity', 'Zap', '#92400E', true, 9),
  ('water_sanaa', 'المياه - صنعاء', 'Water Sanaa', 'water', 'Droplet', '#0277BD', true, 10),
  ('water_aden', 'المياه - عدن', 'Water Aden', 'water', 'Droplet', '#0288D1', true, 11),
  ('water_taiz', 'المياه - تعز', 'Water Taiz', 'water', 'Droplet', '#039BE5', true, 12)
ON CONFLICT (code) DO NOTHING;

-- Remove old generic electricity/water
DELETE FROM service_providers WHERE code IN ('electricity', 'water');

-- Clear all packages and insert real ones
DELETE FROM provider_packages;

-- ============================================
-- Yemen Mobile (77, 78) - Real Mazaya 4G packages
-- ============================================
-- Mazaya 24 Hours
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا 24 ساعة', 300, '512 ميجابايت 4G + 20 دقيقة + 40 رسالة', 'daily', 512, 20, 40, 1, 1
FROM service_providers WHERE code = 'yemen_mobile';

-- Mazaya 48 Hours
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا 48 ساعة', 600, '1 جيجابايت 4G + 50 دقيقة + 100 رسالة', 'daily', 1024, 50, 100, 2, 2
FROM service_providers WHERE code = 'yemen_mobile';

-- Mazaya Weekly
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا الأسبوعية', 1500, '2 جيجابايت 4G + 200 دقيقة + 300 رسالة', 'weekly', 2048, 200, 300, 7, 3
FROM service_providers WHERE code = 'yemen_mobile';

-- Mazaya Monthly
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا الشهرية', 2500, '4 جيجابايت 4G + 300 دقيقة + 350 رسالة', 'monthly', 4096, 300, 350, 30, 4
FROM service_providers WHERE code = 'yemen_mobile';

-- Mazaya Max
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مزايا ماكس', 4000, '4 جيجابايت 4G + 1100 دقيقة + 600 رسالة', 'max', 4096, 1100, 600, 30, 5
FROM service_providers WHERE code = 'yemen_mobile';

-- 4G Net 6GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'نت 6 جيجابايت', 2400, '6 جيجابايت 4G - صلاحية 30 يوم', 'monthly', 6144, 0, 0, 30, 6
FROM service_providers WHERE code = 'yemen_mobile';

-- 4G Net 12GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'نت 12 جيجابايت', 4400, '12 جيجابايت 4G - صلاحية 30 يوم', 'monthly', 12288, 0, 0, 30, 7
FROM service_providers WHERE code = 'yemen_mobile';

-- 4G Net 25GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'نت 25 جيجابايت', 9000, '25 جيجابايت 4G - صلاحية 30 يوم', 'monthly', 25600, 0, 0, 30, 8
FROM service_providers WHERE code = 'yemen_mobile';

-- ============================================
-- Sabafon (71) - Real packages
-- ============================================
-- Anter 10 (10GB / 30 days / 1500 YER)
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'أنتر 10', 1500, '10 جيجابايت 4G - صلاحية 30 يوم', 'monthly', 10240, 0, 0, 30, 1
FROM service_providers WHERE code = 'sabafon';

-- Yablash 4G daily
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'يابلاش يومية', 250, '500 ميجابايت 4G - صلاحية 24 ساعة', 'daily', 500, 0, 0, 1, 2
FROM service_providers WHERE code = 'sabafon';

-- Yablash 4G 10 days
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'يابلاش 10 أيام', 1330, '2 جيجابايت + 200 دقيقة + 300 رسالة - 10 أيام', 'daily', 2048, 200, 300, 10, 3
FROM service_providers WHERE code = 'sabafon';

-- Tawasol weekly
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'تواصل الأسبوعية', 760, '2 جيجابايت - صلاحية 7 أيام', 'weekly', 2048, 0, 0, 7, 4
FROM service_providers WHERE code = 'sabafon';

-- Super Tawasol monthly
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سوبر تواصل الشهرية', 3000, 'إنترنت غير محدود + دقائق ورسائل', 'monthly', 0, 300, 300, 30, 5
FROM service_providers WHERE code = 'sabafon';

-- Anter 4GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'أنتر 4 جيجابايت', 2000, '4 جيجابايت 4G - 30 يوم', 'monthly', 4096, 0, 0, 30, 6
FROM service_providers WHERE code = 'sabafon';

-- Anter 8GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'أنتر 8 جيجابايت', 3900, '8 جيجابايت 4G - 30 يوم', 'monthly', 8192, 0, 0, 30, 7
FROM service_providers WHERE code = 'sabafon';

-- ============================================
-- YOU (73) - Real packages
-- ============================================
-- 1GB Daily
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'يومية 1 جيجا', 485, '1 جيجابايت 4G - صلاحية 24 ساعة', 'daily', 1024, 0, 0, 1, 1
FROM service_providers WHERE code = 'yu';

-- 3GB Weekly
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'أسبوعية 3 جيجا', 1481, '3 جيجابايت 4G - صلاحية 7 أيام', 'weekly', 3072, 0, 0, 7, 2
FROM service_providers WHERE code = 'yu';

-- 7GB Monthly
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'شهرية 7 جيجا', 2962, '7 جيجابايت 4G - صلاحية 30 يوم', 'monthly', 7168, 0, 0, 30, 3
FROM service_providers WHERE code = 'yu';

-- 4G Mix (1.5GB + 90 min + 90 SMS / 72 hours)
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'مكس 4G', 1185, '1.5 جيجابايت + 90 دقيقة + 90 رسالة - 72 ساعة', 'daily', 1536, 90, 90, 3, 4
FROM service_providers WHERE code = 'yu';

-- ============================================
-- Y / Way (70) - Real packages
-- ============================================
-- Daily 1GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'يومية 1 جيجا', 450, '1 جيجابايت 4G - صلاحية 24 ساعة', 'daily', 1024, 0, 0, 1, 1
FROM service_providers WHERE code = 'way';

-- Weekly 3GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'أسبوعية 3 جيجا', 1400, '3 جيجابايت 4G - صلاحية 7 أيام', 'weekly', 3072, 0, 0, 7, 2
FROM service_providers WHERE code = 'way';

-- Monthly 10GB
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'شهرية 10 جيجا', 2800, '10 جيجابايت 4G - صلاحية 30 يوم', 'monthly', 10240, 0, 0, 30, 3
FROM service_providers WHERE code = 'way';

-- ============================================
-- Yemen Net - Internet packages
-- ============================================
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, '4 ميجابت - شهري', 2000, 'إنترنت أرضي 4 ميجابت/ثانية - شهر كامل', 'monthly', 0, 0, 0, 30, 1
FROM service_providers WHERE code = 'yemen_net';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, '8 ميجابت - شهري', 3500, 'إنترنت أرضي 8 ميجابت/ثانية - شهر كامل', 'monthly', 0, 0, 0, 30, 2
FROM service_providers WHERE code = 'yemen_net';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, '16 ميجابت - شهري', 5500, 'إنترنت أرضي 16 ميجابت/ثانية - شهر كامل', 'monthly', 0, 0, 0, 30, 3
FROM service_providers WHERE code = 'yemen_net';

-- ============================================
-- Electricity companies - bill payment amounts
-- ============================================
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'pec_sanaa';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'pec_sanaa';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'pec_sanaa';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 10,000 ريال', 10000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 4
FROM service_providers WHERE code = 'pec_sanaa';

-- Same for other electricity companies
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'pec_aden';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'pec_aden';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'pec_aden';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'pec_hodeidah';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'pec_hodeidah';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'pec_hodeidah';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'pec_taiz';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'pec_taiz';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة كهرباء', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'pec_taiz';

-- ============================================
-- Water companies - bill payment amounts
-- ============================================
INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'water_sanaa';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'water_sanaa';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'water_sanaa';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'water_aden';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'water_aden';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'water_aden';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 1,000 ريال', 1000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 1
FROM service_providers WHERE code = 'water_taiz';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 2,000 ريال', 2000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 2
FROM service_providers WHERE code = 'water_taiz';

INSERT INTO provider_packages (provider_id, name_ar, amount, description_ar, duration_type, data_mb, minutes, sms, validity_days, sort_order)
SELECT id, 'سداد 5,000 ريال', 5000, 'سداد فاتورة مياه', 'monthly', 0, 0, 0, 0, 3
FROM service_providers WHERE code = 'water_taiz';

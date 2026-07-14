/*
# Add admin password verification and hashing functions

## Overview
Creates two PostgreSQL functions for admin authentication:
1. `verify_admin_password` - verifies a plaintext password against a bcrypt hash
2. `hash_admin_password` - creates a bcrypt hash from a plaintext password

## Security
These functions are SECURITY DEFINER so they can use the crypt() and gen_salt() functions
which require the pgcrypto extension. They are safe because:
- verify_admin_password only returns a boolean
- hash_admin_password only returns a string (the hash)
- Neither function exposes sensitive data

## Prerequisites
- pgcrypto extension must be enabled (it is by default in Supabase)
*/

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- VERIFY ADMIN PASSWORD FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION verify_admin_password(
  input_password text,
  stored_hash text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT stored_hash = crypt(input_password, stored_hash);
$$;

-- ============================================
-- HASH ADMIN PASSWORD FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION hash_admin_password(
  input_password text
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT crypt(input_password, gen_salt('bf'));
$$;

-- Grant access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION verify_admin_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hash_admin_password(text) TO anon, authenticated;

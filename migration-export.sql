-- Tax Client Portal - Database Migration Export
-- Generated from Replit production database
-- Run this on your VPS PostgreSQL to import all data

-- ============================================
-- STEP 1: Create custom enum types
-- ============================================

DO $$ BEGIN
  CREATE TYPE affiliate_status AS ENUM ('pending','active','suspended','inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_status AS ENUM ('pending','approved','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dependent_relationship AS ENUM ('child','stepchild','foster_child','grandchild','sibling','parent','grandparent','other_relative','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('pending','processing','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('w2','1099_nec','1099_k','1099_int','1099_div','1099_b','k1','brokerage','mortgage_interest','property_tax','charitable_donation','medical_expense','business_expense','engagement_letter','form_8879','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('sole_proprietorship','llc','s_corp','c_corp','partnership','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text','file','system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_tiers AS ENUM ('graduated','volume');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM ('one_time','recurring');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('lead','registered','engaged','converted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('not_filed','submitted','accepted','processing','approved','refund_sent','completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE return_prep_status AS ENUM ('not_started','documents_gathering','information_review','return_preparation','quality_review','client_review','signature_required','filing','filed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE return_type AS ENUM ('personal','business');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing','active','canceled','incomplete','incomplete_expired','past_due','unpaid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: Create tables
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  password_hash VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  phone VARCHAR,
  is_admin BOOLEAN DEFAULT false,
  has_seen_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  has_completed_questionnaire BOOLEAN DEFAULT false,
  referred_by_affiliate_id VARCHAR,
  referral_code VARCHAR,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size INTEGER NOT NULL,
  document_type document_type DEFAULT 'other',
  status document_status DEFAULT 'pending',
  tax_year INTEGER DEFAULT 2025,
  ai_classification JSONB,
  uploaded_at TIMESTAMP DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  business_id VARCHAR,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  is_from_client BOOLEAN DEFAULT true,
  attachment_url VARCHAR,
  attachment_name VARCHAR,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  invoice_number VARCHAR NOT NULL,
  status invoice_status DEFAULT 'draft',
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  payment_method VARCHAR,
  stripe_payment_intent_id VARCHAR,
  tax_year INTEGER DEFAULT 2025,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  invoice_id VARCHAR NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS signatures (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  document_type VARCHAR NOT NULL,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP DEFAULT now(),
  ip_address VARCHAR,
  tax_year INTEGER DEFAULT 2025,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS refund_tracking (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  return_prep_status return_prep_status DEFAULT 'not_started',
  federal_status refund_status DEFAULT 'not_filed',
  federal_amount NUMERIC(10,2),
  federal_estimated_date TIMESTAMP,
  state_status refund_status DEFAULT 'not_filed',
  state_amount NUMERIC(10,2),
  state_estimated_date TIMESTAMP,
  state_name VARCHAR,
  tax_year INTEGER DEFAULT 2025,
  last_checked TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS returns (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  business_id VARCHAR,
  return_type return_type NOT NULL,
  name VARCHAR NOT NULL,
  status return_prep_status DEFAULT 'not_started',
  tax_year INTEGER DEFAULT 2025,
  federal_status refund_status DEFAULT 'not_filed',
  federal_amount NUMERIC(10,2),
  state_status refund_status DEFAULT 'not_filed',
  state_amount NUMERIC(10,2),
  state_name VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  entity_type entity_type DEFAULT 'sole_proprietorship',
  tax_id VARCHAR,
  industry VARCHAR,
  description TEXT,
  address TEXT,
  tax_year INTEGER DEFAULT 2025,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  gross_income NUMERIC(12,2),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS business_owners (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  business_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  ownership_percentage NUMERIC(5,2),
  ssn VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS business_expenses (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  business_id VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  tax_year INTEGER DEFAULT 2025,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS dependents (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  date_of_birth TIMESTAMP,
  ssn VARCHAR,
  relationship dependent_relationship DEFAULT 'child',
  months_lived_in_home INTEGER DEFAULT 12,
  tax_year INTEGER DEFAULT 2025,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS required_documents (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  document_type document_type NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  is_uploaded BOOLEAN DEFAULT false,
  document_id VARCHAR,
  tax_year INTEGER DEFAULT 2025,
  return_id VARCHAR,
  marked_not_applicable BOOLEAN DEFAULT false,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  question_id VARCHAR NOT NULL,
  answer JSONB NOT NULL,
  tax_year INTEGER DEFAULT 2025,
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS affiliates (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  company_name VARCHAR,
  phone VARCHAR,
  referral_code VARCHAR NOT NULL,
  payout_rate NUMERIC(5,2) DEFAULT 10.00,
  status affiliate_status DEFAULT 'pending',
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
  affiliate_id VARCHAR NOT NULL,
  client_user_id VARCHAR,
  referral_code VARCHAR NOT NULL,
  lead_email VARCHAR,
  lead_name VARCHAR,
  status referral_status DEFAULT 'lead',
  commission_amount NUMERIC(10,2),
  commission_status commission_status DEFAULT 'pending',
  converted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL,
  PRIMARY KEY (sid)
);

CREATE TABLE IF NOT EXISTS affiliate_sessions (
  sid VARCHAR NOT NULL,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL,
  PRIMARY KEY (sid)
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_email_unique ON affiliates USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_referral_code_unique ON affiliates USING btree (referral_code);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions USING btree (expire);
CREATE INDEX IF NOT EXISTS "IDX_affiliate_session_expire" ON affiliate_sessions USING btree (expire);

-- ============================================
-- STEP 4: Insert data
-- ============================================

-- Users
INSERT INTO users (id, email, password_hash, first_name, last_name, profile_image_url, phone, is_admin, has_seen_onboarding, created_at, updated_at, has_completed_questionnaire, referred_by_affiliate_id, referral_code, is_archived, archived_at) VALUES
('40cd7e68-c996-4661-8174-0f293d13093f', 'admin@admin.com', '$2b$12$JOhq8TVJRdWJt9OC34NrXOZo0vEkLM.OEnqdt0skv71uyPFH3y4Mi', 'admin', 'admin', NULL, NULL, true, true, '2026-01-23 17:21:53.232047', '2026-01-23 17:22:42.231', true, NULL, NULL, false, NULL),
('68255a53-e163-469b-89f4-03069e4b6de5', 'SUSAN@BOOKNEX.COM', '$2b$12$wzxdduNuPzBSzzK3UOfgfOQ/hJ.B/mLxufXYFO34O5XStVBqktnzK', 'SUSAN', 'KUCERA', NULL, NULL, false, true, '2026-01-28 18:22:41.924108', '2026-01-28 18:25:34.23', true, NULL, NULL, false, NULL),
('f39bf5ba-c3b6-4a4f-b66d-469935c86b0f', 'dylan@booknx.com', '$2b$12$pjspSrOuPlkhWNrMx8I2lepQ9X6pmzs/neIHWK4nZOBhUMXVv4jca', 'dylan', 'oter', NULL, NULL, true, true, '2025-12-30 21:25:47.847035', '2025-12-30 21:27:24.08', true, NULL, NULL, false, NULL),
('092efe0b-ec61-42c8-b260-996621ee5d80', 'islanay@gmail.com', '$2b$12$Zgb.yoZSOS87ZcQWGF25deU6Ebfj0OqTV2lvIhjmZsQVA.bBHCe.q', 'YANET', 'SAGO ARREBATO', NULL, NULL, false, true, '2026-01-28 18:52:15.451076', '2026-01-28 18:58:58.695', true, NULL, NULL, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Documents
INSERT INTO documents (id, user_id, file_name, original_name, file_type, file_size, document_type, status, tax_year, ai_classification, uploaded_at, is_archived, business_id) VALUES
('856595d7-5831-4723-a15d-439b40c31849', '68255a53-e163-469b-89f4-03069e4b6de5', '2d57b08e-bbc7-4600-8e44-dc996ad2b8f7.pdf', '1040 2024.pdf', 'application/pdf', 1395821, 'other', 'verified', 2024, '{"taxYear": 2024, "keywords": ["document", "tax related"], "confidence": 0.94, "suggestedType": "other", "extractedFields": {"source": "ai_classification_v1", "filename": "1040 2024.pdf", "analyzedAt": "2026-01-28T18:29:18.930Z"}}', '2026-01-28 18:29:18.934529', false, NULL),
('48368786-958a-4120-9317-f9af5507ca9e', '68255a53-e163-469b-89f4-03069e4b6de5', 'd11540fa-0ac1-4e9c-b8be-fe2381bc7edb.pdf', 'ID.pdf', 'application/pdf', 327409, 'other', 'verified', 2024, '{"taxYear": 2024, "keywords": ["document", "tax related"], "confidence": 0.87, "suggestedType": "other", "extractedFields": {"source": "ai_classification_v1", "filename": "ID.pdf", "analyzedAt": "2026-01-28T18:29:31.119Z"}}', '2026-01-28 18:29:31.120768', false, NULL),
('8a0f9b4f-d360-4bb6-b53b-d650d3572820', '68255a53-e163-469b-89f4-03069e4b6de5', '0426149f-d526-4c2d-b41a-88ec0cca1c42.JPG', 'w2.JPG', 'image/jpeg', 512962, 'w2', 'verified', 2024, '{"taxYear": 2024, "keywords": ["wages", "salary", "federal tax withheld", "employer"], "confidence": 0.81, "suggestedType": "w2", "extractedFields": {"source": "ai_classification_v1", "filename": "w2.JPG", "analyzedAt": "2026-01-28T18:23:45.947Z"}}', '2026-01-28 18:23:45.949644', false, NULL),
('ae511957-dc7d-419a-8d31-bad239a92a36', '092efe0b-ec61-42c8-b260-996621ee5d80', '3503a973-b8c1-472c-b97d-0c32a8c3f18c.pdf', 'Taxes 2024.pdf', 'application/pdf', 9240141, 'other', 'verified', 2025, '{"taxYear": 2025, "keywords": ["document", "tax related"], "confidence": 0.99, "suggestedType": "other", "extractedFields": {"source": "ai_classification_v1", "filename": "Taxes 2024.pdf", "analyzedAt": "2026-01-28T18:57:08.696Z"}}', '2026-01-28 18:57:08.697688', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Messages
INSERT INTO messages (id, user_id, content, message_type, is_from_client, attachment_url, attachment_name, is_read, created_at) VALUES
('0ab1509f-28c5-4e88-82b5-c75ff7ca06c9', '68255a53-e163-469b-89f4-03069e4b6de5', 'Welcome to TaxPortal! We''re excited to help you with your tax preparation. Please start by uploading your tax documents and completing the questionnaire. If you have any questions, feel free to message us here.', 'text', false, NULL, NULL, true, '2026-01-28 18:22:41.989286'),
('679f168e-f011-4223-a77f-180554419ba2', '092efe0b-ec61-42c8-b260-996621ee5d80', 'Welcome to TaxPortal! We''re excited to help you with your tax preparation. Please start by uploading your tax documents and completing the questionnaire. If you have any questions, feel free to message us here.', 'text', false, NULL, NULL, false, '2026-01-28 18:52:15.513555'),
('0ed2f701-394c-4cf2-bc04-09230ae90fd5', '40cd7e68-c996-4661-8174-0f293d13093f', 'Welcome to TaxPortal! We''re excited to help you with your tax preparation. Please start by uploading your tax documents and completing the questionnaire. If you have any questions, feel free to message us here.', 'text', false, NULL, NULL, false, '2026-01-23 17:21:53.290614')
ON CONFLICT (id) DO NOTHING;

-- Invoices
INSERT INTO invoices (id, user_id, invoice_number, status, subtotal, tax, total, due_date, paid_at, payment_method, stripe_payment_intent_id, tax_year, created_at) VALUES
('8d311552-ee9f-4273-aac6-700d3f3faa29', '40cd7e68-c996-4661-8174-0f293d13093f', 'INV-2024-001', 'sent', 350.00, 0.00, 350.00, '2026-02-22 17:21:53.274', NULL, NULL, NULL, 2024, '2026-01-23 17:21:53.276127'),
('e363a7ee-7186-4f41-a7a7-e5e2671a5794', '68255a53-e163-469b-89f4-03069e4b6de5', 'INV-2024-001', 'paid', 350.00, 0.00, 350.00, '2026-02-27 18:22:41.971', '2026-01-28 18:30:02.974', 'card', NULL, 2024, '2026-01-28 18:22:41.973493'),
('31ca04d1-592b-48eb-9478-82103194d8ab', '092efe0b-ec61-42c8-b260-996621ee5d80', 'INV-2024-001', 'sent', 350.00, 0.00, 350.00, '2026-02-27 18:52:15.5', NULL, NULL, NULL, 2025, '2026-01-28 18:52:15.502184')
ON CONFLICT (id) DO NOTHING;

-- Invoice Items
INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount) VALUES
('cef46cf6-d001-4cc5-ac2c-e0c2f80685d3', '8d311552-ee9f-4273-aac6-700d3f3faa29', 'Federal Tax Return Preparation', 1, 250.00, 250.00),
('55d5b264-7df6-4967-b9d4-2129859a84f1', '8d311552-ee9f-4273-aac6-700d3f3faa29', 'State Tax Return Preparation', 1, 100.00, 100.00),
('f31abf35-589f-4bfa-8447-ea61d203dc67', 'e363a7ee-7186-4f41-a7a7-e5e2671a5794', 'Federal Tax Return Preparation', 1, 250.00, 250.00),
('e01b409a-e080-424d-8d15-15feee088874', 'e363a7ee-7186-4f41-a7a7-e5e2671a5794', 'State Tax Return Preparation', 1, 100.00, 100.00),
('78ee3378-ad44-438e-ab03-778a7fb14319', '31ca04d1-592b-48eb-9478-82103194d8ab', 'Federal Tax Return Preparation', 1, 250.00, 250.00),
('60ea9908-3331-4cda-8065-584ce3bb6b89', '31ca04d1-592b-48eb-9478-82103194d8ab', 'State Tax Return Preparation', 1, 100.00, 100.00)
ON CONFLICT (id) DO NOTHING;

-- Signatures (without the large base64 data - just the metadata)
INSERT INTO signatures (id, user_id, document_type, signature_data, signed_at, ip_address, tax_year) VALUES
('e5153c46-f006-4f06-aa7b-41d8703ab924', '68255a53-e163-469b-89f4-03069e4b6de5', 'engagement_letter', 'data:image/png;base64,MIGRATED', '2026-01-28 18:29:51.788239', '10.83.12.242', 2024),
('017e49b1-d25d-4436-873c-a413fc5b42cf', '68255a53-e163-469b-89f4-03069e4b6de5', 'form_8879', 'data:image/png;base64,MIGRATED', '2026-01-28 18:59:14.81219', '10.83.3.63', 2025),
('af0f9e2e-5ab8-4efa-bc20-6f118d8ed41b', '092efe0b-ec61-42c8-b260-996621ee5d80', 'engagement_letter', 'data:image/png;base64,MIGRATED', '2026-01-28 18:57:29.447174', '10.83.12.242', 2025),
('8e2a10f7-5cda-4add-b85a-f32b5e7d8dc8', '092efe0b-ec61-42c8-b260-996621ee5d80', 'form_8879', 'data:image/png;base64,MIGRATED', '2026-01-28 18:59:20.025938', '10.83.3.63', 2025)
ON CONFLICT (id) DO NOTHING;

-- Refund Tracking
INSERT INTO refund_tracking (id, user_id, return_prep_status, federal_status, federal_amount, federal_estimated_date, state_status, state_amount, state_estimated_date, state_name, tax_year, last_checked, updated_at) VALUES
('f0982b2b-da6f-42ca-b43b-a5b3359f2fd3', '40cd7e68-c996-4661-8174-0f293d13093f', 'not_started', 'not_filed', NULL, NULL, 'not_filed', NULL, NULL, 'California', 2024, '2026-01-23 17:21:53.271492', '2026-01-23 17:21:53.271492'),
('4da5e952-6e6e-4cc4-ba41-40093d4e6125', '68255a53-e163-469b-89f4-03069e4b6de5', 'return_preparation', 'not_filed', NULL, NULL, 'not_filed', NULL, NULL, 'California', 2024, '2026-01-28 18:22:41.968079', '2026-01-28 18:31:58.198'),
('638eb230-89e3-46c9-bd2e-dbe57c2203ed', '092efe0b-ec61-42c8-b260-996621ee5d80', 'information_review', 'not_filed', NULL, NULL, 'not_filed', NULL, NULL, 'California', 2025, '2026-01-28 18:52:15.497571', '2026-01-28 19:04:10.765')
ON CONFLICT (id) DO NOTHING;

-- Returns
INSERT INTO returns (id, user_id, business_id, return_type, name, status, tax_year, federal_status, federal_amount, state_status, state_amount, state_name, created_at, updated_at) VALUES
('ab5ebcfb-fb31-4dbc-9ffb-e5dfbe9f0364', '092efe0b-ec61-42c8-b260-996621ee5d80', 'fc502635-fb80-4271-aca4-40d71be679de', 'business', 'BLESSING ANGELS ASSISTED LIVING LLC', 'documents_gathering', 2025, 'not_filed', NULL, 'not_filed', NULL, NULL, '2026-01-28 19:33:46.093238', '2026-01-28 20:23:20.471'),
('d6d0ae22-9dbb-4846-a54a-3befbb3e9f44', '092efe0b-ec61-42c8-b260-996621ee5d80', NULL, 'personal', 'Personal Return', 'not_started', 2025, 'not_filed', NULL, 'not_filed', NULL, NULL, '2026-01-28 19:22:32.582046', '2026-01-28 20:23:22.401'),
('7e9f8baf-f982-47bc-af9e-e34ca36978e2', '68255a53-e163-469b-89f4-03069e4b6de5', NULL, 'personal', 'Personal Return', 'not_started', 2025, 'not_filed', NULL, 'not_filed', NULL, NULL, '2026-02-05 15:33:12.53495', '2026-02-05 15:33:12.53495')
ON CONFLICT (id) DO NOTHING;

-- Businesses
INSERT INTO businesses (id, user_id, name, entity_type, tax_id, industry, description, address, tax_year, created_at, updated_at, gross_income) VALUES
('fc502635-fb80-4271-aca4-40d71be679de', '092efe0b-ec61-42c8-b260-996621ee5d80', 'BLESSING ANGELS ASSISTED LIVING LLC', 'llc', NULL, NULL, NULL, NULL, 2025, '2026-01-28 19:33:35.773953', '2026-01-28 19:33:35.773953', NULL)
ON CONFLICT (id) DO NOTHING;

-- Required Documents
INSERT INTO required_documents (id, user_id, document_type, description, is_required, is_uploaded, document_id, tax_year, return_id, marked_not_applicable) VALUES
('721601b0-0b7e-487b-91a1-aef313fe2a06', '40cd7e68-c996-4661-8174-0f293d13093f', 'w2', 'W-2 from your employer(s)', true, false, NULL, 2024, NULL, false),
('8de169db-bb5e-4377-a886-059244c7e98e', '40cd7e68-c996-4661-8174-0f293d13093f', 'other', 'Government-issued photo ID', true, false, NULL, 2024, NULL, false),
('ed5d38fd-20de-44fe-aa87-fa4f8ebb81e0', '40cd7e68-c996-4661-8174-0f293d13093f', 'other', 'Prior year tax return (if available)', true, false, NULL, 2024, NULL, false),
('3d4c3673-becc-4317-86f8-fee92f065f50', '68255a53-e163-469b-89f4-03069e4b6de5', 'w2', 'W-2 from your employer(s)', true, true, '8a0f9b4f-d360-4bb6-b53b-d650d3572820', 2024, NULL, false),
('6fa40731-3066-48b9-94f5-ef1f2bef0137', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Birth certificates for dependents (if new)', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('d7d6a485-b47d-4ddf-9f2e-cd62f55897b0', '68255a53-e163-469b-89f4-03069e4b6de5', 'other', 'Prior year tax return (if available)', true, true, '856595d7-5831-4723-a15d-439b40c31849', 2024, NULL, false),
('a5c4fc41-9637-4bd7-8cb8-d9bb3cecb4ea', '68255a53-e163-469b-89f4-03069e4b6de5', 'other', 'Government-issued photo ID', true, true, '48368786-958a-4120-9317-f9af5507ca9e', 2024, NULL, false),
('c2a8f94b-8a5b-4d4b-9da9-894884b9c86b', '092efe0b-ec61-42c8-b260-996621ee5d80', 'mortgage_interest', 'Form 1098 for mortgage interest', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('de52f922-7a3e-4a13-a2f0-bf8c9fe9cede', '092efe0b-ec61-42c8-b260-996621ee5d80', 'property_tax', 'Property tax statements', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('f25ec4ff-d3c1-44a1-8643-c88de45b510d', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Form 1098-T for tuition payments', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('9d94308c-37c2-4cf1-9f96-b437ce426b32', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Dependents'' Social Security cards or numbers', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('d28db618-d189-40c0-ab01-47524963da18', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Government-issued photo ID', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('95b7dfe9-42e5-46e4-8ea4-bb4b9f2a40b6', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Prior year tax return (if available)', true, false, NULL, 2025, 'd6d0ae22-9dbb-4846-a54a-3befbb3e9f44', false),
('79436b7d-ae58-42af-b463-9237730f2692', '092efe0b-ec61-42c8-b260-996621ee5d80', '1099_nec', '1099-NEC for freelance or contract work', true, false, NULL, 2025, 'ab5ebcfb-fb31-4dbc-9ffb-e5dfbe9f0364', false),
('b1ca0c43-0e70-489a-9b4f-ab7a0ba5547b', '092efe0b-ec61-42c8-b260-996621ee5d80', '1099_k', '1099-K for payment card and third-party transactions', true, false, NULL, 2025, 'ab5ebcfb-fb31-4dbc-9ffb-e5dfbe9f0364', false),
('aefbb5dc-9160-42bf-8ccd-2dfb66481d58', '092efe0b-ec61-42c8-b260-996621ee5d80', 'business_expense', 'Business expense receipts and records', true, false, NULL, 2025, 'ab5ebcfb-fb31-4dbc-9ffb-e5dfbe9f0364', false),
('a9995b36-0114-4fc7-b2a0-88097a65af52', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Home office measurements and expenses', true, false, NULL, 2025, 'ab5ebcfb-fb31-4dbc-9ffb-e5dfbe9f0364', false),
('a4a34543-3ccd-4674-950d-ca83e6d7889e', '092efe0b-ec61-42c8-b260-996621ee5d80', 'other', 'Vehicle mileage log for business use', true, false, NULL, 2025, 'ab5ebcfb-fb31-4dbc-9ffb-e5dfbe9f0364', false)
ON CONFLICT (id) DO NOTHING;

-- Questionnaire Responses
INSERT INTO questionnaire_responses (id, user_id, question_id, answer, tax_year, updated_at) VALUES
('2aefbc31-d884-4a54-93de-b9cec76ceae2', '40cd7e68-c996-4661-8174-0f293d13093f', 'filing_status', '"Single"', 2024, '2026-01-23 17:22:17.782187'),
('a8a44f99-ea1c-4757-879a-55185eb3806e', '40cd7e68-c996-4661-8174-0f293d13093f', 'marital_change', 'false', 2024, '2026-01-23 17:22:17.834623'),
('05e052f8-fe0f-4198-88d4-65ef2c2d35e1', '40cd7e68-c996-4661-8174-0f293d13093f', 'employment_type', '["W-2 Employment"]', 2024, '2026-01-23 17:22:17.870101'),
('a2190245-1684-40b1-9dad-e6894624a99c', '40cd7e68-c996-4661-8174-0f293d13093f', 'side_business', 'false', 2024, '2026-01-23 17:22:17.887306'),
('53ca1ebd-ac3f-4905-88d6-34af99e352d1', '40cd7e68-c996-4661-8174-0f293d13093f', 'crypto_transactions', 'false', 2024, '2026-01-23 17:22:17.897234'),
('3e1a1bb0-fd24-427e-8cc6-b086ccafb46f', '40cd7e68-c996-4661-8174-0f293d13093f', 'homeowner', 'false', 2024, '2026-01-23 17:22:17.913213'),
('307530c0-967e-4ee6-9935-7a7736fb2c49', '40cd7e68-c996-4661-8174-0f293d13093f', 'charitable_donations', 'false', 2024, '2026-01-23 17:22:17.9287'),
('7018681d-a7cc-47ff-bd14-82becbdd4b41', '40cd7e68-c996-4661-8174-0f293d13093f', 'medical_expenses', 'false', 2024, '2026-01-23 17:22:17.938781'),
('9e5b01eb-0d8b-411b-8d95-8773a59c09df', '40cd7e68-c996-4661-8174-0f293d13093f', 'student_loans', 'false', 2024, '2026-01-23 17:22:17.945399'),
('001f5a93-218f-470f-a1ca-3ea0bdc568af', '40cd7e68-c996-4661-8174-0f293d13093f', 'education_expenses', 'false', 2024, '2026-01-23 17:22:17.955485'),
('6e89521b-715f-4a2e-a09e-21731c0ff2b6', '40cd7e68-c996-4661-8174-0f293d13093f', '529_contributions', 'false', 2024, '2026-01-23 17:22:17.96406'),
('f8bde36b-658d-455b-b7bc-4adcd02ded77', '40cd7e68-c996-4661-8174-0f293d13093f', 'dependents', 'false', 2024, '2026-01-23 17:22:17.974322'),
('0438caa3-f62a-46c1-8a72-1b8c888ecb36', '40cd7e68-c996-4661-8174-0f293d13093f', 'major_life_events', '["None of the above"]', 2024, '2026-01-23 17:22:17.989569'),
('20ac0ec4-ce31-4433-9819-252de8e2ee20', '40cd7e68-c996-4661-8174-0f293d13093f', 'home_office', 'false', 2024, '2026-01-23 17:22:18.003158'),
('2df25482-91a2-4bcd-992c-011dda4761b8', '40cd7e68-c996-4661-8174-0f293d13093f', 'vehicle_business_use', 'false', 2024, '2026-01-23 17:22:18.029361'),
('a26a8080-375f-441c-a74d-9893083543b0', '68255a53-e163-469b-89f4-03069e4b6de5', 'filing_status', '"Single"', 2024, '2026-01-28 18:23:26.564107'),
('597eb3d3-1fd2-45af-8bc0-be21742e9588', '68255a53-e163-469b-89f4-03069e4b6de5', 'marital_change', 'false', 2024, '2026-01-28 18:23:26.615223'),
('b1b26448-97fd-4d89-a69f-f009ed5acd5b', '68255a53-e163-469b-89f4-03069e4b6de5', 'employment_type', '["W-2 Employment"]', 2024, '2026-01-28 18:23:26.622189'),
('91eab74c-3b69-430c-abdc-59b131cc3b61', '68255a53-e163-469b-89f4-03069e4b6de5', 'side_business', 'false', 2024, '2026-01-28 18:23:26.628541'),
('67c809f8-4ae8-4f61-94c0-98090dfe9bf1', '68255a53-e163-469b-89f4-03069e4b6de5', 'crypto_transactions', 'false', 2024, '2026-01-28 18:23:26.634231'),
('cb9a38a3-290c-4b72-b501-4bd2c39178d1', '68255a53-e163-469b-89f4-03069e4b6de5', 'homeowner', 'true', 2024, '2026-01-28 18:23:26.640028'),
('f3658182-2ee9-44b8-b301-06c3dd8c9fbb', '68255a53-e163-469b-89f4-03069e4b6de5', 'mortgage_interest', 'false', 2024, '2026-01-28 18:23:26.645899'),
('5c9a875e-087a-40f4-82b1-77d1f3e14c99', '68255a53-e163-469b-89f4-03069e4b6de5', 'property_taxes', 'false', 2024, '2026-01-28 18:23:26.651196'),
('ec327eed-1e6b-4318-94b6-0571df98df74', '68255a53-e163-469b-89f4-03069e4b6de5', 'charitable_donations', 'false', 2024, '2026-01-28 18:23:26.655644'),
('5a14b38e-714b-4a68-89f5-dc9a4677d6c6', '68255a53-e163-469b-89f4-03069e4b6de5', 'medical_expenses', 'false', 2024, '2026-01-28 18:23:26.661561'),
('1b6b057f-8167-4255-b142-684f1f5ef449', '68255a53-e163-469b-89f4-03069e4b6de5', 'student_loans', 'false', 2024, '2026-01-28 18:23:26.666546'),
('0645e821-8b2c-48dd-b2ad-e1cf011bf467', '68255a53-e163-469b-89f4-03069e4b6de5', 'education_expenses', 'false', 2024, '2026-01-28 18:23:26.671929'),
('3fefaaaa-0358-4bdd-8d53-d87a236dcef7', '68255a53-e163-469b-89f4-03069e4b6de5', '529_contributions', 'false', 2024, '2026-01-28 18:23:26.678056'),
('95cda981-7c6d-4397-9684-3c6fc95c02d8', '68255a53-e163-469b-89f4-03069e4b6de5', 'dependents', 'false', 2024, '2026-01-28 18:23:26.6839'),
('a2e49742-7721-4f78-a711-1d63c631d988', '68255a53-e163-469b-89f4-03069e4b6de5', 'major_life_events', '["None of the above"]', 2024, '2026-01-28 18:23:26.689799'),
('af836485-53f3-4ad4-8786-daf152edd6e6', '68255a53-e163-469b-89f4-03069e4b6de5', 'home_office', 'false', 2024, '2026-01-28 18:23:26.696046'),
('2914b063-1267-4f24-958c-7f3b9b103ae2', '68255a53-e163-469b-89f4-03069e4b6de5', 'vehicle_business_use', 'false', 2024, '2026-01-28 18:23:26.703727'),
('693a6685-a064-48a8-9b7c-d1f27ae1dbd4', '092efe0b-ec61-42c8-b260-996621ee5d80', 'filing_status', '"Head of Household"', 2025, '2026-01-28 18:56:12.468732'),
('21279984-a3d2-4d50-9124-71568ec36c0f', '092efe0b-ec61-42c8-b260-996621ee5d80', 'marital_change', 'false', 2025, '2026-01-28 18:56:12.506265'),
('c847017f-dbf1-432f-a98d-2bd550972858', '092efe0b-ec61-42c8-b260-996621ee5d80', 'employment_type', '["Self-Employment/1099"]', 2025, '2026-01-28 18:56:12.512182'),
('0828a879-44fb-4810-9197-da9f8b34e593', '092efe0b-ec61-42c8-b260-996621ee5d80', 'side_business', 'true', 2025, '2026-01-28 18:56:12.518318'),
('e89e7e1f-d370-499c-8c73-7a4c1766b205', '092efe0b-ec61-42c8-b260-996621ee5d80', 'side_business_type', '["BLESSING ANGELS ASSISTED LIVING LLC"]', 2025, '2026-01-28 18:56:12.524057'),
('0dd95cf6-e3fe-4283-9a8a-c88f532e1011', '092efe0b-ec61-42c8-b260-996621ee5d80', 'crypto_transactions', 'false', 2025, '2026-01-28 18:56:12.529351'),
('3181a339-2199-4af7-9163-5ae347bd0079', '092efe0b-ec61-42c8-b260-996621ee5d80', 'homeowner', 'true', 2025, '2026-01-28 18:56:12.534895'),
('5545fc10-61d0-4fc0-a119-a9d731532fef', '092efe0b-ec61-42c8-b260-996621ee5d80', 'mortgage_interest', 'true', 2025, '2026-01-28 18:56:12.539622'),
('d643f978-21c7-4bdc-98b9-94e35299afb8', '092efe0b-ec61-42c8-b260-996621ee5d80', 'property_taxes', 'true', 2025, '2026-01-28 18:56:12.545482'),
('9d4c20f4-1dc7-470c-82a8-85293452fc6b', '092efe0b-ec61-42c8-b260-996621ee5d80', 'charitable_donations', 'false', 2025, '2026-01-28 18:56:12.551113'),
('00855e71-a217-41dd-8da4-67e6bd42018b', '092efe0b-ec61-42c8-b260-996621ee5d80', 'medical_expenses', 'false', 2025, '2026-01-28 18:56:12.556946'),
('2b419f8c-212a-491d-9565-bde8c400c3a3', '092efe0b-ec61-42c8-b260-996621ee5d80', 'student_loans', 'false', 2025, '2026-01-28 18:56:12.562715'),
('37a812e2-cf93-40ce-8ce9-eedb8f965b90', '092efe0b-ec61-42c8-b260-996621ee5d80', 'education_expenses', 'true', 2025, '2026-01-28 18:56:12.568536'),
('cc4c0c87-52e2-4ac7-a320-cb10cf8c163b', '092efe0b-ec61-42c8-b260-996621ee5d80', '529_contributions', 'false', 2025, '2026-01-28 18:56:12.573367'),
('240dbca6-68dc-451d-a4f6-670770d28432', '092efe0b-ec61-42c8-b260-996621ee5d80', 'dependents', 'true', 2025, '2026-01-28 18:56:12.578906'),
('3843efb3-bf73-4644-89c6-d269aafe96d7', '092efe0b-ec61-42c8-b260-996621ee5d80', 'dependent_count', '"2"', 2025, '2026-01-28 18:56:12.584182'),
('8d1fa629-1e95-4064-bd9b-dbcc62eea04a', '092efe0b-ec61-42c8-b260-996621ee5d80', 'childcare_expenses', 'false', 2025, '2026-01-28 18:56:12.589989'),
('f9effe0f-e6b7-487e-948e-7875fb01a699', '092efe0b-ec61-42c8-b260-996621ee5d80', 'major_life_events', '["None of the above"]', 2025, '2026-01-28 18:56:12.595972'),
('fbb37ff1-b53c-42cc-aa10-044cb3191d14', '092efe0b-ec61-42c8-b260-996621ee5d80', 'home_office', 'true', 2025, '2026-01-28 18:56:12.601609'),
('2055d94b-bc4e-4987-b00d-806ea06a268e', '092efe0b-ec61-42c8-b260-996621ee5d80', 'vehicle_business_use', 'true', 2025, '2026-01-28 18:56:12.607276')
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Migration complete!' AS status;

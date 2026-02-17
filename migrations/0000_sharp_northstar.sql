CREATE TYPE "public"."affiliate_status" AS ENUM('pending', 'active', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dependent_relationship" AS ENUM('child', 'stepchild', 'foster_child', 'grandchild', 'sibling', 'parent', 'grandparent', 'other_relative', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'processing', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('w2', '1099_nec', '1099_k', '1099_int', '1099_div', '1099_b', 'k1', 'brokerage', 'mortgage_interest', 'property_tax', 'charitable_donation', 'medical_expense', 'business_expense', 'engagement_letter', 'form_8879', 'other');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('sole_proprietorship', 'llc', 's_corp', 'c_corp', 'partnership', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'file', 'system');--> statement-breakpoint
CREATE TYPE "public"."product_display" AS ENUM('sidebar', 'tools', 'both');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('lead', 'registered', 'engaged', 'converted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('not_filed', 'submitted', 'accepted', 'processing', 'approved', 'refund_sent', 'completed');--> statement-breakpoint
CREATE TYPE "public"."return_prep_status" AS ENUM('not_started', 'documents_gathering', 'information_review', 'return_preparation', 'quality_review', 'client_review', 'signature_required', 'filing', 'filed');--> statement-breakpoint
CREATE TYPE "public"."return_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TABLE "affiliate_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"client_user_id" varchar,
	"referral_code" varchar NOT NULL,
	"lead_email" varchar,
	"lead_name" varchar,
	"status" "referral_status" DEFAULT 'lead',
	"commission_amount" numeric(10, 2),
	"commission_status" "commission_status" DEFAULT 'pending',
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"company_name" varchar,
	"phone" varchar,
	"referral_code" varchar NOT NULL,
	"payout_rate" numeric(5, 2) DEFAULT '10.00',
	"status" "affiliate_status" DEFAULT 'pending',
	"total_referrals" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"total_earnings" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliates_email_unique" UNIQUE("email"),
	CONSTRAINT "affiliates_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "business_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"tax_year" integer DEFAULT 2025,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_owners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"ownership_percentage" numeric(5, 2),
	"ssn" varchar,
	"email" varchar,
	"phone" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"entity_type" "entity_type" DEFAULT 'sole_proprietorship',
	"tax_id" varchar,
	"industry" varchar,
	"description" text,
	"address" text,
	"gross_income" numeric(12, 2),
	"tax_year" integer DEFAULT 2025,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"current_stage_id" varchar,
	"name" varchar,
	"metadata" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dependents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"date_of_birth" timestamp,
	"ssn" varchar,
	"relationship" "dependent_relationship" DEFAULT 'child',
	"months_lived_in_home" integer DEFAULT 12,
	"tax_year" integer DEFAULT 2025,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_id" varchar,
	"file_name" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"file_type" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"document_type" "document_type" DEFAULT 'other',
	"status" "document_status" DEFAULT 'pending',
	"tax_year" integer DEFAULT 2025,
	"ai_classification" jsonb,
	"is_archived" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"rate" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"invoice_number" varchar NOT NULL,
	"status" "invoice_status" DEFAULT 'draft',
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"payment_method" varchar,
	"stripe_payment_intent_id" varchar,
	"tax_year" integer DEFAULT 2025,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"message_type" "message_type" DEFAULT 'text',
	"is_from_client" boolean DEFAULT true,
	"attachment_url" varchar,
	"attachment_name" varchar,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_document_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_stages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"color" varchar DEFAULT '#6b7280',
	"sort_order" integer DEFAULT 0,
	"show_upload_button" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar DEFAULT 'Package',
	"display_location" "product_display" DEFAULT 'sidebar',
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questionnaire_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"answer" jsonb NOT NULL,
	"tax_year" integer DEFAULT 2025,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refund_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"return_prep_status" "return_prep_status" DEFAULT 'not_started',
	"federal_status" "refund_status" DEFAULT 'not_filed',
	"federal_amount" numeric(10, 2),
	"federal_estimated_date" timestamp,
	"state_status" "refund_status" DEFAULT 'not_filed',
	"state_amount" numeric(10, 2),
	"state_estimated_date" timestamp,
	"state_name" varchar,
	"tax_year" integer DEFAULT 2025,
	"last_checked" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "required_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"return_id" varchar,
	"document_type" "document_type" NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT true,
	"is_uploaded" boolean DEFAULT false,
	"marked_not_applicable" boolean DEFAULT false,
	"document_id" varchar,
	"tax_year" integer DEFAULT 2025
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_id" varchar,
	"return_type" "return_type" NOT NULL,
	"name" varchar NOT NULL,
	"status" "return_prep_status" DEFAULT 'not_started',
	"tax_year" integer DEFAULT 2025,
	"federal_status" "refund_status" DEFAULT 'not_filed',
	"federal_amount" numeric(10, 2),
	"state_status" "refund_status" DEFAULT 'not_filed',
	"state_amount" numeric(10, 2),
	"state_name" varchar,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"document_type" varchar NOT NULL,
	"signature_data" text NOT NULL,
	"signed_at" timestamp DEFAULT now(),
	"ip_address" varchar,
	"tax_year" integer DEFAULT 2025
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone" varchar,
	"is_admin" boolean DEFAULT false,
	"has_seen_onboarding" boolean DEFAULT false,
	"has_completed_questionnaire" boolean DEFAULT false,
	"referred_by_affiliate_id" varchar,
	"referral_code" varchar,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_owners" ADD CONSTRAINT "business_owners_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_current_stage_id_product_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "public"."product_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_document_requirements" ADD CONSTRAINT "product_document_requirements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stages" ADD CONSTRAINT "product_stages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_tracking" ADD CONSTRAINT "refund_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_documents" ADD CONSTRAINT "required_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_documents" ADD CONSTRAINT "required_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_affiliate_session_expire" ON "affiliate_sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");
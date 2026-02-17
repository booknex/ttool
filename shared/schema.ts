import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const documentTypeEnum = pgEnum('document_type', [
  'w2', '1099_nec', '1099_k', '1099_int', '1099_div', '1099_b', 
  'k1', 'brokerage', 'mortgage_interest', 'property_tax', 
  'charitable_donation', 'medical_expense', 'business_expense',
  'engagement_letter', 'form_8879', 'other'
]);

export const documentStatusEnum = pgEnum('document_status', [
  'pending', 'processing', 'verified', 'rejected'
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'not_filed', 'submitted', 'accepted', 'processing', 'approved', 'refund_sent', 'completed'
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft', 'sent', 'paid', 'overdue', 'cancelled'
]);

export const returnPrepStatusEnum = pgEnum('return_prep_status', [
  'not_started', 'documents_gathering', 'information_review', 
  'return_preparation', 'quality_review', 'client_review', 
  'signature_required', 'filing', 'filed'
]);

export const messageTypeEnum = pgEnum('message_type', [
  'text', 'file', 'system'
]);

export const affiliateStatusEnum = pgEnum('affiliate_status', [
  'pending', 'active', 'suspended', 'inactive'
]);

export const referralStatusEnum = pgEnum('referral_status', [
  'lead', 'registered', 'engaged', 'converted', 'rejected'
]);

export const commissionStatusEnum = pgEnum('commission_status', [
  'pending', 'approved', 'paid', 'cancelled'
]);

export const entityTypeEnum = pgEnum('entity_type', [
  'sole_proprietorship', 'llc', 's_corp', 'c_corp', 'partnership', 'other'
]);

export const returnTypeEnum = pgEnum('return_type', [
  'personal', 'business'
]);

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  isAdmin: boolean("is_admin").default(false),
  hasSeenOnboarding: boolean("has_seen_onboarding").default(false),
  hasCompletedQuestionnaire: boolean("has_completed_questionnaire").default(false),
  referredByAffiliateId: varchar("referred_by_affiliate_id"),
  referralCode: varchar("referral_code"),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id"), // optional link to a business
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  documentType: documentTypeEnum("document_type").default('other'),
  status: documentStatusEnum("status").default('pending'),
  taxYear: integer("tax_year").default(2025),
  aiClassification: jsonb("ai_classification"),
  isArchived: boolean("is_archived").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Required documents checklist
export const requiredDocuments = pgTable("required_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  returnId: varchar("return_id"), // links to personal or business return
  documentType: documentTypeEnum("document_type").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  isUploaded: boolean("is_uploaded").default(false),
  markedNotApplicable: boolean("marked_not_applicable").default(false),
  documentId: varchar("document_id").references(() => documents.id),
  taxYear: integer("tax_year").default(2025),
});

// Signatures table
export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type").notNull(), // engagement_letter, form_8879
  signatureData: text("signature_data").notNull(), // base64 signature image
  signedAt: timestamp("signed_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  taxYear: integer("tax_year").default(2025),
});

// Refund tracking table
export const refundTracking = pgTable("refund_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  returnPrepStatus: returnPrepStatusEnum("return_prep_status").default('not_started'),
  federalStatus: refundStatusEnum("federal_status").default('not_filed'),
  federalAmount: decimal("federal_amount", { precision: 10, scale: 2 }),
  federalEstimatedDate: timestamp("federal_estimated_date"),
  stateStatus: refundStatusEnum("state_status").default('not_filed'),
  stateAmount: decimal("state_amount", { precision: 10, scale: 2 }),
  stateEstimatedDate: timestamp("state_estimated_date"),
  stateName: varchar("state_name"),
  taxYear: integer("tax_year").default(2025),
  lastChecked: timestamp("last_checked").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages/Chat table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").default('text'),
  isFromClient: boolean("is_from_client").default(true),
  attachmentUrl: varchar("attachment_url"),
  attachmentName: varchar("attachment_name"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax questionnaire responses
export const questionnaireResponses = pgTable("questionnaire_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  questionId: varchar("question_id").notNull(),
  answer: jsonb("answer").notNull(),
  taxYear: integer("tax_year").default(2025),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  status: invoiceStatusEnum("status").default('draft'),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  taxYear: integer("tax_year").default(2025),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice line items
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: integer("quantity").default(1),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

// Businesses table
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  entityType: entityTypeEnum("entity_type").default('sole_proprietorship'),
  taxId: varchar("tax_id"), // EIN
  industry: varchar("industry"),
  description: text("description"),
  address: text("address"),
  grossIncome: decimal("gross_income", { precision: 12, scale: 2 }),
  taxYear: integer("tax_year").default(2025),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business owners table
export const businessOwners = pgTable("business_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: varchar("name").notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }),
  ssn: varchar("ssn"), // Last 4 only for display
  email: varchar("email"),
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business expenses table
export const businessExpenses = pgTable("business_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  category: varchar("category").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxYear: integer("tax_year").default(2025),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dependents table
export const dependentRelationshipEnum = pgEnum('dependent_relationship', [
  'child', 'stepchild', 'foster_child', 'grandchild', 'sibling', 'parent', 'grandparent', 'other_relative', 'other'
]);

export const dependents = pgTable("dependents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  ssn: varchar("ssn"), // Stored encrypted or last 4 for display
  relationship: dependentRelationshipEnum("relationship").default('child'),
  monthsLivedInHome: integer("months_lived_in_home").default(12),
  taxYear: integer("tax_year").default(2025),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Returns table (tracks personal and business returns separately)
export const returns = pgTable("returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").references(() => businesses.id), // null for personal returns
  returnType: returnTypeEnum("return_type").notNull(),
  name: varchar("name").notNull(), // "Personal Return" or business name
  status: returnPrepStatusEnum("status").default('not_started'),
  taxYear: integer("tax_year").default(2025),
  federalStatus: refundStatusEnum("federal_status").default('not_filed'),
  federalAmount: decimal("federal_amount", { precision: 10, scale: 2 }),
  stateStatus: refundStatusEnum("state_status").default('not_filed'),
  stateAmount: decimal("state_amount", { precision: 10, scale: 2 }),
  stateName: varchar("state_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Affiliates table
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  companyName: varchar("company_name"),
  phone: varchar("phone"),
  referralCode: varchar("referral_code").unique().notNull(),
  payoutRate: decimal("payout_rate", { precision: 5, scale: 2 }).default('10.00'),
  status: affiliateStatusEnum("status").default('pending'),
  totalReferrals: integer("total_referrals").default(0),
  totalConversions: integer("total_conversions").default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Affiliate sessions table
export const affiliateSessions = pgTable(
  "affiliate_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_affiliate_session_expire").on(table.expire)],
);

// Affiliate referrals table
export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  clientUserId: varchar("client_user_id").references(() => users.id),
  referralCode: varchar("referral_code").notNull(),
  leadEmail: varchar("lead_email"),
  leadName: varchar("lead_name"),
  status: referralStatusEnum("status").default('lead'),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  commissionStatus: commissionStatusEnum("commission_status").default('pending'),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product display location enum
export const productDisplayEnum = pgEnum('product_display', [
  'sidebar', 'tools', 'both'
]);

// Products table (admin-defined service templates)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon").default('Package'),
  displayLocation: productDisplayEnum("display_location").default('sidebar'),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product stages table (Kanban columns per product)
export const productStages = pgTable("product_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  color: varchar("color").default('#6b7280'),
  sortOrder: integer("sort_order").default(0),
});

// Product document requirements (documents needed per product)
export const productDocumentRequirements = pgTable("product_document_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  sortOrder: integer("sort_order").default(0),
});

// Client products table (instances of products assigned to clients)
export const clientProducts = pgTable("client_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  currentStageId: varchar("current_stage_id").references(() => productStages.id),
  name: varchar("name"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ uploadedAt: true });
export const insertRequiredDocumentSchema = createInsertSchema(requiredDocuments);
export const insertSignatureSchema = createInsertSchema(signatures).omit({ signedAt: true });
export const insertRefundTrackingSchema = createInsertSchema(refundTracking).omit({ lastChecked: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ createdAt: true });
export const insertQuestionnaireResponseSchema = createInsertSchema(questionnaireResponses).omit({ updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);
export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ createdAt: true, updatedAt: true });
export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).omit({ createdAt: true, updatedAt: true });
export const insertBusinessSchema = createInsertSchema(businesses).omit({ createdAt: true, updatedAt: true });
export const insertBusinessOwnerSchema = createInsertSchema(businessOwners).omit({ createdAt: true });
export const insertBusinessExpenseSchema = createInsertSchema(businessExpenses).omit({ createdAt: true });
export const insertReturnSchema = createInsertSchema(returns).omit({ createdAt: true, updatedAt: true });
export const insertDependentSchema = createInsertSchema(dependents).omit({ createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ createdAt: true, updatedAt: true });
export const insertProductStageSchema = createInsertSchema(productStages);
export const insertProductDocumentRequirementSchema = createInsertSchema(productDocumentRequirements);
export const insertClientProductSchema = createInsertSchema(clientProducts).omit({ createdAt: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type RequiredDocument = typeof requiredDocuments.$inferSelect;
export type InsertRequiredDocument = z.infer<typeof insertRequiredDocumentSchema>;
export type Signature = typeof signatures.$inferSelect;
export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type RefundTracking = typeof refundTracking.$inferSelect;
export type InsertRefundTracking = z.infer<typeof insertRefundTrackingSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;
export type InsertQuestionnaireResponse = z.infer<typeof insertQuestionnaireResponseSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type BusinessOwner = typeof businessOwners.$inferSelect;
export type InsertBusinessOwner = z.infer<typeof insertBusinessOwnerSchema>;
export type BusinessExpense = typeof businessExpenses.$inferSelect;
export type InsertBusinessExpense = z.infer<typeof insertBusinessExpenseSchema>;
export type Return = typeof returns.$inferSelect;
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Dependent = typeof dependents.$inferSelect;
export type InsertDependent = z.infer<typeof insertDependentSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductStage = typeof productStages.$inferSelect;
export type InsertProductStage = z.infer<typeof insertProductStageSchema>;
export type ProductDocumentRequirement = typeof productDocumentRequirements.$inferSelect;
export type InsertProductDocumentRequirement = z.infer<typeof insertProductDocumentRequirementSchema>;
export type ClientProduct = typeof clientProducts.$inferSelect;
export type InsertClientProduct = z.infer<typeof insertClientProductSchema>;

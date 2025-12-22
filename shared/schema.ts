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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  documentType: documentTypeEnum("document_type").default('other'),
  status: documentStatusEnum("status").default('pending'),
  taxYear: integer("tax_year").default(2024),
  aiClassification: jsonb("ai_classification"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Required documents checklist
export const requiredDocuments = pgTable("required_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: documentTypeEnum("document_type").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  isUploaded: boolean("is_uploaded").default(false),
  documentId: varchar("document_id").references(() => documents.id),
  taxYear: integer("tax_year").default(2024),
});

// Signatures table
export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type").notNull(), // engagement_letter, form_8879
  signatureData: text("signature_data").notNull(), // base64 signature image
  signedAt: timestamp("signed_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  taxYear: integer("tax_year").default(2024),
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
  taxYear: integer("tax_year").default(2024),
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
  taxYear: integer("tax_year").default(2024),
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
  taxYear: integer("tax_year").default(2024),
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

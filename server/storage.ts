import {
  users,
  documents,
  requiredDocuments,
  signatures,
  refundTracking,
  messages,
  questionnaireResponses,
  invoices,
  invoiceItems,
  affiliates,
  affiliateReferrals,
  type User,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type RequiredDocument,
  type InsertRequiredDocument,
  type Signature,
  type InsertSignature,
  type RefundTracking,
  type InsertRefundTracking,
  type Message,
  type InsertMessage,
  type QuestionnaireResponse,
  type InsertQuestionnaireResponse,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Affiliate,
  type InsertAffiliate,
  type AffiliateReferral,
  type InsertAffiliateReferral,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(email: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteClient(id: string): Promise<void>;

  // Document operations
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
  archiveUserDocuments(userId: string, archive: boolean): Promise<void>;

  // Required documents
  getRequiredDocuments(userId: string): Promise<RequiredDocument[]>;
  createRequiredDocument(doc: InsertRequiredDocument): Promise<RequiredDocument>;
  updateRequiredDocument(id: string, updates: Partial<RequiredDocument>): Promise<RequiredDocument | undefined>;

  // Signatures
  getSignatures(userId: string): Promise<Signature[]>;
  createSignature(sig: InsertSignature): Promise<Signature>;

  // Refund tracking
  getRefundTracking(userId: string): Promise<RefundTracking | undefined>;
  upsertRefundTracking(data: InsertRefundTracking): Promise<RefundTracking>;

  // Messages
  getMessages(userId: string): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  markMessagesAsRead(userId: string): Promise<void>;

  // Questionnaire
  getQuestionnaireResponses(userId: string): Promise<QuestionnaireResponse[]>;
  upsertQuestionnaireResponse(response: InsertQuestionnaireResponse): Promise<QuestionnaireResponse>;

  // Invoices
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(inv: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;

  // Invoice items
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;

  // Seed initial data
  seedUserData(userId: string): Promise<void>;

  // Admin operations
  getAllClients(): Promise<User[]>;
  getAllDocuments(): Promise<Document[]>;
  getAllMessages(): Promise<Message[]>;
  getAllSignatures(): Promise<Signature[]>;
  getAllInvoices(): Promise<Invoice[]>;
  getAllRefundTracking(): Promise<RefundTracking[]>;
  setUserAsAdmin(email: string): Promise<User | undefined>;
  replyToMessage(userId: string, content: string): Promise<Message>;

  // Affiliate operations
  getAffiliate(id: string): Promise<Affiliate | undefined>;
  getAffiliateByEmail(email: string): Promise<Affiliate | undefined>;
  getAffiliateByReferralCode(code: string): Promise<Affiliate | undefined>;
  createAffiliate(data: InsertAffiliate): Promise<Affiliate>;
  updateAffiliate(id: string, updates: Partial<Affiliate>): Promise<Affiliate | undefined>;
  getAllAffiliates(): Promise<Affiliate[]>;

  // Affiliate referral operations
  getAffiliateReferrals(affiliateId: string): Promise<AffiliateReferral[]>;
  createAffiliateReferral(data: InsertAffiliateReferral): Promise<AffiliateReferral>;
  updateAffiliateReferral(id: string, updates: Partial<AffiliateReferral>): Promise<AffiliateReferral | undefined>;
  getReferralByClientId(clientUserId: string): Promise<AffiliateReferral | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(email: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    const userInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.userId, id));
    const invoiceIds = userInvoices.map(inv => inv.id);
    
    if (invoiceIds.length > 0) {
      await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));
    }
    await db.delete(invoices).where(eq(invoices.userId, id));
    await db.delete(messages).where(eq(messages.userId, id));
    await db.delete(signatures).where(eq(signatures.userId, id));
    await db.delete(questionnaireResponses).where(eq(questionnaireResponses.userId, id));
    await db.delete(refundTracking).where(eq(refundTracking.userId, id));
    await db.delete(requiredDocuments).where(eq(requiredDocuments.userId, id));
    await db.delete(documents).where(eq(documents.userId, id));
    await db.delete(affiliateReferrals).where(eq(affiliateReferrals.clientUserId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  // Document operations
  async getDocuments(userId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.uploadedAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async archiveUserDocuments(userId: string, archive: boolean): Promise<void> {
    await db
      .update(documents)
      .set({ isArchived: archive })
      .where(eq(documents.userId, userId));
  }

  // Required documents
  async getRequiredDocuments(userId: string): Promise<RequiredDocument[]> {
    return db.select().from(requiredDocuments).where(eq(requiredDocuments.userId, userId));
  }

  async createRequiredDocument(doc: InsertRequiredDocument): Promise<RequiredDocument> {
    const [newDoc] = await db.insert(requiredDocuments).values(doc).returning();
    return newDoc;
  }

  async updateRequiredDocument(id: string, updates: Partial<RequiredDocument>): Promise<RequiredDocument | undefined> {
    const [updated] = await db.update(requiredDocuments).set(updates).where(eq(requiredDocuments.id, id)).returning();
    return updated;
  }

  // Signatures
  async getSignatures(userId: string): Promise<Signature[]> {
    return db.select().from(signatures).where(eq(signatures.userId, userId));
  }

  async createSignature(sig: InsertSignature): Promise<Signature> {
    const [newSig] = await db.insert(signatures).values(sig).returning();
    return newSig;
  }

  // Refund tracking
  async getRefundTracking(userId: string): Promise<RefundTracking | undefined> {
    const [tracking] = await db.select().from(refundTracking).where(eq(refundTracking.userId, userId));
    return tracking;
  }

  async upsertRefundTracking(data: InsertRefundTracking): Promise<RefundTracking> {
    const existing = await this.getRefundTracking(data.userId);
    if (existing) {
      const [updated] = await db
        .update(refundTracking)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(refundTracking.userId, data.userId))
        .returning();
      return updated;
    }
    const [newTracking] = await db.insert(refundTracking).values(data).returning();
    return newTracking;
  }

  // Messages
  async getMessages(userId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.userId, userId)).orderBy(messages.createdAt);
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [newMsg] = await db.insert(messages).values(msg).returning();
    return newMsg;
  }

  async markMessagesAsRead(userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.userId, userId), eq(messages.isFromClient, false)));
  }

  // Questionnaire
  async getQuestionnaireResponses(userId: string): Promise<QuestionnaireResponse[]> {
    return db.select().from(questionnaireResponses).where(eq(questionnaireResponses.userId, userId));
  }

  async upsertQuestionnaireResponse(response: InsertQuestionnaireResponse): Promise<QuestionnaireResponse> {
    const existing = await db
      .select()
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.userId, response.userId),
          eq(questionnaireResponses.questionId, response.questionId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(questionnaireResponses)
        .set({ answer: response.answer, updatedAt: new Date() })
        .where(eq(questionnaireResponses.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newResponse] = await db.insert(questionnaireResponses).values(response).returning();
    return newResponse;
  }

  // Invoices
  async getInvoices(userId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    return inv;
  }

  async createInvoice(inv: InsertInvoice): Promise<Invoice> {
    const [newInv] = await db.insert(invoices).values(inv).returning();
    return newInv;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return updated;
  }

  // Invoice items
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  // Seed initial data for new users
  async seedUserData(userId: string): Promise<void> {
    // Check if user already has required documents
    const existingReqDocs = await this.getRequiredDocuments(userId);
    if (existingReqDocs.length > 0) return;

    // Create required documents checklist
    const requiredDocTypes = [
      { type: "w2", description: "W-2 from your employer(s)" },
      { type: "1099_nec", description: "1099-NEC for freelance or contract work" },
      { type: "1099_int", description: "1099-INT for interest income" },
      { type: "1099_div", description: "1099-DIV for dividend income" },
      { type: "mortgage_interest", description: "Form 1098 for mortgage interest" },
      { type: "property_tax", description: "Property tax statements" },
    ];

    for (const doc of requiredDocTypes) {
      await this.createRequiredDocument({
        userId,
        documentType: doc.type as any,
        description: doc.description,
        isRequired: true,
        isUploaded: false,
        taxYear: 2024,
      });
    }

    // Create initial refund tracking (not filed)
    await this.upsertRefundTracking({
      userId,
      federalStatus: "not_filed",
      stateStatus: "not_filed",
      stateName: "California",
      taxYear: 2024,
    });

    // Create sample invoice
    const invoice = await this.createInvoice({
      userId,
      invoiceNumber: "INV-2024-001",
      status: "sent",
      subtotal: "350.00",
      tax: "0",
      total: "350.00",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      taxYear: 2024,
    });

    // Add invoice items
    await this.createInvoiceItem({
      invoiceId: invoice.id,
      description: "Federal Tax Return Preparation",
      quantity: 1,
      rate: "250.00",
      amount: "250.00",
    });

    await this.createInvoiceItem({
      invoiceId: invoice.id,
      description: "State Tax Return Preparation",
      quantity: 1,
      rate: "100.00",
      amount: "100.00",
    });

    // Create welcome message
    await this.createMessage({
      userId,
      content: "Welcome to TaxPortal! We're excited to help you with your tax preparation. Please start by uploading your tax documents and completing the questionnaire. If you have any questions, feel free to message us here.",
      messageType: "text",
      isFromClient: false,
      isRead: false,
    });
  }

  // Admin operations
  async getAllClients(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isAdmin, false)).orderBy(desc(users.createdAt));
  }

  async getAllDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.uploadedAt));
  }

  async getAllMessages(): Promise<Message[]> {
    return db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getAllSignatures(): Promise<Signature[]> {
    return db.select().from(signatures).orderBy(desc(signatures.signedAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getAllRefundTracking(): Promise<RefundTracking[]> {
    return db.select().from(refundTracking).orderBy(desc(refundTracking.updatedAt));
  }

  async setUserAsAdmin(email: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async replyToMessage(userId: string, content: string): Promise<Message> {
    return this.createMessage({
      userId,
      content,
      messageType: "text",
      isFromClient: false,
      isRead: false,
    });
  }

  // Affiliate operations
  async getAffiliate(id: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }

  async getAffiliateByEmail(email: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.email, email));
    return affiliate;
  }

  async getAffiliateByReferralCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.referralCode, code));
    return affiliate;
  }

  async createAffiliate(data: InsertAffiliate): Promise<Affiliate> {
    const [affiliate] = await db.insert(affiliates).values(data).returning();
    return affiliate;
  }

  async updateAffiliate(id: string, updates: Partial<Affiliate>): Promise<Affiliate | undefined> {
    const [updated] = await db
      .update(affiliates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(affiliates.id, id))
      .returning();
    return updated;
  }

  async getAllAffiliates(): Promise<Affiliate[]> {
    return db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
  }

  // Affiliate referral operations
  async getAffiliateReferrals(affiliateId: string): Promise<AffiliateReferral[]> {
    return db.select().from(affiliateReferrals).where(eq(affiliateReferrals.affiliateId, affiliateId)).orderBy(desc(affiliateReferrals.createdAt));
  }

  async createAffiliateReferral(data: InsertAffiliateReferral): Promise<AffiliateReferral> {
    const [referral] = await db.insert(affiliateReferrals).values(data).returning();
    return referral;
  }

  async updateAffiliateReferral(id: string, updates: Partial<AffiliateReferral>): Promise<AffiliateReferral | undefined> {
    const [updated] = await db
      .update(affiliateReferrals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(affiliateReferrals.id, id))
      .returning();
    return updated;
  }

  async getReferralByClientId(clientUserId: string): Promise<AffiliateReferral | undefined> {
    const [referral] = await db.select().from(affiliateReferrals).where(eq(affiliateReferrals.clientUserId, clientUserId));
    return referral;
  }
}

export const storage = new DatabaseStorage();

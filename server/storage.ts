import {
  users,
  sessions,
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
  businesses,
  businessOwners,
  businessExpenses,
  returns,
  dependents,
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
  type Business,
  type InsertBusiness,
  type BusinessOwner,
  type InsertBusinessOwner,
  type BusinessExpense,
  type InsertBusinessExpense,
  type Return,
  type InsertReturn,
  type Dependent,
  type InsertDependent,
  products,
  productStages,
  productDocumentRequirements,
  clientProducts,
  type Product,
  type InsertProduct,
  type ProductStage,
  type InsertProductStage,
  type ProductDocumentRequirement,
  type InsertProductDocumentRequirement,
  type ClientProduct,
  type InsertClientProduct,
  appointments,
  type Appointment,
  type InsertAppointment,
  personalEvents,
  type PersonalEvent,
  type InsertPersonalEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
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
  getRequiredDocument(id: string): Promise<RequiredDocument | undefined>;
  createRequiredDocument(doc: InsertRequiredDocument): Promise<RequiredDocument>;
  updateRequiredDocument(id: string, updates: Partial<RequiredDocument>): Promise<RequiredDocument | undefined>;
  unlinkDocumentFromChecklist(documentId: string): Promise<void>;
  clearRequiredDocuments(userId: string): Promise<void>;
  regenerateRequiredDocuments(userId: string, documents: { type: string; description: string; isBusinessDoc: boolean }[], personalReturnId: string | null, businessReturnId: string | null): Promise<void>;
  markRequiredDocumentNotApplicable(userId: string, docId: string, notApplicable: boolean): Promise<RequiredDocument | null>;

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

  // Business operations
  getBusinesses(userId: string): Promise<Business[]>;
  getBusiness(id: string): Promise<Business | undefined>;
  createBusiness(data: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, updates: Partial<Business>): Promise<Business | undefined>;
  deleteBusiness(id: string): Promise<void>;

  // Business owner operations
  getBusinessOwner(id: string): Promise<BusinessOwner | undefined>;
  getBusinessOwners(businessId: string): Promise<BusinessOwner[]>;
  createBusinessOwner(data: InsertBusinessOwner): Promise<BusinessOwner>;
  updateBusinessOwner(id: string, updates: Partial<BusinessOwner>): Promise<BusinessOwner | undefined>;
  deleteBusinessOwner(id: string): Promise<void>;

  // Business expense operations
  getBusinessExpense(id: string): Promise<BusinessExpense | undefined>;
  getBusinessExpenses(businessId: string): Promise<BusinessExpense[]>;
  createBusinessExpense(data: InsertBusinessExpense): Promise<BusinessExpense>;
  updateBusinessExpense(id: string, updates: Partial<BusinessExpense>): Promise<BusinessExpense | undefined>;
  deleteBusinessExpense(id: string): Promise<void>;

  // Return operations
  getReturns(userId: string): Promise<Return[]>;
  getReturn(id: string): Promise<Return | undefined>;
  createReturn(data: InsertReturn): Promise<Return>;
  updateReturn(id: string, updates: Partial<Return>): Promise<Return | undefined>;
  deleteReturn(id: string): Promise<void>;
  getReturnByBusiness(businessId: string): Promise<Return | undefined>;
  ensurePersonalReturn(userId: string): Promise<Return>;

  // Dependent operations
  getDependents(userId: string): Promise<Dependent[]>;
  getDependent(id: string): Promise<Dependent | undefined>;
  createDependent(data: InsertDependent): Promise<Dependent>;
  updateDependent(id: string, updates: Partial<Dependent>): Promise<Dependent | undefined>;
  deleteDependent(id: string): Promise<void>;
  deleteUserDependents(userId: string): Promise<void>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Product stage operations
  getProductStages(productId: string): Promise<ProductStage[]>;
  createProductStage(data: InsertProductStage): Promise<ProductStage>;
  updateProductStage(id: string, updates: Partial<ProductStage>): Promise<ProductStage | undefined>;
  deleteProductStage(id: string): Promise<void>;
  deleteProductStages(productId: string): Promise<void>;

  // Product document requirement operations
  getProductDocumentRequirements(productId: string): Promise<ProductDocumentRequirement[]>;
  createProductDocumentRequirement(data: InsertProductDocumentRequirement): Promise<ProductDocumentRequirement>;
  deleteProductDocumentRequirements(productId: string): Promise<void>;

  // Client product operations
  getClientProducts(userId: string): Promise<ClientProduct[]>;
  getAllClientProducts(): Promise<ClientProduct[]>;
  getClientProduct(id: string): Promise<ClientProduct | undefined>;
  createClientProduct(data: InsertClientProduct): Promise<ClientProduct>;
  updateClientProduct(id: string, updates: Partial<ClientProduct>): Promise<ClientProduct | undefined>;
  deleteClientProduct(id: string): Promise<void>;

  // Appointment operations
  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(data: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<void>;

  // Personal event operations
  getPersonalEvents(userId: string): Promise<PersonalEvent[]>;
  getPersonalEvent(id: string): Promise<PersonalEvent | undefined>;
  createPersonalEvent(data: InsertPersonalEvent): Promise<PersonalEvent>;
  updatePersonalEvent(id: string, updates: Partial<PersonalEvent>): Promise<PersonalEvent | undefined>;
  deletePersonalEvent(id: string): Promise<void>;
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
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
    await db.delete(dependents).where(eq(dependents.userId, id));
    await db.delete(returns).where(eq(returns.userId, id));
    await db.delete(clientProducts).where(eq(clientProducts.userId, id));
    await db.delete(appointments).where(eq(appointments.clientId, id));
    await db.delete(personalEvents).where(eq(personalEvents.userId, id));
    
    const userBusinesses = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.userId, id));
    const businessIds = userBusinesses.map(b => b.id);
    
    if (businessIds.length > 0) {
      await db.delete(businessExpenses).where(inArray(businessExpenses.businessId, businessIds));
      await db.delete(businessOwners).where(inArray(businessOwners.businessId, businessIds));
    }
    await db.delete(businesses).where(eq(businesses.userId, id));
    
    await db.execute(
      sql`DELETE FROM sessions WHERE sess->>'userId' = ${id} OR sess->'passport'->>'user' = ${id}`
    );
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

  async getRequiredDocument(id: string): Promise<RequiredDocument | undefined> {
    const [doc] = await db.select().from(requiredDocuments).where(eq(requiredDocuments.id, id));
    return doc;
  }

  async createRequiredDocument(doc: InsertRequiredDocument): Promise<RequiredDocument> {
    const [newDoc] = await db.insert(requiredDocuments).values(doc).returning();
    return newDoc;
  }

  async updateRequiredDocument(id: string, updates: Partial<RequiredDocument>): Promise<RequiredDocument | undefined> {
    const [updated] = await db.update(requiredDocuments).set(updates).where(eq(requiredDocuments.id, id)).returning();
    return updated;
  }

  async unlinkDocumentFromChecklist(documentId: string): Promise<void> {
    await db.update(requiredDocuments)
      .set({ documentId: null, isUploaded: false })
      .where(eq(requiredDocuments.documentId, documentId));
  }

  async clearRequiredDocuments(userId: string): Promise<void> {
    await db.delete(requiredDocuments).where(eq(requiredDocuments.userId, userId));
  }

  async markRequiredDocumentNotApplicable(userId: string, docId: string, notApplicable: boolean): Promise<RequiredDocument | null> {
    const [updated] = await db.update(requiredDocuments)
      .set({ markedNotApplicable: notApplicable })
      .where(and(eq(requiredDocuments.id, docId), eq(requiredDocuments.userId, userId)))
      .returning();
    return updated || null;
  }

  async regenerateRequiredDocuments(
    userId: string, 
    docs: { type: string; description: string; isBusinessDoc: boolean }[],
    personalReturnId: string | null,
    businessReturnId: string | null
  ): Promise<void> {
    await this.clearRequiredDocuments(userId);
    
    for (const doc of docs) {
      // Link to appropriate return based on isBusinessDoc flag
      const returnId = doc.isBusinessDoc ? businessReturnId : personalReturnId;
      
      await this.createRequiredDocument({
        userId,
        returnId: returnId || undefined,
        documentType: doc.type as any,
        description: doc.description,
        taxYear: 2025,
      });
    }
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
        taxYear: 2025,
      });
    }

    // Create initial refund tracking (not filed)
    await this.upsertRefundTracking({
      userId,
      federalStatus: "not_filed",
      stateStatus: "not_filed",
      stateName: "California",
      taxYear: 2025,
    });

    // Note: Invoices are now created manually by admin via the Invoice Creator

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

  // Business operations
  async getBusinesses(userId: string): Promise<Business[]> {
    return db.select().from(businesses).where(eq(businesses.userId, userId)).orderBy(desc(businesses.createdAt));
  }

  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business;
  }

  async createBusiness(data: InsertBusiness): Promise<Business> {
    const [business] = await db.insert(businesses).values(data).returning();
    return business;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business | undefined> {
    const [updated] = await db
      .update(businesses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return updated;
  }

  async deleteBusiness(id: string): Promise<void> {
    await db.delete(businessExpenses).where(eq(businessExpenses.businessId, id));
    await db.delete(businessOwners).where(eq(businessOwners.businessId, id));
    await db.delete(returns).where(eq(returns.businessId, id));
    await db.update(documents).set({ businessId: null }).where(eq(documents.businessId, id));
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  // Business owner operations
  async getBusinessOwner(id: string): Promise<BusinessOwner | undefined> {
    const [owner] = await db.select().from(businessOwners).where(eq(businessOwners.id, id));
    return owner;
  }

  async getBusinessOwners(businessId: string): Promise<BusinessOwner[]> {
    return db.select().from(businessOwners).where(eq(businessOwners.businessId, businessId));
  }

  async createBusinessOwner(data: InsertBusinessOwner): Promise<BusinessOwner> {
    const [owner] = await db.insert(businessOwners).values(data).returning();
    return owner;
  }

  async updateBusinessOwner(id: string, updates: Partial<BusinessOwner>): Promise<BusinessOwner | undefined> {
    const [updated] = await db
      .update(businessOwners)
      .set(updates)
      .where(eq(businessOwners.id, id))
      .returning();
    return updated;
  }

  async deleteBusinessOwner(id: string): Promise<void> {
    await db.delete(businessOwners).where(eq(businessOwners.id, id));
  }

  // Business expense operations
  async getBusinessExpense(id: string): Promise<BusinessExpense | undefined> {
    const [expense] = await db.select().from(businessExpenses).where(eq(businessExpenses.id, id));
    return expense;
  }

  async getBusinessExpenses(businessId: string): Promise<BusinessExpense[]> {
    return db.select().from(businessExpenses).where(eq(businessExpenses.businessId, businessId));
  }

  async createBusinessExpense(data: InsertBusinessExpense): Promise<BusinessExpense> {
    const [expense] = await db.insert(businessExpenses).values(data).returning();
    return expense;
  }

  async updateBusinessExpense(id: string, updates: Partial<BusinessExpense>): Promise<BusinessExpense | undefined> {
    const [updated] = await db
      .update(businessExpenses)
      .set(updates)
      .where(eq(businessExpenses.id, id))
      .returning();
    return updated;
  }

  async deleteBusinessExpense(id: string): Promise<void> {
    await db.delete(businessExpenses).where(eq(businessExpenses.id, id));
  }

  // Return operations
  async getReturns(userId: string): Promise<Return[]> {
    return db.select().from(returns).where(eq(returns.userId, userId)).orderBy(desc(returns.createdAt));
  }

  async getReturn(id: string): Promise<Return | undefined> {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id));
    return ret;
  }

  async createReturn(data: InsertReturn): Promise<Return> {
    const [ret] = await db.insert(returns).values(data).returning();
    return ret;
  }

  async updateReturn(id: string, updates: Partial<Return>): Promise<Return | undefined> {
    const [updated] = await db
      .update(returns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(returns.id, id))
      .returning();
    return updated;
  }

  async deleteReturn(id: string): Promise<void> {
    await db.delete(returns).where(eq(returns.id, id));
  }

  async getReturnByBusiness(businessId: string): Promise<Return | undefined> {
    const [ret] = await db.select().from(returns).where(eq(returns.businessId, businessId));
    return ret;
  }

  async ensurePersonalReturn(userId: string): Promise<Return> {
    const existingReturns = await db.select().from(returns).where(
      and(eq(returns.userId, userId), eq(returns.returnType, 'personal'))
    );
    if (existingReturns.length > 0) {
      return existingReturns[0];
    }
    const [newReturn] = await db.insert(returns).values({
      userId,
      returnType: 'personal',
      name: 'Personal Return',
      taxYear: 2025,
    }).returning();
    return newReturn;
  }

  // Dependent operations
  async getDependents(userId: string): Promise<Dependent[]> {
    return db.select().from(dependents).where(eq(dependents.userId, userId));
  }

  async getDependent(id: string): Promise<Dependent | undefined> {
    const [dep] = await db.select().from(dependents).where(eq(dependents.id, id));
    return dep;
  }

  async createDependent(data: InsertDependent): Promise<Dependent> {
    const [dep] = await db.insert(dependents).values(data).returning();
    return dep;
  }

  async updateDependent(id: string, updates: Partial<Dependent>): Promise<Dependent | undefined> {
    const [updated] = await db
      .update(dependents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dependents.id, id))
      .returning();
    return updated;
  }

  async deleteDependent(id: string): Promise<void> {
    await db.delete(dependents).where(eq(dependents.id, id));
  }

  async deleteUserDependents(userId: string): Promise<void> {
    await db.delete(dependents).where(eq(dependents.userId, userId));
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(products.sortOrder);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Product stage operations
  async getProductStages(productId: string): Promise<ProductStage[]> {
    return db.select().from(productStages).where(eq(productStages.productId, productId)).orderBy(productStages.sortOrder);
  }

  async createProductStage(data: InsertProductStage): Promise<ProductStage> {
    const [stage] = await db.insert(productStages).values(data).returning();
    return stage;
  }

  async updateProductStage(id: string, updates: Partial<ProductStage>): Promise<ProductStage | undefined> {
    const [updated] = await db
      .update(productStages)
      .set(updates)
      .where(eq(productStages.id, id))
      .returning();
    return updated;
  }

  async deleteProductStage(id: string): Promise<void> {
    await db.delete(productStages).where(eq(productStages.id, id));
  }

  async deleteProductStages(productId: string): Promise<void> {
    await db.delete(productStages).where(eq(productStages.productId, productId));
  }

  // Product document requirement operations
  async getProductDocumentRequirements(productId: string): Promise<ProductDocumentRequirement[]> {
    return db.select().from(productDocumentRequirements)
      .where(eq(productDocumentRequirements.productId, productId))
      .orderBy(productDocumentRequirements.sortOrder);
  }

  async createProductDocumentRequirement(data: InsertProductDocumentRequirement): Promise<ProductDocumentRequirement> {
    const [req] = await db.insert(productDocumentRequirements).values(data).returning();
    return req;
  }

  async deleteProductDocumentRequirements(productId: string): Promise<void> {
    await db.delete(productDocumentRequirements).where(eq(productDocumentRequirements.productId, productId));
  }

  // Client product operations
  async getClientProducts(userId: string): Promise<ClientProduct[]> {
    return db.select().from(clientProducts).where(eq(clientProducts.userId, userId)).orderBy(desc(clientProducts.createdAt));
  }

  async getAllClientProducts(): Promise<ClientProduct[]> {
    return db.select().from(clientProducts).orderBy(desc(clientProducts.createdAt));
  }

  async getClientProduct(id: string): Promise<ClientProduct | undefined> {
    const [cp] = await db.select().from(clientProducts).where(eq(clientProducts.id, id));
    return cp;
  }

  async createClientProduct(data: InsertClientProduct): Promise<ClientProduct> {
    const [cp] = await db.insert(clientProducts).values(data).returning();
    return cp;
  }

  async updateClientProduct(id: string, updates: Partial<ClientProduct>): Promise<ClientProduct | undefined> {
    const [updated] = await db
      .update(clientProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientProducts.id, id))
      .returning();
    return updated;
  }

  async deleteClientProduct(id: string): Promise<void> {
    await db.delete(clientProducts).where(eq(clientProducts.id, id));
  }

  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.startTime));
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.startTime));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(data).returning();
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async getPersonalEvents(userId: string): Promise<PersonalEvent[]> {
    return await db.select().from(personalEvents).where(eq(personalEvents.userId, userId)).orderBy(desc(personalEvents.startTime));
  }

  async getPersonalEvent(id: string): Promise<PersonalEvent | undefined> {
    const [event] = await db.select().from(personalEvents).where(eq(personalEvents.id, id));
    return event;
  }

  async createPersonalEvent(data: InsertPersonalEvent): Promise<PersonalEvent> {
    const [event] = await db.insert(personalEvents).values(data).returning();
    return event;
  }

  async updatePersonalEvent(id: string, updates: Partial<PersonalEvent>): Promise<PersonalEvent | undefined> {
    const [updated] = await db
      .update(personalEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(personalEvents.id, id))
      .returning();
    return updated;
  }

  async deletePersonalEvent(id: string): Promise<void> {
    await db.delete(personalEvents).where(eq(personalEvents.id, id));
  }
}

export const storage = new DatabaseStorage();

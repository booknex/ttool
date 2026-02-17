import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, verifyPassword } from "./auth";
import { generateRequiredDocuments } from "./document-requirements";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Documents
      "application/pdf",
      // Images
      "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
      // Spreadsheets
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "text/csv", // .csv
      "application/csv", // .csv (alternate)
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PDF, images, and spreadsheets (xlsx, xls, csv)"));
    }
  },
});

// Simple document type detection based on filename
function detectDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("w2") || lower.includes("w-2")) return "w2";
  if (lower.includes("1099-nec") || lower.includes("1099nec")) return "1099_nec";
  if (lower.includes("1099-k") || lower.includes("1099k")) return "1099_k";
  if (lower.includes("1099-int") || lower.includes("1099int")) return "1099_int";
  if (lower.includes("1099-div") || lower.includes("1099div")) return "1099_div";
  if (lower.includes("1099-b") || lower.includes("1099b")) return "1099_b";
  if (lower.includes("k-1") || lower.includes("k1")) return "k1";
  if (lower.includes("brokerage")) return "brokerage";
  if (lower.includes("1098") || lower.includes("mortgage")) return "mortgage_interest";
  if (lower.includes("property") && lower.includes("tax")) return "property_tax";
  if (lower.includes("donation") || lower.includes("charitable")) return "charitable_donation";
  if (lower.includes("medical")) return "medical_expense";
  if (lower.includes("8879")) return "form_8879";
  if (lower.includes("engagement")) return "engagement_letter";
  return "other";
}

// AI classification simulation - generates mock classification data
function generateAIClassification(filename: string, documentType: string) {
  const confidence = 0.75 + Math.random() * 0.24; // 75-99% confidence
  return {
    suggestedType: documentType,
    confidence: Number(confidence.toFixed(2)),
    taxYear: 2025,
    extractedFields: {
      filename,
      analyzedAt: new Date().toISOString(),
      source: "ai_classification_v1",
    },
    keywords: getDocumentKeywords(documentType),
  };
}

function getDocumentKeywords(docType: string): string[] {
  const keywords: Record<string, string[]> = {
    w2: ["wages", "salary", "federal tax withheld", "employer"],
    "1099_nec": ["nonemployee compensation", "contractor", "freelance"],
    "1099_int": ["interest income", "bank", "savings"],
    "1099_div": ["dividends", "capital gains", "investment"],
    mortgage_interest: ["mortgage", "interest paid", "1098"],
    property_tax: ["property tax", "real estate", "assessment"],
    charitable_donation: ["donation", "charitable", "contribution"],
    medical_expense: ["medical", "healthcare", "prescription"],
    other: ["document", "tax related"],
  };
  return keywords[docType] || keywords.other;
}

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  setupAuth(app);

  const resolveDbUser = async (req: any, res: any, next: any) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      req.dbUser = user;
      next();
    } catch (error) {
      console.error("Error resolving user:", error);
      res.status(500).json({ message: "Failed to resolve user" });
    }
  };

  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, referralCode } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser(email, passwordHash, firstName, lastName);
      
      // Handle referral code attribution
      if (referralCode) {
        const affiliate = await storage.getAffiliateByReferralCode(referralCode);
        if (affiliate) {
          // Update user with referral info
          await storage.updateUser(user.id, { 
            referredByAffiliateId: affiliate.id,
            referralCode: referralCode
          });
          // Create referral record
          await storage.createAffiliateReferral({
            affiliateId: affiliate.id,
            clientUserId: user.id,
            referralCode: referralCode,
            leadEmail: email,
            leadName: `${firstName || ''} ${lastName || ''}`.trim() || undefined,
            status: 'registered',
          });
          // Update affiliate stats
          await storage.updateAffiliate(affiliate.id, {
            totalReferrals: (affiliate.totalReferrals || 0) + 1,
          });
        }
      }
      
      (req.session as any).userId = user.id;
      delete (req.session as any).isImpersonating;
      delete (req.session as any).originalAdminId;
      await storage.seedUserData(user.id);
      
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;
      delete (req.session as any).isImpersonating;
      delete (req.session as any).originalAdminId;
      
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const user = req.dbUser;
      await storage.seedUserData(user.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/complete-onboarding", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      await storage.updateUser(userId, { hasSeenOnboarding: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  app.post("/api/auth/complete-questionnaire", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      console.log("Completing questionnaire for user:", userId);
      await storage.updateUser(userId, { hasCompletedQuestionnaire: true });
      
      // Auto-advance all returns to documents_gathering phase since they now have their document checklist
      const userReturns = await storage.getReturns(userId);
      for (const ret of userReturns) {
        if (ret.status === 'not_started' || !ret.status) {
          await storage.updateReturn(ret.id, { status: 'documents_gathering' });
        }
      }
      
      console.log("Questionnaire completed successfully for user:", userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error completing questionnaire:", error);
      console.error("Error details:", error?.message, error?.stack);
      res.status(500).json({ message: "Failed to complete questionnaire", error: error?.message });
    }
  });

  // Document routes
  app.get("/api/documents", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const docs = await storage.getDocuments(userId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents/upload", isAuthenticated, resolveDbUser, upload.array("files", 10), async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const files = req.files as Express.Multer.File[];
      const requiredDocumentId = req.body.requiredDocumentId;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedDocs = [];
      for (const file of files) {
        let documentType = detectDocumentType(file.originalname);
        
        // If user selected a specific checklist item, use its document type
        if (requiredDocumentId) {
          const reqDoc = await storage.getRequiredDocument(requiredDocumentId);
          if (reqDoc && reqDoc.userId === userId && !reqDoc.isUploaded) {
            documentType = reqDoc.documentType || documentType;
          }
        }
        
        const aiClassification = generateAIClassification(file.originalname, documentType);
        
        const doc = await storage.createDocument({
          userId,
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          documentType: documentType as any,
          status: "processing",
          taxYear: 2025,
          aiClassification,
        });

        uploadedDocs.push(doc);

        // If user explicitly selected a checklist item, link to that
        if (requiredDocumentId) {
          const reqDoc = await storage.getRequiredDocument(requiredDocumentId);
          if (reqDoc && reqDoc.userId === userId && !reqDoc.isUploaded) {
            await storage.updateRequiredDocument(requiredDocumentId, {
              isUploaded: true,
              documentId: doc.id,
            });
          }
        } else {
          // Auto-match by document type if no explicit selection
          const reqDocs = await storage.getRequiredDocuments(userId);
          const matchingReq = reqDocs.find(
            (rd) => rd.documentType === documentType && !rd.isUploaded
          );
          if (matchingReq) {
            await storage.updateRequiredDocument(matchingReq.id, {
              isUploaded: true,
              documentId: doc.id,
            });
          }
        }

        // Simulate processing completion after a delay
        setTimeout(async () => {
          await storage.updateDocument(doc.id, { status: "verified" });
        }, 3000);
      }

      res.json(uploadedDocs);
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ message: "Failed to upload documents" });
    }
  });

  app.get("/api/documents/:id/file", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const doc = await storage.getDocument(req.params.id);
      
      if (!doc || doc.userId !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }

      const filePath = path.join(uploadDir, doc.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader("Content-Type", doc.fileType);
      const disposition = req.query.download === "true" ? "attachment" : "inline";
      res.setHeader("Content-Disposition", `${disposition}; filename="${doc.originalName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const doc = await storage.getDocument(req.params.id);
      
      if (!doc || doc.userId !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Unlink from checklist first (removes foreign key reference)
      await storage.unlinkDocumentFromChecklist(req.params.id);

      // Delete the file
      const filePath = path.join(uploadDir, doc.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Required documents routes
  app.get("/api/required-documents", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const docs = await storage.getRequiredDocuments(userId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching required documents:", error);
      res.status(500).json({ message: "Failed to fetch required documents" });
    }
  });

  // Mark required document as not applicable (client doesn't have it)
  app.patch("/api/required-documents/:id/not-applicable", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { id } = req.params;
      const { notApplicable } = req.body;
      
      const updated = await storage.markRequiredDocumentNotApplicable(userId, id, notApplicable);
      if (!updated) {
        return res.status(404).json({ message: "Document requirement not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating required document:", error);
      res.status(500).json({ message: "Failed to update document requirement" });
    }
  });

  // Signature routes
  app.get("/api/signatures", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const sigs = await storage.getSignatures(userId);
      res.json(sigs);
    } catch (error) {
      console.error("Error fetching signatures:", error);
      res.status(500).json({ message: "Failed to fetch signatures" });
    }
  });

  app.post("/api/signatures", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { documentType, signatureData } = req.body;

      if (!documentType || !signatureData) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const sig = await storage.createSignature({
        userId,
        documentType,
        signatureData,
        ipAddress: req.ip,
        taxYear: 2025,
      });

      res.json(sig);
    } catch (error) {
      console.error("Error creating signature:", error);
      res.status(500).json({ message: "Failed to create signature" });
    }
  });

  // Refund tracking routes
  app.get("/api/refund", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const tracking = await storage.getRefundTracking(userId);
      res.json(tracking || null);
    } catch (error) {
      console.error("Error fetching refund tracking:", error);
      res.status(500).json({ message: "Failed to fetch refund tracking" });
    }
  });

  // Client can advance their return status when signature is complete
  app.post("/api/refund/advance-status", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const tracking = await storage.getRefundTracking(userId);
      
      if (!tracking) {
        return res.status(404).json({ message: "No tracking record found" });
      }

      const currentStatus = (tracking as any).returnPrepStatus;
      
      // Only allow advancing from signature_required to filing
      if (currentStatus !== "signature_required") {
        return res.status(400).json({ 
          message: "Can only advance status when signature is required",
          currentStatus 
        });
      }

      // Check if client has signed Form 8879
      const signatures = await storage.getSignatures(userId);
      const hasForm8879 = signatures.some(s => s.documentType === "form_8879");
      
      if (!hasForm8879) {
        return res.status(400).json({ 
          message: "Please sign Form 8879 before advancing" 
        });
      }

      // Advance to filing status
      const updated = await storage.upsertRefundTracking({
        userId,
        returnPrepStatus: "filing",
        taxYear: 2025,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error advancing return status:", error);
      res.status(500).json({ message: "Failed to advance status" });
    }
  });

  // Message routes
  app.get("/api/messages", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const msgs = await storage.getMessages(userId);
      res.json(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { content, messageType } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const msg = await storage.createMessage({
        userId,
        content,
        messageType: messageType || "text",
        isFromClient: true,
        isRead: true,
      });

      // Simulate auto-reply after a delay
      setTimeout(async () => {
        await storage.createMessage({
          userId,
          content: "Thank you for your message. Our team will review it and get back to you within 24 hours.",
          messageType: "text",
          isFromClient: false,
          isRead: false,
        });
      }, 2000);

      res.json(msg);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.post("/api/messages/mark-read", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      await storage.markMessagesAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Dependent routes
  app.get("/api/dependents", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const deps = await storage.getDependents(userId);
      res.json(deps);
    } catch (error) {
      console.error("Error fetching dependents:", error);
      res.status(500).json({ message: "Failed to fetch dependents" });
    }
  });

  app.post("/api/dependents", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { firstName, lastName, dateOfBirth, ssn, relationship, monthsLivedInHome } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      const dependent = await storage.createDependent({
        userId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        ssn: ssn || null,
        relationship: relationship || 'child',
        monthsLivedInHome: monthsLivedInHome || 12,
        taxYear: 2025,
      });
      res.status(201).json(dependent);
    } catch (error) {
      console.error("Error creating dependent:", error);
      res.status(500).json({ message: "Failed to create dependent" });
    }
  });

  app.patch("/api/dependents/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const depId = req.params.id;
      const updates = req.body;

      // Verify ownership
      const existing = await storage.getDependent(depId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Dependent not found" });
      }

      // Handle dateOfBirth conversion
      if (updates.dateOfBirth) {
        updates.dateOfBirth = new Date(updates.dateOfBirth);
      }

      const updated = await storage.updateDependent(depId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating dependent:", error);
      res.status(500).json({ message: "Failed to update dependent" });
    }
  });

  app.delete("/api/dependents/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const depId = req.params.id;

      // Verify ownership
      const existing = await storage.getDependent(depId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Dependent not found" });
      }

      await storage.deleteDependent(depId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dependent:", error);
      res.status(500).json({ message: "Failed to delete dependent" });
    }
  });

  // Questionnaire routes
  app.get("/api/questionnaire", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const responses = await storage.getQuestionnaireResponses(userId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching questionnaire:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire" });
    }
  });

  app.post("/api/questionnaire", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { answers } = req.body;

      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ message: "Answers are required" });
      }

      const savedResponses = [];
      for (const [questionId, answer] of Object.entries(answers)) {
        // Skip undefined/null answers to avoid database issues
        if (answer === undefined || answer === null) {
          console.log(`Skipping undefined/null answer for question: ${questionId}`);
          continue;
        }
        const response = await storage.upsertQuestionnaireResponse({
          userId,
          questionId,
          answer: answer as any,
          taxYear: 2025,
        });
        savedResponses.push(response);
      }

      // Auto-create businesses from questionnaire side_business_type answers FIRST
      // (so we can link required documents to business returns)
      const allResponses = await storage.getQuestionnaireResponses(userId);
      const sideBusinessResponse = allResponses.find(r => r.questionId === 'side_business_type');
      if (sideBusinessResponse && Array.isArray(sideBusinessResponse.answer)) {
        const businessNames = sideBusinessResponse.answer as string[];
        const existingBusinesses = await storage.getBusinesses(userId);
        const existingNames = existingBusinesses.map(b => b.name.toLowerCase());
        
        for (const businessName of businessNames) {
          if (businessName && !existingNames.includes(businessName.toLowerCase())) {
            // Create the business
            const business = await storage.createBusiness({
              userId,
              name: businessName,
              taxId: null,
              entityType: 'llc', // Default, user can update later
              address: null,
              taxYear: 2025,
            });
            
            // Also create a business return for this business (matching POST /api/businesses behavior)
            await storage.createReturn({
              userId,
              businessId: business.id,
              returnType: 'business',
              name: business.name,
              taxYear: 2025,
            });
          }
        }
      }

      // Get user's returns to link documents properly
      const userReturns = await storage.getReturns(userId);
      const personalReturn = userReturns.find(r => r.returnType === 'personal');
      const businessReturn = userReturns.find(r => r.returnType === 'business');
      
      // Generate required documents checklist based on questionnaire answers
      const responseData = allResponses.map(r => ({ questionId: r.questionId, answer: r.answer }));
      const requiredDocs = generateRequiredDocuments(responseData);
      await storage.regenerateRequiredDocuments(
        userId, 
        requiredDocs,
        personalReturn?.id || null,
        businessReturn?.id || null
      );

      res.json(savedResponses);
    } catch (error: any) {
      console.error("Error saving questionnaire:", error);
      console.error("Error details:", error?.message, error?.stack);
      res.status(500).json({ message: "Failed to save questionnaire", error: error?.message });
    }
  });

  // Invoice routes
  app.get("/api/invoices", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const invs = await storage.getInvoices(userId);
      res.json(invs);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id/items", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const items = await storage.getInvoiceItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
    }
  });

  app.post("/api/invoices/:id/pay", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.status === "paid") {
        return res.status(400).json({ message: "Invoice already paid" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      const items = await storage.getInvoiceItems(req.params.id);
      const lineItems = items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.description,
          },
          unit_amount: Math.round(Number(item.rate) * 100),
        },
        quantity: item.quantity || 1,
      }));

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/invoices?paid=${invoice.id}`,
        cancel_url: `${baseUrl}/invoices?cancelled=${invoice.id}`,
        metadata: {
          invoiceId: invoice.id,
          userId: userId,
        },
      });

      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error?.message || error);
      if (error?.stack) {
        console.error("Stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create payment session", error: error?.message });
    }
  });

  // Business routes
  app.get("/api/businesses", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const businessList = await storage.getBusinesses(userId);
      res.json(businessList);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.get("/api/businesses/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.post("/api/businesses", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.createBusiness({
        ...req.body,
        userId,
        taxYear: 2025,
      });

      // Also create a business return for this business
      await storage.createReturn({
        userId,
        businessId: business.id,
        returnType: 'business',
        name: business.name,
        taxYear: 2025,
      });

      res.status(201).json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.patch("/api/businesses/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const updated = await storage.updateBusiness(req.params.id, req.body);
      
      // Also update the return name if business name changed
      if (req.body.name) {
        const businessReturn = await storage.getReturnByBusiness(req.params.id);
        if (businessReturn) {
          await storage.updateReturn(businessReturn.id, { name: req.body.name });
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.delete("/api/businesses/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      await storage.deleteBusiness(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting business:", error);
      res.status(500).json({ message: "Failed to delete business" });
    }
  });

  // Business owners routes
  app.get("/api/businesses/:id/owners", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const owners = await storage.getBusinessOwners(req.params.id);
      res.json(owners);
    } catch (error) {
      console.error("Error fetching business owners:", error);
      res.status(500).json({ message: "Failed to fetch business owners" });
    }
  });

  app.post("/api/businesses/:id/owners", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const owner = await storage.createBusinessOwner({
        ...req.body,
        businessId: req.params.id,
      });
      res.status(201).json(owner);
    } catch (error) {
      console.error("Error creating business owner:", error);
      res.status(500).json({ message: "Failed to create business owner" });
    }
  });

  app.patch("/api/business-owners/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const owner = await storage.getBusinessOwner(req.params.id);
      if (!owner) {
        return res.status(404).json({ message: "Business owner not found" });
      }
      
      const business = await storage.getBusiness(owner.businessId);
      if (!business || business.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateBusinessOwner(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating business owner:", error);
      res.status(500).json({ message: "Failed to update business owner" });
    }
  });

  app.delete("/api/business-owners/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const owner = await storage.getBusinessOwner(req.params.id);
      if (!owner) {
        return res.status(404).json({ message: "Business owner not found" });
      }
      
      const business = await storage.getBusiness(owner.businessId);
      if (!business || business.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteBusinessOwner(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting business owner:", error);
      res.status(500).json({ message: "Failed to delete business owner" });
    }
  });

  // Business expenses routes
  app.get("/api/businesses/:id/expenses", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const expenses = await storage.getBusinessExpenses(req.params.id);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching business expenses:", error);
      res.status(500).json({ message: "Failed to fetch business expenses" });
    }
  });

  app.post("/api/businesses/:id/expenses", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const business = await storage.getBusiness(req.params.id);
      
      if (!business || business.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const expense = await storage.createBusinessExpense({
        ...req.body,
        businessId: req.params.id,
        taxYear: 2025,
      });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating business expense:", error);
      res.status(500).json({ message: "Failed to create business expense" });
    }
  });

  app.patch("/api/business-expenses/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const expense = await storage.getBusinessExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Business expense not found" });
      }
      
      const business = await storage.getBusiness(expense.businessId);
      if (!business || business.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateBusinessExpense(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating business expense:", error);
      res.status(500).json({ message: "Failed to update business expense" });
    }
  });

  app.delete("/api/business-expenses/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const expense = await storage.getBusinessExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Business expense not found" });
      }
      
      const business = await storage.getBusiness(expense.businessId);
      if (!business || business.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteBusinessExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting business expense:", error);
      res.status(500).json({ message: "Failed to delete business expense" });
    }
  });

  // Returns routes
  app.get("/api/returns", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      // Ensure user has a personal return
      await storage.ensurePersonalReturn(userId);
      const returnsList = await storage.getReturns(userId);
      res.json(returnsList);
    } catch (error) {
      console.error("Error fetching returns:", error);
      res.status(500).json({ message: "Failed to fetch returns" });
    }
  });

  app.get("/api/returns/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const ret = await storage.getReturn(req.params.id);
      
      if (!ret || ret.userId !== userId) {
        return res.status(404).json({ message: "Return not found" });
      }

      res.json(ret);
    } catch (error) {
      console.error("Error fetching return:", error);
      res.status(500).json({ message: "Failed to fetch return" });
    }
  });

  app.delete("/api/returns/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const ret = await storage.getReturn(req.params.id);
      
      if (!ret || ret.userId !== userId) {
        return res.status(404).json({ message: "Return not found" });
      }

      if (ret.returnType === "personal") {
        return res.status(400).json({ message: "Cannot delete personal return" });
      }

      await storage.deleteReturn(ret.id);
      res.json({ message: "Return removed" });
    } catch (error) {
      console.error("Error deleting return:", error);
      res.status(500).json({ message: "Failed to delete return" });
    }
  });

  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      req.dbUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Authentication error" });
    }
  };

  // Initialize admin user on startup
  (async () => {
    try {
      await storage.setUserAsAdmin("dylan@booknex.com");
      console.log("Admin user configured: dylan@booknex.com");
    } catch (error) {
      console.log("Note: Admin user will be set when they first log in");
    }
  })();

  // ============ ADMIN ROUTES ============

  // Get all clients (non-admin users)
  app.get("/api/admin/clients", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clients = await storage.getAllClients();
      
      // Get additional info for each client
      const clientsWithInfo = await Promise.all(
        clients.map(async (client) => {
          const docs = await storage.getDocuments(client.id);
          const messages = await storage.getMessages(client.id);
          const signatures = await storage.getSignatures(client.id);
          const invoices = await storage.getInvoices(client.id);
          const refund = await storage.getRefundTracking(client.id);
          const questionnaire = await storage.getQuestionnaireResponses(client.id);
          
          const unreadMessages = messages.filter(m => m.isFromClient && !m.isRead).length;
          const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
          
          return {
            ...client,
            stats: {
              documentsCount: docs.length,
              signaturesCount: signatures.length,
              unreadMessages,
              pendingInvoices,
              questionnaireProgress: questionnaire.length,
              refundStatus: refund?.federalStatus || 'not_filed',
              returnPrepStatus: (refund as any)?.returnPrepStatus || 'not_started',
            },
          };
        })
      );
      
      res.json(clientsWithInfo);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Get single client by ID (admin view)
  app.get("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Get stats for this client
      const docs = await storage.getDocuments(client.id);
      const messages = await storage.getMessages(client.id);
      const signatures = await storage.getSignatures(client.id);
      const invoices = await storage.getInvoices(client.id);
      const refund = await storage.getRefundTracking(client.id);
      
      const unreadMessages = messages.filter(m => m.isFromClient && !m.isRead).length;
      const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
      
      res.json({
        ...client,
        stats: {
          documentsCount: docs.length,
          signaturesCount: signatures.length,
          unreadMessages,
          pendingInvoices,
          refundStatus: refund?.federalStatus || 'not_filed',
          returnPrepStatus: (refund as any)?.returnPrepStatus || 'not_started',
        },
      });
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Update client info (admin)
  app.patch("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      const { firstName, lastName, email, phone } = req.body;
      
      const updates: any = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      
      const updated = await storage.updateUser(clientId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Create new client (admin only)
  app.post("/api/admin/clients", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser(email, passwordHash, firstName, lastName);
      
      if (phone) {
        await storage.updateUser(user.id, { phone });
      }
      
      await storage.seedUserData(user.id);
      
      res.json(user);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Impersonate client (admin only)
  app.post("/api/admin/clients/:id/impersonate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      const adminUserId = (req.session as any).userId;
      
      const client = await storage.getUser(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.isAdmin) {
        return res.status(400).json({ message: "Cannot impersonate another admin" });
      }
      
      // Store original admin ID for returning later
      (req.session as any).originalAdminId = adminUserId;
      (req.session as any).userId = clientId;
      (req.session as any).isImpersonating = true;
      
      res.json({ 
        message: "Now impersonating client",
        client: { id: client.id, email: client.email, firstName: client.firstName, lastName: client.lastName }
      });
    } catch (error) {
      console.error("Error impersonating client:", error);
      res.status(500).json({ message: "Failed to impersonate client" });
    }
  });

  // Archive client and their documents (admin only)
  app.post("/api/admin/clients/:id/archive", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      
      const client = await storage.getUser(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.isAdmin) {
        return res.status(400).json({ message: "Cannot archive an admin account" });
      }
      
      // Archive the client
      await storage.updateUser(clientId, { 
        isArchived: true, 
        archivedAt: new Date() 
      });
      
      // Archive all documents belonging to this client
      await storage.archiveUserDocuments(clientId, true);
      
      res.json({ message: "Client and their documents have been archived" });
    } catch (error) {
      console.error("Error archiving client:", error);
      res.status(500).json({ message: "Failed to archive client" });
    }
  });

  // Unarchive client and their documents (admin only)
  app.post("/api/admin/clients/:id/unarchive", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      
      const client = await storage.getUser(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Unarchive the client
      await storage.updateUser(clientId, { 
        isArchived: false, 
        archivedAt: null 
      });
      
      // Unarchive all documents belonging to this client
      await storage.archiveUserDocuments(clientId, false);
      
      res.json({ message: "Client and their documents have been restored" });
    } catch (error) {
      console.error("Error unarchiving client:", error);
      res.status(500).json({ message: "Failed to unarchive client" });
    }
  });

  // Delete archived client and all their data (admin only)
  app.delete("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      
      const client = await storage.getUser(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.isAdmin) {
        return res.status(400).json({ message: "Cannot delete an admin account" });
      }
      
      if (!client.isArchived) {
        return res.status(400).json({ message: "Client must be archived before deletion" });
      }
      
      await storage.deleteClient(clientId);
      
      res.json({ message: "Client and all their data have been permanently deleted" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Regenerate document checklists for all clients based on their questionnaire answers (admin only)
  app.post("/api/admin/regenerate-all-checklists", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allClients = await storage.getAllUsers();
      let updatedCount = 0;
      
      for (const client of allClients) {
        if (client.isAdmin) continue;
        
        const responses = await storage.getQuestionnaireResponses(client.id);
        if (responses.length === 0) continue;
        
        // Get client's returns to link documents properly
        const clientReturns = await storage.getReturns(client.id);
        const personalReturn = clientReturns.find(r => r.returnType === 'personal');
        const businessReturn = clientReturns.find(r => r.returnType === 'business');
        
        const responseData = responses.map(r => ({ questionId: r.questionId, answer: r.answer }));
        const requiredDocs = generateRequiredDocuments(responseData);
        await storage.regenerateRequiredDocuments(
          client.id, 
          requiredDocs,
          personalReturn?.id || null,
          businessReturn?.id || null
        );
        updatedCount++;
      }
      
      res.json({ message: `Updated document checklists for ${updatedCount} clients` });
    } catch (error) {
      console.error("Error regenerating checklists:", error);
      res.status(500).json({ message: "Failed to regenerate checklists" });
    }
  });

  // Sync businesses from questionnaire data for all clients (admin only)
  app.post("/api/admin/sync-businesses-from-questionnaire", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allClients = await storage.getAllUsers();
      let createdCount = 0;
      
      for (const client of allClients) {
        if (client.isAdmin) continue;
        
        const responses = await storage.getQuestionnaireResponses(client.id);
        const sideBusinessResponse = responses.find(r => r.questionId === 'side_business_type');
        
        if (sideBusinessResponse && Array.isArray(sideBusinessResponse.answer)) {
          const businessNames = sideBusinessResponse.answer as string[];
          const existingBusinesses = await storage.getBusinesses(client.id);
          const existingNames = existingBusinesses.map(b => b.name.toLowerCase());
          
          for (const businessName of businessNames) {
            if (businessName && !existingNames.includes(businessName.toLowerCase())) {
              const business = await storage.createBusiness({
                userId: client.id,
                name: businessName,
                taxId: null,
                entityType: 'llc',
                address: null,
                taxYear: 2025,
              });
              
              // Also create a business return for this business
              await storage.createReturn({
                userId: client.id,
                businessId: business.id,
                returnType: 'business',
                name: business.name,
                taxYear: 2025,
              });
              
              createdCount++;
            }
          }
        }
      }
      
      res.json({ message: `Created ${createdCount} businesses from questionnaire data` });
    } catch (error) {
      console.error("Error syncing businesses:", error);
      res.status(500).json({ message: "Failed to sync businesses" });
    }
  });

  // Return from impersonation (back to admin)
  app.post("/api/admin/return", isAuthenticated, async (req: any, res) => {
    try {
      const originalAdminId = (req.session as any).originalAdminId;
      const isImpersonating = (req.session as any).isImpersonating;
      
      if (!originalAdminId || !isImpersonating) {
        return res.status(400).json({ message: "Not currently impersonating" });
      }
      
      const admin = await storage.getUser(originalAdminId);
      if (!admin || !admin.isAdmin) {
        delete (req.session as any).originalAdminId;
        delete (req.session as any).isImpersonating;
        return res.status(403).json({ message: "Invalid impersonation session" });
      }
      
      // Restore admin session
      (req.session as any).userId = originalAdminId;
      delete (req.session as any).originalAdminId;
      delete (req.session as any).isImpersonating;
      
      res.json({ 
        message: "Returned to admin account",
        user: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, isAdmin: admin.isAdmin }
      });
    } catch (error) {
      console.error("Error returning from impersonation:", error);
      res.status(500).json({ message: "Failed to return to admin" });
    }
  });

  // Get impersonation status (safe - only reveals info if session has valid impersonation state)
  app.get("/api/admin/impersonation-status", isAuthenticated, async (req: any, res) => {
    try {
      const isImpersonating = !!(req.session as any).isImpersonating;
      const originalAdminId = (req.session as any).originalAdminId;
      
      if (isImpersonating && originalAdminId) {
        const admin = await storage.getUser(originalAdminId);
        if (admin?.isAdmin) {
          res.json({ 
            isImpersonating: true, 
            adminEmail: admin.email 
          });
        } else {
          delete (req.session as any).isImpersonating;
          delete (req.session as any).originalAdminId;
          res.json({ isImpersonating: false });
        }
      } else {
        res.json({ isImpersonating: false });
      }
    } catch (error) {
      console.error("Error checking impersonation status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  // Get client's documents (admin view)
  app.get("/api/admin/clients/:id/documents", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const docs = await storage.getDocuments(req.params.id);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get client's messages (admin view)
  app.get("/api/admin/clients/:id/messages", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching client messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Get client's signatures (admin view)
  app.get("/api/admin/clients/:id/signatures", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const signatures = await storage.getSignatures(req.params.id);
      res.json(signatures);
    } catch (error) {
      console.error("Error fetching client signatures:", error);
      res.status(500).json({ message: "Failed to fetch signatures" });
    }
  });

  // Get client's invoices (admin view)
  app.get("/api/admin/clients/:id/invoices", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.params.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching client invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get client's questionnaire responses (admin view)
  app.get("/api/admin/clients/:id/questionnaire", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const responses = await storage.getQuestionnaireResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching client questionnaire:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire" });
    }
  });

  // Get client's dependents (admin view)
  app.get("/api/admin/clients/:id/dependents", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const deps = await storage.getDependents(req.params.id);
      res.json(deps);
    } catch (error) {
      console.error("Error fetching client dependents:", error);
      res.status(500).json({ message: "Failed to fetch dependents" });
    }
  });

  // Get client's businesses with owners and expenses (admin view)
  app.get("/api/admin/clients/:id/businesses", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const businesses = await storage.getBusinesses(req.params.id);
      const businessesWithDetails = await Promise.all(
        businesses.map(async (business) => {
          const owners = await storage.getBusinessOwners(business.id);
          const expenses = await storage.getBusinessExpenses(business.id);
          return {
            ...business,
            owners,
            expenses,
          };
        })
      );
      res.json(businessesWithDetails);
    } catch (error) {
      console.error("Error fetching client businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  // Update business (admin)
  app.patch("/api/admin/businesses/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const businessId = req.params.id;
      const { name, entityType, taxId, address, industry, description } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (entityType !== undefined) updates.entityType = entityType;
      if (taxId !== undefined) updates.taxId = taxId;
      if (address !== undefined) updates.address = address;
      if (industry !== undefined) updates.industry = industry;
      if (description !== undefined) updates.description = description;
      
      const updatedBusiness = await storage.updateBusiness(businessId, updates);
      if (!updatedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(updatedBusiness);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  // Get client's returns (admin view)
  app.get("/api/admin/clients/:id/returns", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const returns = await storage.getReturns(req.params.id);
      res.json(returns);
    } catch (error) {
      console.error("Error fetching client returns:", error);
      res.status(500).json({ message: "Failed to fetch returns" });
    }
  });

  // Update return status (admin)
  app.patch("/api/admin/returns/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const returnId = req.params.id;
      const { status, federalStatus, federalAmount, stateStatus, stateAmount, stateName } = req.body;
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (federalStatus !== undefined) updates.federalStatus = federalStatus;
      if (federalAmount !== undefined) updates.federalAmount = federalAmount;
      if (stateStatus !== undefined) updates.stateStatus = stateStatus;
      if (stateAmount !== undefined) updates.stateAmount = stateAmount;
      if (stateName !== undefined) updates.stateName = stateName;
      
      const updatedReturn = await storage.updateReturn(returnId, updates);
      if (!updatedReturn) {
        return res.status(404).json({ message: "Return not found" });
      }
      res.json(updatedReturn);
    } catch (error) {
      console.error("Error updating return:", error);
      res.status(500).json({ message: "Failed to update return" });
    }
  });

  // Get all returns (admin view for Kanban)
  app.get("/api/admin/returns", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allReturns: any[] = [];
      
      for (const user of allUsers) {
        if (user.isArchived) continue;
        const userReturns = await storage.getReturns(user.id);
        for (const ret of userReturns) {
          allReturns.push({
            ...ret,
            clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            clientEmail: user.email,
          });
        }
      }
      
      res.json(allReturns);
    } catch (error) {
      console.error("Error fetching all returns:", error);
      res.status(500).json({ message: "Failed to fetch returns" });
    }
  });

  // Get all documents (admin view)
  app.get("/api/admin/documents", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const docs = await storage.getAllDocuments();
      
      // Join with user info
      const docsWithUser = await Promise.all(
        docs.map(async (doc) => {
          const user = await storage.getUser(doc.userId);
          return {
            ...doc,
            clientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
            clientEmail: user?.email,
            clientIsArchived: user?.isArchived || false,
          };
        })
      );
      
      res.json(docsWithUser);
    } catch (error) {
      console.error("Error fetching all documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Update document status (admin)
  app.patch("/api/admin/documents/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status, documentType } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (documentType) updates.documentType = documentType;
      
      const updated = await storage.updateDocument(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Get all messages (admin view)
  app.get("/api/admin/messages", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const msgs = await storage.getAllMessages();
      
      // Group by user
      const messagesByUser: Record<string, any> = {};
      for (const msg of msgs) {
        if (!messagesByUser[msg.userId]) {
          const user = await storage.getUser(msg.userId);
          messagesByUser[msg.userId] = {
            userId: msg.userId,
            clientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
            clientEmail: user?.email,
            clientIsArchived: user?.isArchived || false,
            messages: [],
            unreadCount: 0,
            lastMessage: null,
          };
        }
        messagesByUser[msg.userId].messages.push(msg);
        if (msg.isFromClient && !msg.isRead) {
          messagesByUser[msg.userId].unreadCount++;
        }
        if (!messagesByUser[msg.userId].lastMessage || 
            new Date(msg.createdAt!) > new Date(messagesByUser[msg.userId].lastMessage.createdAt)) {
          messagesByUser[msg.userId].lastMessage = msg;
        }
      }
      
      res.json(Object.values(messagesByUser));
    } catch (error) {
      console.error("Error fetching all messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Reply to a client's message (admin)
  app.post("/api/admin/messages/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const msg = await storage.replyToMessage(req.params.userId, content);
      res.json(msg);
    } catch (error) {
      console.error("Error sending reply:", error);
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  // Get all signatures (admin view)
  app.get("/api/admin/signatures", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const sigs = await storage.getAllSignatures();
      
      const sigsWithUser = await Promise.all(
        sigs.map(async (sig) => {
          const user = await storage.getUser(sig.userId);
          return {
            ...sig,
            clientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
            clientEmail: user?.email,
            clientIsArchived: user?.isArchived || false,
          };
        })
      );
      
      res.json(sigsWithUser);
    } catch (error) {
      console.error("Error fetching all signatures:", error);
      res.status(500).json({ message: "Failed to fetch signatures" });
    }
  });

  // Get all invoices (admin view)
  app.get("/api/admin/invoices", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const invs = await storage.getAllInvoices();
      
      const invsWithUser = await Promise.all(
        invs.map(async (inv) => {
          const user = await storage.getUser(inv.userId);
          const items = await storage.getInvoiceItems(inv.id);
          return {
            ...inv,
            clientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
            clientEmail: user?.email,
            clientIsArchived: user?.isArchived || false,
            items,
          };
        })
      );
      
      res.json(invsWithUser);
    } catch (error) {
      console.error("Error fetching all invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Create invoice for a client (admin)
  app.post("/api/admin/invoices", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId, items, dueDate, taxYear } = req.body;
      
      if (!userId || !items || items.length === 0) {
        return res.status(400).json({ message: "User ID and items are required" });
      }

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += Number(item.amount);
      }
      
      // Generate invoice number
      const allInvoices = await storage.getAllInvoices();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(allInvoices.length + 1).padStart(3, '0')}`;
      
      const invoice = await storage.createInvoice({
        userId,
        invoiceNumber,
        status: "sent",
        subtotal: subtotal.toFixed(2),
        tax: "0",
        total: subtotal.toFixed(2),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        taxYear: taxYear || 2025,
      });
      
      // Create invoice items
      for (const item of items) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity || 1,
          rate: item.rate,
          amount: item.amount,
        });
      }
      
      // Fetch complete invoice with items
      const completeInvoice = await storage.getInvoice(invoice.id);
      const invoiceItems = await storage.getInvoiceItems(invoice.id);
      
      res.json({ ...completeInvoice, items: invoiceItems });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Get all refund tracking (admin view)
  app.get("/api/admin/refunds", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const refunds = await storage.getAllRefundTracking();
      
      const refundsWithUser = await Promise.all(
        refunds.map(async (refund) => {
          const user = await storage.getUser(refund.userId);
          return {
            ...refund,
            clientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
            clientEmail: user?.email,
            clientIsArchived: user?.isArchived || false,
          };
        })
      );
      
      res.json(refundsWithUser);
    } catch (error) {
      console.error("Error fetching all refunds:", error);
      res.status(500).json({ message: "Failed to fetch refunds" });
    }
  });

  // Update refund status (admin)
  app.patch("/api/admin/refunds/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { returnPrepStatus, federalStatus, federalAmount, federalEstimatedDate, stateStatus, stateAmount, stateEstimatedDate } = req.body;
      
      const updated = await storage.upsertRefundTracking({
        userId: req.params.userId,
        returnPrepStatus,
        federalStatus,
        federalAmount,
        federalEstimatedDate: federalEstimatedDate ? new Date(federalEstimatedDate) : undefined,
        stateStatus,
        stateAmount,
        stateEstimatedDate: stateEstimatedDate ? new Date(stateEstimatedDate) : undefined,
        taxYear: 2025,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating refund status:", error);
      res.status(500).json({ message: "Failed to update refund status" });
    }
  });

  // Admin dashboard stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clients = await storage.getAllClients();
      const documents = await storage.getAllDocuments();
      const messages = await storage.getAllMessages();
      const invoices = await storage.getAllInvoices();
      const signatures = await storage.getAllSignatures();
      
      const unreadMessages = messages.filter(m => m.isFromClient && !m.isRead).length;
      const pendingDocuments = documents.filter(d => d.status === 'pending' || d.status === 'processing').length;
      const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
      const totalOutstanding = unpaidInvoices.reduce((sum, i) => sum + Number(i.total), 0);
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0);
      
      res.json({
        totalClients: clients.length,
        totalDocuments: documents.length,
        pendingDocuments,
        unreadMessages,
        totalInvoices: invoices.length,
        unpaidInvoices: unpaidInvoices.length,
        totalOutstanding,
        totalRevenue,
        totalSignatures: signatures.length,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // =====================================================
  // AFFILIATE PORTAL ROUTES
  // =====================================================

  // Generate unique referral code
  function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REF-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Affiliate authentication middleware
  const isAffiliateAuthenticated = (req: any, res: any, next: any) => {
    if ((req.session as any).affiliateId) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized - Affiliate login required" });
    }
  };

  // Resolve affiliate from session
  const resolveAffiliate = async (req: any, res: any, next: any) => {
    try {
      const affiliateId = (req.session as any).affiliateId;
      if (!affiliateId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const affiliate = await storage.getAffiliate(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate not found" });
      }
      
      req.affiliate = affiliate;
      next();
    } catch (error) {
      console.error("Error resolving affiliate:", error);
      res.status(500).json({ message: "Failed to resolve affiliate" });
    }
  };

  // Affiliate registration
  app.post("/api/affiliate/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, companyName, phone } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingAffiliate = await storage.getAffiliateByEmail(email);
      if (existingAffiliate) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      let referralCode = generateReferralCode();
      
      // Ensure referral code is unique
      while (await storage.getAffiliateByReferralCode(referralCode)) {
        referralCode = generateReferralCode();
      }

      const affiliate = await storage.createAffiliate({
        email,
        passwordHash,
        firstName,
        lastName,
        companyName,
        phone,
        referralCode,
        status: 'active',
      });
      
      (req.session as any).affiliateId = affiliate.id;
      
      res.json({ 
        id: affiliate.id, 
        email: affiliate.email, 
        firstName: affiliate.firstName, 
        lastName: affiliate.lastName,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
      });
    } catch (error) {
      console.error("Error registering affiliate:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Affiliate login
  app.post("/api/affiliate/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const affiliate = await storage.getAffiliateByEmail(email);
      if (!affiliate) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await verifyPassword(password, affiliate.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (affiliate.status !== 'active') {
        return res.status(403).json({ message: "Affiliate account is not active" });
      }

      (req.session as any).affiliateId = affiliate.id;
      
      res.json({ 
        id: affiliate.id, 
        email: affiliate.email, 
        firstName: affiliate.firstName, 
        lastName: affiliate.lastName,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
      });
    } catch (error) {
      console.error("Error logging in affiliate:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Affiliate logout
  app.post("/api/affiliate/auth/logout", (req: any, res) => {
    delete (req.session as any).affiliateId;
    res.json({ success: true });
  });

  // Get current affiliate
  app.get("/api/affiliate/auth/user", isAffiliateAuthenticated, resolveAffiliate, async (req: any, res) => {
    try {
      const affiliate = req.affiliate;
      res.json({
        id: affiliate.id,
        email: affiliate.email,
        firstName: affiliate.firstName,
        lastName: affiliate.lastName,
        companyName: affiliate.companyName,
        phone: affiliate.phone,
        referralCode: affiliate.referralCode,
        payoutRate: affiliate.payoutRate,
        status: affiliate.status,
        totalReferrals: affiliate.totalReferrals,
        totalConversions: affiliate.totalConversions,
        totalEarnings: affiliate.totalEarnings,
      });
    } catch (error) {
      console.error("Error fetching affiliate:", error);
      res.status(500).json({ message: "Failed to fetch affiliate" });
    }
  });

  // Get affiliate referrals
  app.get("/api/affiliate/referrals", isAffiliateAuthenticated, resolveAffiliate, async (req: any, res) => {
    try {
      const referrals = await storage.getAffiliateReferrals(req.affiliate.id);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // Get affiliate stats/dashboard data
  app.get("/api/affiliate/stats", isAffiliateAuthenticated, resolveAffiliate, async (req: any, res) => {
    try {
      const affiliate = req.affiliate;
      const referrals = await storage.getAffiliateReferrals(affiliate.id);
      
      const registered = referrals.filter(r => r.status === 'registered').length;
      const converted = referrals.filter(r => r.status === 'converted').length;
      const pendingCommissions = referrals
        .filter(r => r.commissionStatus === 'pending')
        .reduce((sum, r) => sum + Number(r.commissionAmount || 0), 0);
      const paidCommissions = referrals
        .filter(r => r.commissionStatus === 'paid')
        .reduce((sum, r) => sum + Number(r.commissionAmount || 0), 0);
      
      res.json({
        totalReferrals: referrals.length,
        registered,
        converted,
        conversionRate: referrals.length > 0 ? Math.round((converted / referrals.length) * 100) : 0,
        pendingCommissions,
        paidCommissions,
        totalEarnings: Number(affiliate.totalEarnings || 0),
        referralCode: affiliate.referralCode,
        payoutRate: affiliate.payoutRate,
      });
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get affiliate leaderboard (top performers) - privacy-focused
  app.get("/api/affiliate/leaderboard", isAffiliateAuthenticated, resolveAffiliate, async (req: any, res) => {
    try {
      const allAffiliates = await storage.getAllAffiliates();
      const currentAffiliateId = req.affiliate.id;
      
      // Sort by total referrals (conversions as tiebreaker)
      const ranked = allAffiliates
        .filter(a => a.status === 'active')
        .map(a => ({
          id: a.id,
          totalReferrals: a.totalReferrals || 0,
        }))
        .sort((a, b) => b.totalReferrals - a.totalReferrals);
      
      // Find current user's rank
      const currentRank = ranked.findIndex(a => a.id === currentAffiliateId) + 1;
      const currentUser = ranked.find(a => a.id === currentAffiliateId);
      
      // Only show anonymized position data (no names, just ranks and referral counts)
      // Top 5 entries shown with generic labels
      const leaderboard = ranked.slice(0, 5).map((a, idx) => ({
        rank: idx + 1,
        referrals: a.totalReferrals,
        isCurrentUser: a.id === currentAffiliateId,
      }));
      
      // Add current user's entry if not in top 5
      const isInTop5 = currentRank > 0 && currentRank <= 5;
      const currentUserEntry = currentUser ? {
        rank: currentRank,
        referrals: currentUser.totalReferrals,
        isCurrentUser: true,
      } : null;
      
      res.json({
        leaderboard,
        currentRank,
        currentUserEntry: isInTop5 ? null : currentUserEntry,
        totalAffiliates: ranked.length,
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // =====================================================
  // ADMIN KANBAN ROUTES
  // =====================================================

  // Get returns grouped by status for Kanban board (new returns-based approach)
  app.get("/api/admin/kanban", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { type } = req.query; // optional filter: 'all', 'personal', 'business'
      const allUsers = await storage.getAllUsers();
      const allReturns: any[] = [];
      
      for (const user of allUsers) {
        if (user.isArchived || user.isAdmin) continue;
        const userReturns = await storage.getReturns(user.id);
        for (const ret of userReturns) {
          // Apply type filter if specified
          if (type && type !== 'all' && ret.returnType !== type) continue;
          
          allReturns.push({
            id: ret.id,
            returnType: ret.returnType,
            name: ret.name,
            businessId: ret.businessId,
            status: ret.status || 'not_started',
            taxYear: ret.taxYear,
            clientId: user.id,
            clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            clientEmail: user.email,
            createdAt: ret.createdAt,
          });
        }
      }
      
      // Group by status
      const statuses = [
        'not_started', 'documents_gathering', 'information_review', 
        'return_preparation', 'quality_review', 'client_review', 
        'signature_required', 'filing', 'filed'
      ];
      
      const columns: Record<string, any[]> = {};
      statuses.forEach(status => {
        columns[status] = allReturns.filter(r => r.status === status);
      });
      
      res.json({ columns, statuses });
    } catch (error) {
      console.error("Error fetching kanban data:", error);
      res.status(500).json({ message: "Failed to fetch kanban data" });
    }
  });

  // Update return status via drag and drop (now updates individual return)
  app.patch("/api/admin/kanban/:returnId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { returnId } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updated = await storage.updateReturn(returnId, { status });
      if (!updated) {
        return res.status(404).json({ message: "Return not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating kanban status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // =====================================================
  // PRODUCT ROUTES
  // =====================================================

  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const allProducts = await storage.getProducts();
      const activeProducts = allProducts.filter(p => p.isActive);
      const productsWithStages = await Promise.all(
        activeProducts.map(async (product) => {
          const stages = await storage.getProductStages(product.id);
          const documentRequirements = await storage.getProductDocumentRequirements(product.id);
          return { ...product, stages, documentRequirements };
        })
      );
      res.json(productsWithStages);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/client-products", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const cps = await storage.getClientProducts(userId);
      const enriched = await Promise.all(
        cps.map(async (cp) => {
          const product = await storage.getProduct(cp.productId);
          const stages = await storage.getProductStages(cp.productId);
          const documentRequirements = await storage.getProductDocumentRequirements(cp.productId);
          const currentStage = cp.currentStageId ? stages.find(s => s.id === cp.currentStageId) || null : null;
          const productWithStages = product ? { ...product, stages, documentRequirements } : null;
          return { ...cp, product: productWithStages, currentStage };
        })
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching client products:", error);
      res.status(500).json({ message: "Failed to fetch client products" });
    }
  });

  app.post("/api/client-products", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { productId, name } = req.body;
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }
      const product = await storage.getProduct(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Product not found" });
      }
      const stages = await storage.getProductStages(productId);
      const firstStage = stages.length > 0 ? stages[0] : null;
      const cp = await storage.createClientProduct({
        userId,
        productId,
        currentStageId: firstStage?.id || null,
        name: name || product.name,
      });
      res.json(cp);
    } catch (error) {
      console.error("Error creating client product:", error);
      res.status(500).json({ message: "Failed to add product" });
    }
  });

  app.delete("/api/client-products/:id", isAuthenticated, resolveDbUser, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { id } = req.params;
      const userCps = await storage.getClientProducts(userId);
      const cp = userCps.find(c => c.id === id);
      if (!cp) {
        return res.status(404).json({ message: "Service not found" });
      }
      await storage.deleteClientProduct(id);
      res.json({ message: "Service cancelled" });
    } catch (error) {
      console.error("Error deleting client product:", error);
      res.status(500).json({ message: "Failed to cancel service" });
    }
  });

  // =====================================================
  // ADMIN PRODUCT ROUTES
  // =====================================================

  app.get("/api/admin/products", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allProducts = await storage.getProducts();
      const productsWithStages = await Promise.all(
        allProducts.map(async (product) => {
          const stages = await storage.getProductStages(product.id);
          const documentRequirements = await storage.getProductDocumentRequirements(product.id);
          return { ...product, stages, documentRequirements };
        })
      );
      res.json(productsWithStages);
    } catch (error) {
      console.error("Error fetching admin products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { name, description, icon, displayLocation, isActive, sortOrder, stages, documentRequirements } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Product name is required" });
      }
      const product = await storage.createProduct({
        name,
        description: description || null,
        icon: icon || 'Package',
        displayLocation: displayLocation || 'sidebar',
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      });
      if (stages && Array.isArray(stages)) {
        for (let i = 0; i < stages.length; i++) {
          await storage.createProductStage({
            productId: product.id,
            name: stages[i].name,
            slug: stages[i].slug || stages[i].name.toLowerCase().replace(/\s+/g, '_'),
            color: stages[i].color || '#6b7280',
            sortOrder: i,
            showUploadButton: stages[i].showUploadButton || false,
          });
        }
      }
      if (documentRequirements && Array.isArray(documentRequirements)) {
        for (let i = 0; i < documentRequirements.length; i++) {
          await storage.createProductDocumentRequirement({
            productId: product.id,
            name: documentRequirements[i].name,
            description: documentRequirements[i].description || null,
            isRequired: documentRequirements[i].isRequired !== false,
            sortOrder: i,
          });
        }
      }
      const productStagesResult = await storage.getProductStages(product.id);
      const docReqs = await storage.getProductDocumentRequirements(product.id);
      res.json({ ...product, stages: productStagesResult, documentRequirements: docReqs });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/admin/products/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, displayLocation, isActive, sortOrder, stages, documentRequirements } = req.body;
      const updated = await storage.updateProduct(id, {
        name,
        description,
        icon,
        displayLocation,
        isActive,
        sortOrder,
      });
      if (!updated) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (stages && Array.isArray(stages)) {
        await storage.deleteProductStages(id);
        for (let i = 0; i < stages.length; i++) {
          await storage.createProductStage({
            productId: id,
            name: stages[i].name,
            slug: stages[i].slug || stages[i].name.toLowerCase().replace(/\s+/g, '_'),
            color: stages[i].color || '#6b7280',
            sortOrder: i,
            showUploadButton: stages[i].showUploadButton || false,
          });
        }
      }
      if (documentRequirements && Array.isArray(documentRequirements)) {
        await storage.deleteProductDocumentRequirements(id);
        for (let i = 0; i < documentRequirements.length; i++) {
          await storage.createProductDocumentRequirement({
            productId: id,
            name: documentRequirements[i].name,
            description: documentRequirements[i].description || null,
            isRequired: documentRequirements[i].isRequired !== false,
            sortOrder: i,
          });
        }
      }
      const productStagesResult = await storage.getProductStages(id);
      const docReqs = await storage.getProductDocumentRequirements(id);
      res.json({ ...updated, stages: productStagesResult, documentRequirements: docReqs });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin: Get all client products for Kanban
  app.get("/api/admin/client-products", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { productId } = req.query;
      const allCps = await storage.getAllClientProducts();
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      let filtered = allCps;
      if (productId) {
        filtered = allCps.filter(cp => cp.productId === productId);
      }

      const enriched = await Promise.all(
        filtered.map(async (cp) => {
          const product = await storage.getProduct(cp.productId);
          const stages = product ? await storage.getProductStages(product.id) : [];
          const currentStage = stages.find(s => s.id === cp.currentStageId);
          const user = userMap.get(cp.userId);
          return {
            ...cp,
            product,
            currentStage,
            clientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
            clientEmail: user?.email || '',
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching admin client products:", error);
      res.status(500).json({ message: "Failed to fetch client products" });
    }
  });

  // Admin: Update client product stage (for Kanban drag-and-drop)
  app.patch("/api/admin/client-products/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { currentStageId } = req.body;
      const updated = await storage.updateClientProduct(id, { currentStageId });
      if (!updated) {
        return res.status(404).json({ message: "Client product not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating client product:", error);
      res.status(500).json({ message: "Failed to update client product" });
    }
  });

  return server;
}

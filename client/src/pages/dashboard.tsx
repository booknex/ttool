import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText,
  MessageSquare,
  DollarSign,
  ClipboardList,
  PenTool,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  ListChecks,
} from "lucide-react";
import type { Document, Message, RefundTracking, Invoice, Signature, RequiredDocument, QuestionnaireResponse } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return user && !(user as any).hasSeenOnboarding;
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: refund, isLoading: refundLoading } = useQuery<RefundTracking>({
    queryKey: ["/api/refund"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: signatures, isLoading: sigsLoading } = useQuery<Signature[]>({
    queryKey: ["/api/signatures"],
  });

  const { data: requiredDocs, isLoading: reqDocsLoading } = useQuery<RequiredDocument[]>({
    queryKey: ["/api/required-documents"],
  });

  const { data: questionnaireResponses, isLoading: questionnaireLoading } = useQuery<QuestionnaireResponse[]>({
    queryKey: ["/api/questionnaire"],
  });

  const unreadMessages = messages?.filter((m) => !m.isRead && !m.isFromClient).length || 0;
  const uploadedDocs = documents?.length || 0;
  const requiredDocsCount = 6;
  const uploadedReqDocs = requiredDocs?.filter((d) => d.isUploaded).length || 0;
  const docProgress = requiredDocsCount > 0 ? Math.round((uploadedReqDocs / requiredDocsCount) * 100) : 0;

  const pendingSignatures = ["engagement_letter", "form_8879"].filter(
    (type) => !signatures?.some((s) => s.documentType === type)
  );

  const unpaidInvoices = invoices?.filter((i) => i.status === "sent" || i.status === "overdue") || [];

  const getRefundStatusColor = (status: string | undefined) => {
    switch (status) {
      case "completed":
      case "refund_sent":
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "processing":
      case "accepted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "submitted":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatStatus = (status: string | undefined) => {
    if (!status) return "Not Filed";
    return status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <OnboardingModal 
        open={showOnboarding || false} 
        onComplete={() => setShowOnboarding(false)} 
      />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Welcome Back
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your tax filing status for 2024.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                {docsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-doc-count">{uploadedDocs}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
                {msgsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-unread-count">{unreadMessages}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending Signatures</p>
                {sigsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-sig-count">{pendingSignatures.length}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Invoices</p>
                {invoicesLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-invoice-count">{unpaidInvoices.length}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg">Document Checklist</CardTitle>
              <CardDescription>Track your required documents</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/documents" data-testid="link-view-documents">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {reqDocsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span>{uploadedReqDocs} of {requiredDocsCount} required documents</span>
                  <span className="font-medium">{docProgress}%</span>
                </div>
                <Progress value={docProgress} className="h-2" />
                <div className="space-y-2 mt-4">
                  {requiredDocs?.slice(0, 4).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {doc.isUploaded ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        )}
                        <span className="text-sm font-medium">
                          {doc.documentType?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                      {!doc.isUploaded && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link href="/documents">
                            <Upload className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(() => {
          const returnPrepStatus = (refund as any)?.returnPrepStatus as string | null;
          const isFiled = returnPrepStatus === "filed";

          if (isFiled) {
            // Show Refund Status card after return is filed
            return (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                  <div>
                    <CardTitle className="text-lg">Refund Status</CardTitle>
                    <CardDescription>Track your refund progress</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/refund" data-testid="link-view-refund">
                      Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {refundLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : refund ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-sm font-medium">Federal Refund</span>
                          <Badge className={getRefundStatusColor(refund.federalStatus || undefined)}>
                            {formatStatus(refund.federalStatus || undefined)}
                          </Badge>
                        </div>
                        {refund.federalAmount && (
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-federal-amount">
                            ${Number(refund.federalAmount).toLocaleString()}
                          </p>
                        )}
                        {refund.federalEstimatedDate && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            Est. {new Date(refund.federalEstimatedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-sm font-medium">
                            State Refund {refund.stateName && `(${refund.stateName})`}
                          </span>
                          <Badge className={getRefundStatusColor(refund.stateStatus || undefined)}>
                            {formatStatus(refund.stateStatus || undefined)}
                          </Badge>
                        </div>
                        {refund.stateAmount && (
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-state-amount">
                            ${Number(refund.stateAmount).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No refund information available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          } else {
            // Show Return Status card before return is filed
            const STAGE_LABELS: Record<string, string> = {
              not_started: "Getting Started",
              documents_gathering: "Document Collection",
              information_review: "Information Review",
              return_preparation: "Return Preparation",
              quality_review: "Quality Review",
              client_review: "Client Review",
              signature_required: "Signature Required",
              filing: "E-Filing",
              filed: "Filed",
            };
            const STAGE_ORDER = [
              "not_started", "documents_gathering", "information_review",
              "return_preparation", "quality_review", "client_review",
              "signature_required", "filing", "filed"
            ];
            const currentStage = returnPrepStatus || "not_started";
            const currentIndex = STAGE_ORDER.indexOf(currentStage);
            const progressPercent = Math.round(((currentIndex + 1) / STAGE_ORDER.length) * 100);

            return (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                  <div>
                    <CardTitle className="text-lg">Return Status</CardTitle>
                    <CardDescription>Track your tax return preparation</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/" data-testid="link-view-return-status">
                      Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {refundLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <span className="text-sm font-medium">Current Stage</span>
                          <Badge className="bg-primary/10 text-primary">
                            {STAGE_LABELS[currentStage] || "Not Started"}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ListChecks className="w-4 h-4" />
                        <span>Step {currentIndex + 1} of {STAGE_ORDER.length}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-lg">Recent Messages</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/messages" data-testid="link-view-messages">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {msgsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages.slice(0, 3).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${msg.isFromClient ? "bg-muted/50" : "bg-primary/5"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {msg.isFromClient ? "You" : "Tax Preparer"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-lg">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSignatures.length > 0 ? (
                pendingSignatures.map((sig) => (
                  <div
                    key={sig}
                    className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-3">
                      <PenTool className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Sign {sig === "engagement_letter" ? "Engagement Letter" : "Form 8879"}
                        </p>
                        <p className="text-xs text-muted-foreground">Signature required</p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href="/signatures">Sign</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All caught up!</p>
                </div>
              )}
              {unpaidInvoices.length > 0 && unpaidInvoices.slice(0, 1).map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Invoice #{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(inv.total).toLocaleString()} due
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href="/invoices">Pay</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-lg">Questionnaire</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/questionnaire" data-testid="link-view-questionnaire">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {questionnaireLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              (() => {
                const answers: Record<string, any> = {};
                questionnaireResponses?.forEach((r) => {
                  answers[r.questionId] = r.answer;
                });

                const allQuestions = [
                  { id: "filing_status", dependsOn: null },
                  { id: "marital_change", dependsOn: null },
                  { id: "employment_type", dependsOn: null },
                  { id: "side_business", dependsOn: null },
                  { id: "side_business_type", dependsOn: { questionId: "side_business", answer: true } },
                  { id: "crypto_transactions", dependsOn: null },
                  { id: "homeowner", dependsOn: null },
                  { id: "mortgage_interest", dependsOn: { questionId: "homeowner", answer: true } },
                  { id: "property_taxes", dependsOn: { questionId: "homeowner", answer: true } },
                  { id: "charitable_donations", dependsOn: null },
                  { id: "charitable_amount", dependsOn: { questionId: "charitable_donations", answer: true } },
                  { id: "medical_expenses", dependsOn: null },
                  { id: "student_loans", dependsOn: null },
                  { id: "education_expenses", dependsOn: null },
                  { id: "529_contributions", dependsOn: null },
                  { id: "dependents", dependsOn: null },
                  { id: "dependent_count", dependsOn: { questionId: "dependents", answer: true } },
                  { id: "childcare_expenses", dependsOn: { questionId: "dependents", answer: true } },
                  { id: "major_life_events", dependsOn: null },
                  { id: "home_office", dependsOn: null },
                  { id: "vehicle_business_use", dependsOn: null },
                ];

                const visibleQuestions = allQuestions.filter((q) => {
                  if (!q.dependsOn) return true;
                  return answers[q.dependsOn.questionId] === q.dependsOn.answer;
                });

                const totalQuestions = visibleQuestions.length;
                const answeredCount = visibleQuestions.filter((q) => answers[q.id] !== undefined).length;
                const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
                const isComplete = answeredCount === totalQuestions && totalQuestions > 0;
                const hasStarted = answeredCount > 0;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span>{answeredCount} of {totalQuestions} questions</span>
                      <span className="font-medium">{Math.min(progress, 100)}%</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="text-center pt-2">
                      {isComplete ? (
                        <>
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Questionnaire complete!
                          </p>
                          <Button variant="outline" asChild>
                            <Link href="/questionnaire">Review Answers</Link>
                          </Button>
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-primary opacity-70" />
                          <p className="text-sm text-muted-foreground mb-3">
                            {hasStarted 
                              ? "Continue where you left off" 
                              : "Help us maximize your deductions"}
                          </p>
                          <Button asChild>
                            <Link href="/questionnaire">
                              {hasStarted ? "Continue Questionnaire" : "Start Questionnaire"}
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

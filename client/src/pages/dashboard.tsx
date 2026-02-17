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
  PenTool,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  CircleDot,
  Building2,
} from "lucide-react";
import type { Document, Message, RefundTracking, Invoice, Signature, RequiredDocument, Return, Business } from "@shared/schema";

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

  const { data: returns = [] } = useQuery<Return[]>({
    queryKey: ["/api/returns"],
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
  });

  const unreadMessages = messages?.filter((m) => !m.isRead && !m.isFromClient).length || 0;
  const uploadedDocs = documents?.length || 0;
  const requiredDocsCount = requiredDocs?.length || 0;
  const uploadedOrNADocs = requiredDocs?.filter((d) => d.isUploaded || d.markedNotApplicable).length || 0;
  const docProgress = requiredDocsCount > 0 ? Math.round((uploadedOrNADocs / requiredDocsCount) * 100) : 0;

  const pendingSignatures = ["engagement_letter", "form_8879"].filter(
    (type) => !signatures?.some((s) => s.documentType === type)
  );

  const unpaidInvoices = invoices?.filter((i) => i.status === "sent" || i.status === "overdue") || [];

  const returnPrepStatus = (refund as any)?.returnPrepStatus as string | null;
  const isFiled = returnPrepStatus === "filed";

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

  const STAGE_DESCRIPTIONS: Record<string, string> = {
    not_started: "We're setting up your account and preparing your document checklist.",
    documents_gathering: "Please upload your tax documents. We need these to prepare your return.",
    information_review: "We're reviewing your documents and information for accuracy.",
    return_preparation: "Your tax professional is preparing your return.",
    quality_review: "Your return is being reviewed for accuracy and optimization.",
    client_review: "Please review your return and let us know if you have any questions.",
    signature_required: "Your return is ready! Please sign the required documents.",
    filing: "We're electronically filing your return with the IRS and state.",
    filed: "Congratulations! Your return has been filed successfully.",
  };

  const currentStage = returnPrepStatus || "not_started";

  // Determine the next action for the user
  const getNextAction = () => {
    // Priority 1: Unpaid invoices
    if (unpaidInvoices.length > 0) {
      return {
        type: "invoice",
        title: "Pay Your Invoice",
        description: `You have an invoice of $${Number(unpaidInvoices[0].total).toLocaleString()} due.`,
        action: "Pay Now",
        link: "/invoices",
        icon: Receipt,
        color: "blue",
      };
    }

    // Priority 2: Pending signatures
    if (pendingSignatures.length > 0) {
      const sigType = pendingSignatures[0] === "engagement_letter" ? "Engagement Letter" : "Form 8879";
      return {
        type: "signature",
        title: `Sign Your ${sigType}`,
        description: `Please sign the ${sigType} to continue with your tax preparation.`,
        action: "Sign Now",
        link: "/signatures",
        icon: PenTool,
        color: "amber",
      };
    }

    // Priority 3: Upload documents
    const missingDocs = requiredDocs?.filter((d) => !d.isUploaded && !d.markedNotApplicable) || [];
    if (missingDocs.length > 0) {
      return {
        type: "documents",
        title: "Upload Your Documents",
        description: `You have ${missingDocs.length} document${missingDocs.length > 1 ? 's' : ''} remaining to upload.`,
        action: "Upload Documents",
        link: "/documents",
        icon: Upload,
        color: "purple",
      };
    }

    // Priority 4: Unread messages
    if (unreadMessages > 0) {
      return {
        type: "messages",
        title: "New Message from Your Tax Preparer",
        description: `You have ${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}.`,
        action: "View Messages",
        link: "/messages",
        icon: MessageSquare,
        color: "green",
      };
    }

    // All caught up
    return null;
  };

  const nextAction = getNextAction();

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; border: string }> = {
      blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
      amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-200" },
      purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-200" },
      green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    };
    return colors[color] || colors.blue;
  };

  const getRefundStatusColor = (status: string | undefined) => {
    switch (status) {
      case "completed":
      case "refund_sent":
      case "approved":
        return "bg-green-100 text-green-800";
      case "processing":
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "submitted":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatStatus = (status: string | undefined) => {
    if (!status) return "Not Filed";
    return status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const firstName = user?.firstName || "there";

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <OnboardingModal 
        open={showOnboarding || false} 
        onComplete={() => setShowOnboarding(false)} 
      />

      {/* Personalized Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Hi {firstName}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          Here's what's happening with your 2025 tax return.
        </p>
      </div>

      {/* Current Status Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {isFiled ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Sparkles className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">Current Stage:</span>
                  <Badge variant="secondary" className="font-medium">
                    {STAGE_LABELS[currentStage]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {STAGE_DESCRIPTIONS[currentStage]}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href="/return-status/personal">
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Action Card */}
      {nextAction ? (
        <Card className={`${getColorClasses(nextAction.color).bg} border-2 ${getColorClasses(nextAction.color).border}`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                  <nextAction.icon className={`w-6 h-6 ${getColorClasses(nextAction.color).icon}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Your Next Step: {nextAction.title}</h3>
                  <p className="text-muted-foreground">{nextAction.description}</p>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <Link href={nextAction.link}>
                  {nextAction.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">You're All Caught Up!</h3>
                <p className="text-muted-foreground">
                  {isFiled 
                    ? "Your return has been filed. Check back for refund updates."
                    : "No actions needed right now. We'll notify you when there's something to do."
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Progress */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Document Progress
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reqDocsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{uploadedOrNADocs} of {requiredDocsCount} items complete</span>
                  <span className="font-semibold text-lg">{docProgress}%</span>
                </div>
                <Progress value={docProgress} className="h-3" />
                {docProgress < 100 && (
                  <p className="text-sm text-muted-foreground">
                    {requiredDocsCount - uploadedOrNADocs} document{requiredDocsCount - uploadedOrNADocs !== 1 ? 's' : ''} still needed
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Returns Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-purple-600" />
                Your Returns
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/return-status/personal">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {returns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No returns set up yet.</p>
              ) : (
                returns.slice(0, 3).map((ret) => (
                  <div key={ret.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {ret.returnType === 'personal' ? (
                        <FileText className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Building2 className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="text-sm font-medium">
                        {ret.returnType === 'personal' ? 'Personal Return' : ret.name || 'Business Return'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {STAGE_LABELS[ret.status || 'not_started'] || 'Not Started'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Status (only if filed) */}
      {isFiled && refund && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Refund Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Federal Refund</span>
                  <Badge className={getRefundStatusColor(refund.federalStatus || undefined)}>
                    {formatStatus(refund.federalStatus || undefined)}
                  </Badge>
                </div>
                {refund.federalAmount && (
                  <p className="text-2xl font-bold text-green-600">
                    ${Number(refund.federalAmount).toLocaleString()}
                  </p>
                )}
                {refund.federalEstimatedDate && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Est. {new Date(refund.federalEstimatedDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    State Refund {refund.stateName && `(${refund.stateName})`}
                  </span>
                  <Badge className={getRefundStatusColor(refund.stateStatus || undefined)}>
                    {formatStatus(refund.stateStatus || undefined)}
                  </Badge>
                </div>
                {refund.stateAmount && (
                  <p className="text-2xl font-bold text-green-600">
                    ${Number(refund.stateAmount).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{docsLoading ? "..." : uploadedDocs}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{msgsLoading ? "..." : unreadMessages}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <PenTool className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sigsLoading ? "..." : pendingSignatures.length}</p>
              <p className="text-xs text-muted-foreground">To Sign</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{businesses.length}</p>
              <p className="text-xs text-muted-foreground">Businesses</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Messages */}
      {messages && messages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Recent Messages
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/messages">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messages.slice(0, 3).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${msg.isFromClient ? "bg-muted/50" : "bg-primary/5"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
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
          </CardContent>
        </Card>
      )}

      {/* Contact Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                Your tax preparer is here to help with any questions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/messages">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link, useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  ClipboardCheck,
  Search,
  Calculator,
  PenTool,
  Send,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  FileCheck,
  Sparkles,
  Building2,
  User,
  XCircle,
} from "lucide-react";
import type { Document, Signature, RequiredDocument, QuestionnaireResponse, RefundTracking } from "@shared/schema";

interface Return {
  id: string;
  userId: string;
  businessId: string | null;
  returnType: "personal" | "business";
  name: string;
  status: string | null;
  taxYear: number | null;
  federalStatus: string | null;
  federalAmount: string | null;
  stateStatus: string | null;
  stateAmount: string | null;
  stateName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const RETURN_PREP_STAGES = [
  "not_started",
  "documents_gathering", 
  "information_review",
  "return_preparation",
  "quality_review",
  "client_review",
  "signature_required",
  "filing",
  "filed",
] as const;

const STAGE_CONFIG: Record<string, { title: string; description: string; icon: any }> = {
  not_started: { title: "Getting Started", description: "Begin your tax preparation journey", icon: FileText },
  documents_gathering: { title: "Document Collection", description: "Upload all required tax documents", icon: FileText },
  information_review: { title: "Information Review", description: "Your preparer is reviewing your information", icon: Search },
  return_preparation: { title: "Return Preparation", description: "Your tax return is being prepared", icon: Calculator },
  quality_review: { title: "Quality Review", description: "Your return is undergoing quality review", icon: ClipboardCheck },
  client_review: { title: "Client Review", description: "Review your prepared return", icon: FileCheck },
  signature_required: { title: "Signature Required", description: "Sign Form 8879 to authorize e-filing", icon: PenTool },
  filing: { title: "E-Filing", description: "Your return is being electronically filed", icon: Send },
  filed: { title: "Filed", description: "Your tax return has been successfully filed", icon: CheckCircle2 },
};

type PrepStage = {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "completed" | "current" | "pending";
  action?: { label: string; href: string };
};

export default function ReturnStatus() {
  const { toast } = useToast();
  const [, params] = useRoute("/return-status/:returnId");
  const returnId = params?.returnId;
  const isPersonal = returnId === "personal";
  const [, navigate] = useLocation();

  const { data: returns = [], isLoading: returnsLoading } = useQuery<Return[]>({
    queryKey: ["/api/returns"],
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: requiredDocs, isLoading: reqDocsLoading } = useQuery<RequiredDocument[]>({
    queryKey: ["/api/required-documents"],
  });

  const { data: signatures, isLoading: sigsLoading } = useQuery<Signature[]>({
    queryKey: ["/api/signatures"],
  });

  const { data: questionnaireResponses, isLoading: questLoading } = useQuery<QuestionnaireResponse[]>({
    queryKey: ["/api/questionnaire"],
  });

  const { data: refund, isLoading: refundLoading } = useQuery<RefundTracking>({
    queryKey: ["/api/refund"],
  });

  const selectedReturn = isPersonal
    ? returns.find(r => r.returnType === "personal")
    : returns.find(r => r.id === returnId);

  const advanceStatusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/refund/advance-status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/refund"] });
      toast({
        title: "Status Updated",
        description: "Your signature has been confirmed and your return is now being filed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to advance status. Please make sure you've signed Form 8879.",
        variant: "destructive",
      });
    },
  });

  const handleCancelReturn = async () => {
    if (!selectedReturn || isPersonal) return;
    try {
      await apiRequest("DELETE", `/api/returns/${selectedReturn.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      toast({ title: "Business return removed" });
      navigate("/");
    } catch {
      toast({ title: "Failed to remove return", variant: "destructive" });
    }
  };

  const isLoading = docsLoading || reqDocsLoading || sigsLoading || questLoading || refundLoading || returnsLoading;

  const uploadedReqDocs = requiredDocs?.filter((d) => d.isUploaded).length || 0;
  const totalReqDocs = requiredDocs?.length || 0;
  const docsComplete = totalReqDocs > 0 && uploadedReqDocs >= totalReqDocs;

  const answers: Record<string, any> = {};
  questionnaireResponses?.forEach((r) => {
    answers[r.questionId] = r.answer;
  });

  const baseQuestions = [
    "filing_status", "marital_change", "employment_type", "side_business",
    "crypto_transactions", "homeowner", "charitable_donations", "medical_expenses",
    "student_loans", "education_expenses", "529_contributions", "dependents",
    "major_life_events", "home_office", "vehicle_business_use"
  ];
  const questionnaireComplete = baseQuestions.every((q) => answers[q] !== undefined);

  const hasEngagementLetter = signatures?.some((s) => s.documentType === "engagement_letter");
  const hasForm8879 = signatures?.some((s) => s.documentType === "form_8879");

  const isFiled = refund?.federalStatus === "submitted" || 
                  refund?.federalStatus === "accepted" || 
                  refund?.federalStatus === "approved" ||
                  refund?.federalStatus === "refund_sent";

  const getStages = (): PrepStage[] => {
    const returnStatus = selectedReturn?.status as string | null;
    const currentStageIndex = returnStatus ? RETURN_PREP_STAGES.indexOf(returnStatus as any) : -1;

    const stages: PrepStage[] = RETURN_PREP_STAGES.map((stageId, index) => {
      const config = STAGE_CONFIG[stageId];
      let status: "completed" | "current" | "pending" = "pending";
      
      if (currentStageIndex >= 0) {
        if (index < currentStageIndex) {
          status = "completed";
        } else if (index === currentStageIndex) {
          status = "current";
        } else {
          status = "pending";
        }
      } else {
        const stage1Complete = docsComplete && (documents?.length || 0) > 0;
        const stage2Complete = questionnaireComplete;
        const stage3Complete = hasEngagementLetter === true;
        const stage4Complete = stage1Complete && stage2Complete && stage3Complete;
        const stage5Complete = hasForm8879 === true;
        const stage6Complete = isFiled;
        const stage7Complete = refund?.federalStatus === "accepted" || 
                               refund?.federalStatus === "approved" || 
                               refund?.federalStatus === "refund_sent";
        const stage8Complete = stage7Complete;
        const stage9Complete = stage7Complete;
        
        const completionStatus = [
          false,
          stage1Complete,
          stage2Complete && stage1Complete,
          stage3Complete && stage2Complete && stage1Complete,
          stage4Complete,
          stage5Complete && stage4Complete,
          stage5Complete && stage4Complete,
          stage6Complete,
          stage7Complete,
        ];
        
        const firstIncomplete = completionStatus.findIndex((c, i) => i > 0 && !c);
        if (index === 0 && firstIncomplete <= 1) {
          status = "current";
        } else if (completionStatus[index]) {
          status = "completed";
        } else if (index === firstIncomplete) {
          status = "current";
        }
      }

      let action: { label: string; href: string } | undefined;
      if (status === "current") {
        switch (stageId) {
          case "not_started":
          case "documents_gathering":
            action = { label: "Upload Documents", href: "/documents" };
            break;
          case "client_review":
            action = { label: "Sign Form 8879", href: "/signatures" };
            break;
          case "signature_required":
            if (!hasForm8879) {
              action = { label: "Sign Form 8879", href: "/signatures" };
            }
            break;
        }
      }

      return {
        id: stageId,
        title: config.title,
        description: config.description,
        icon: config.icon,
        status,
        action,
      };
    });

    return stages;
  };

  const canMarkSignatureComplete = selectedReturn?.status === "signature_required" && hasForm8879;

  const stages = getStages();
  const currentStageIndex = stages.findIndex((s) => s.status === "current");
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  if (!isLoading && !selectedReturn) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>Return not found.</p>
            <Button asChild className="mt-4">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isPersonal ? "bg-blue-100" : "bg-amber-100"
        }`}>
          {isPersonal ? (
            <User className="w-6 h-6 text-blue-600" />
          ) : (
            <Building2 className="w-6 h-6 text-amber-600" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-return-status-title">
            {selectedReturn?.name || (isPersonal ? "Personal Return" : "Return Status")}
          </h1>
          <p className="text-muted-foreground">
            Track the progress of your 2025 tax return preparation
          </p>
        </div>
        {!isPersonal && selectedReturn && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive shrink-0">
                <XCircle className="w-4 h-4 mr-1" />
                Remove Return
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this business return?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove "{selectedReturn.name}" from your portal. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Return</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelReturn} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Remove Return
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold">{progressPercent}% Complete</p>
            </div>
            <Badge className={
              completedCount === stages.length 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            }>
              {completedCount === stages.length ? "All Done" : `Step ${currentStageIndex + 1} of ${stages.length}`}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
          
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";
              
              return (
                <div key={stage.id} className="relative flex gap-4">
                  <div className={`
                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${isCompleted 
                      ? "bg-green-100 dark:bg-green-900/30" 
                      : isCurrent 
                        ? "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "bg-muted"}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : isCurrent ? (
                      <Icon className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <Card className={`flex-1 ${isCurrent ? "ring-2 ring-primary/20" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${isCompleted ? "text-green-700 dark:text-green-400" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                              {stage.title}
                            </h3>
                            {isCompleted && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                Complete
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge className="text-xs bg-primary/10 text-primary border-0">
                                <Clock className="w-3 h-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                        
                        {stage.action && (
                          <Button size="sm" asChild>
                            <Link href={stage.action.href}>
                              {stage.action.label}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>
                        )}
                        
                        {stage.id === "signature_required" && canMarkSignatureComplete && (
                          <Button 
                            size="sm"
                            onClick={() => advanceStatusMutation.mutate()}
                            disabled={advanceStatusMutation.isPending}
                            data-testid="button-mark-signature-complete"
                          >
                            {advanceStatusMutation.isPending ? "Submitting..." : "Mark Complete"}
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedCount === stages.length && (
        <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
              Congratulations!
            </h2>
            <p className="text-green-700 dark:text-green-400 mb-4">
              Your 2025 tax return has been successfully filed and accepted.
            </p>
            <Button asChild>
              <Link href="/refund">Track Your Refund</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
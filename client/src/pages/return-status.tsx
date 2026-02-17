import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
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
  ChevronRight,
  Package,
  Briefcase,
  Shield,
  Heart,
  Star,
  Globe,
  Wrench,
  BookOpen,
  Truck,
  ShoppingCart,
  CreditCard,
  Headphones,
  Mail,
  Home,
  MessageSquare,
  Receipt,
  DollarSign,
} from "lucide-react";
import type { Document, Signature, RequiredDocument, QuestionnaireResponse, RefundTracking } from "@shared/schema";

interface ProductWithStages {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayLocation: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
  stages: { id: string; name: string; slug: string; color: string | null; sortOrder: number | null }[];
}

interface ClientProductEnriched {
  id: string;
  userId: string;
  productId: string;
  currentStageId: string | null;
  name: string | null;
  product: ProductWithStages | null;
  currentStage: { id: string; name: string; slug: string; color: string | null } | null;
}

const PRODUCT_ICON_MAP: Record<string, any> = {
  Package, FileText, Calculator, Briefcase, Building2, Shield, Heart, Star,
  Globe, Wrench, BookOpen, Truck, ShoppingCart, CreditCard, Headphones, Mail,
  Home, MessageSquare, Receipt, DollarSign, PenTool, User,
  ClipboardList: ClipboardCheck,
};

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
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

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

  const { data: clientProducts = [], isLoading: productsLoading } = useQuery<ClientProductEnriched[]>({
    queryKey: ["/api/client-products"],
  });

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Select first return by default (personal return)
  const selectedReturn = returns.find(r => r.id === selectedReturnId) || 
                         returns.find(r => r.returnType === "personal") || 
                         returns[0];
  
  const personalReturn = returns.find(r => r.returnType === "personal");
  const businessReturns = returns.filter(r => r.returnType === "business");

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
    // Use the status from the selected return (set by admin on Kanban board)
    const returnStatus = selectedReturn?.status as string | null;
    const currentStageIndex = returnStatus ? RETURN_PREP_STAGES.indexOf(returnStatus as any) : -1;

    // Build stages from the RETURN_PREP_STAGES config
    const stages: PrepStage[] = RETURN_PREP_STAGES.map((stageId, index) => {
      const config = STAGE_CONFIG[stageId];
      let status: "completed" | "current" | "pending" = "pending";
      
      if (currentStageIndex >= 0) {
        // Admin has set a status - use it
        if (index < currentStageIndex) {
          status = "completed";
        } else if (index === currentStageIndex) {
          status = "current";
        } else {
          status = "pending";
        }
      } else {
        // Fallback to calculated status based on user actions
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
          false, // not_started is never "complete", it's just the starting point
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

      // Determine action button for certain stages
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
            // If they haven't signed Form 8879 yet, show sign button
            // Otherwise the "Mark Complete" button will be shown separately
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

  // Check if client can mark signature stage as complete (uses the selected return's status)
  const canMarkSignatureComplete = selectedReturn?.status === "signature_required" && hasForm8879;

  const stages = getStages();
  const currentStageIndex = stages.findIndex((s) => s.status === "current");
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      not_started: "Not Started",
      documents_gathering: "Gathering Documents",
      information_review: "Info Review",
      return_preparation: "In Preparation",
      quality_review: "Quality Review",
      client_review: "Client Review",
      signature_required: "Signature Required",
      filing: "Filing",
      filed: "Filed",
    };
    return labels[status || "not_started"] || "Not Started";
  };

  const getStatusColor = (status: string | null) => {
    if (status === "filed") return "bg-green-100 text-green-800";
    if (status === "filing" || status === "signature_required") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-return-status-title">
            Return Status
          </h1>
          <p className="text-muted-foreground">
            Track the progress of your 2025 tax return preparation
          </p>
        </div>
      </div>

      {/* Returns Selection */}
      {returns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Tax Returns</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Personal Return Card */}
            {personalReturn && (
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedReturn?.id === personalReturn.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedReturnId(personalReturn.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Personal Return</h3>
                        <p className="text-sm text-muted-foreground">
                          Tax Year {personalReturn.taxYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(personalReturn.status)}>
                        {getStatusLabel(personalReturn.status)}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Business Return Cards */}
            {businessReturns.map((bizReturn) => (
              <Card
                key={bizReturn.id}
                className={`cursor-pointer transition-colors ${
                  selectedReturn?.id === bizReturn.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedReturnId(bizReturn.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{bizReturn.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Business Return • Tax Year {bizReturn.taxYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(bizReturn.status)}>
                        {getStatusLabel(bizReturn.status)}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Business Return Prompt */}
            {businessReturns.length === 0 && (
              <Link href="/businesses">
                <Card className="border-dashed cursor-pointer hover:border-muted-foreground/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                      <div className="p-2 bg-muted rounded-lg">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Add a Business</h3>
                        <p className="text-sm">
                          Have a business? Add it to track its return.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Selected Return Details */}
      {selectedReturn && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {selectedReturn.returnType === "personal" ? (
              <User className="h-5 w-5 text-blue-600" />
            ) : (
              <Building2 className="h-5 w-5 text-amber-600" />
            )}
            {selectedReturn.name} - Progress
          </h2>
        </div>
      )}

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

      {clientProducts.length > 0 && (
        <>
          <div className="border-t pt-6 mt-6" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Your Services
              </h1>
              <p className="text-muted-foreground">
                Track the progress of your additional services
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {clientProducts.map((cp) => {
              const productStages = cp.product?.stages || [];
              const currentStageIndex = productStages.findIndex(s => s.id === cp.currentStageId);
              const ProductIcon = PRODUCT_ICON_MAP[cp.product?.icon || "Package"] || Package;
              const isSelected = selectedProductId === cp.id;

              return (
                <Card
                  key={cp.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSelectedProductId(isSelected ? null : cp.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <ProductIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{cp.name || cp.product?.name || "Service"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {cp.product?.description || "Custom service"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cp.currentStage ? (
                          <Badge 
                            className="text-white"
                            style={{ backgroundColor: cp.currentStage.color || "#6b7280" }}
                          >
                            {cp.currentStage.name}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
                        )}
                        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedProductId && (() => {
            const selectedCP = clientProducts.find(cp => cp.id === selectedProductId);
            if (!selectedCP || !selectedCP.product) return null;
            const productStages = selectedCP.product.stages || [];
            const currentStageIndex = productStages.findIndex(s => s.id === selectedCP.currentStageId);
            const isLastStage = currentStageIndex >= 0 && currentStageIndex === productStages.length - 1;
            const isProductComplete = isLastStage;
            const completedProductStages = currentStageIndex >= 0 ? (isProductComplete ? productStages.length : currentStageIndex) : 0;
            const productProgressPercent = productStages.length > 0 
              ? Math.round((completedProductStages / productStages.length) * 100) 
              : 0;
            const hasStarted = currentStageIndex >= 0;
            const ProductIcon = PRODUCT_ICON_MAP[selectedCP.product.icon || "Package"] || Package;

            return (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ProductIcon className="h-5 w-5 text-purple-600" />
                  {selectedCP.name || selectedCP.product.name} - Progress
                </h2>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Overall Progress</p>
                        <p className="text-2xl font-bold">{productProgressPercent}% Complete</p>
                      </div>
                      <Badge className={
                        isProductComplete
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }>
                        {productStages.length === 0 
                          ? "No stages defined" 
                          : isProductComplete 
                            ? "All Done"
                            : !hasStarted 
                              ? "Not Started"
                              : `Step ${currentStageIndex + 1} of ${productStages.length}`}
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-purple-500 h-full transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${productProgressPercent}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {productStages.length > 0 && (
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
                    <div className="space-y-4">
                      {productStages.map((stage, index) => {
                        const isCompleted = isProductComplete 
                          ? true 
                          : (currentStageIndex >= 0 && index < currentStageIndex);
                        const isCurrent = !isProductComplete && index === currentStageIndex;
                        const stageColor = stage.color || "#6b7280";

                        return (
                          <div key={stage.id} className="relative flex gap-4">
                            <div className={`
                              relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                              ${isCompleted 
                                ? "bg-green-100" 
                                : isCurrent 
                                  ? "ring-2 ring-offset-2 ring-offset-background" 
                                  : "bg-muted"}
                            `}
                            style={isCurrent ? { backgroundColor: `${stageColor}20`, borderColor: stageColor } : {}}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              ) : isCurrent ? (
                                <Circle className="w-6 h-6" style={{ color: stageColor }} fill={stageColor} />
                              ) : (
                                <Circle className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>

                            <Card className={`flex-1 ${isCurrent ? "ring-2 ring-purple-200" : ""}`}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-semibold ${isCompleted ? "text-green-700" : isCurrent ? "text-purple-700" : "text-muted-foreground"}`}>
                                    {stage.name}
                                  </h3>
                                  {isCompleted && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Complete
                                    </Badge>
                                  )}
                                  {isCurrent && (
                                    <Badge className="text-xs text-white" style={{ backgroundColor: stageColor }}>
                                      <Clock className="w-3 h-3 mr-1" />
                                      In Progress
                                    </Badge>
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

                {productStages.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <p>No stages have been defined for this service yet. Your preparer will update the progress.</p>
                    </CardContent>
                  </Card>
                )}

                {isProductComplete && productStages.length > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-6 text-center">
                      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h2 className="text-xl font-bold text-green-800 mb-2">
                        Service Complete!
                      </h2>
                      <p className="text-green-700">
                        This service has been completed successfully.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

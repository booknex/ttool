import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRoute } from "wouter";
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  FileText,
  Calculator,
  Briefcase,
  Building2,
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
  PenTool,
  User,
  ClipboardCheck,
} from "lucide-react";

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

export default function ServiceStatus() {
  const [, params] = useRoute("/service-status/:clientProductId");
  const clientProductId = params?.clientProductId;

  const { data: clientProducts = [], isLoading } = useQuery<ClientProductEnriched[]>({
    queryKey: ["/api/client-products"],
  });

  const selectedCP = clientProducts.find(cp => cp.id === clientProductId);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!selectedCP) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>Service not found.</p>
            <Button asChild className="mt-4">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const productStages = selectedCP.product?.stages || [];
  const currentStageIndex = productStages.findIndex(s => s.id === selectedCP.currentStageId);
  const isLastStage = currentStageIndex >= 0 && currentStageIndex === productStages.length - 1;
  const isProductComplete = isLastStage;
  const completedProductStages = isProductComplete ? productStages.length : (currentStageIndex >= 0 ? currentStageIndex : 0);
  const progressPercent = productStages.length > 0
    ? Math.round((completedProductStages / productStages.length) * 100)
    : 0;
  const hasStarted = currentStageIndex >= 0;
  const ProductIcon = PRODUCT_ICON_MAP[selectedCP.product?.icon || "Package"] || Package;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <ProductIcon className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {selectedCP.name || selectedCP.product?.name || "Service"}
          </h1>
          <p className="text-muted-foreground">
            Track the progress of your service
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold">{progressPercent}% Complete</p>
            </div>
            <Badge className={
              isProductComplete
                ? "bg-green-100 text-green-800"
                : "bg-purple-100 text-purple-800"
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
              style={{ width: `${progressPercent}%` }}
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
}
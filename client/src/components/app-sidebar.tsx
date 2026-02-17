import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  FileText,
  MessageSquare,
  Receipt,
  DollarSign,
  LogOut,
  Shield,
  Building2,
  User,
  Plus,
  PenTool,
  ClipboardList,
  Package,
  Calculator,
  Briefcase,
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
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RefundTracking, Message, Signature, Invoice } from "@shared/schema";

interface Return {
  id: string;
  userId: string;
  businessId: string | null;
  returnType: "personal" | "business";
  name: string;
  status: string | null;
  taxYear: number | null;
}

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

interface AppSidebarProps {
  user: any;
}

const ICON_MAP: Record<string, any> = {
  Package, FileText, Calculator, Briefcase, Building2, Shield, Heart, Star,
  Globe, Wrench, BookOpen, Truck, ShoppingCart, CreditCard, Headphones, Mail,
  Home, MessageSquare, Receipt, DollarSign, PenTool, ClipboardList, User,
};

const STATUS_DOT: Record<string, string> = {
  filed: "bg-green-500",
  return_preparation: "bg-blue-500",
  quality_review: "bg-blue-500",
  client_review: "bg-blue-500",
  documents_gathering: "bg-amber-500",
  information_review: "bg-amber-500",
  signature_required: "bg-purple-500",
  filing: "bg-purple-500",
  not_started: "bg-gray-300",
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  documents_gathering: "Gathering Docs",
  information_review: "Info Review",
  return_preparation: "In Preparation",
  quality_review: "QA Review",
  client_review: "Client Review",
  signature_required: "Needs Signature",
  filing: "Filing",
  filed: "Filed",
};

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: refund } = useQuery<RefundTracking>({
    queryKey: ["/api/refund"],
  });

  const { data: returns = [] } = useQuery<Return[]>({
    queryKey: ["/api/returns"],
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: signatures } = useQuery<Signature[]>({
    queryKey: ["/api/signatures"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: allProducts = [] } = useQuery<ProductWithStages[]>({
    queryKey: ["/api/products"],
  });

  const { data: clientProducts = [] } = useQuery<ClientProductEnriched[]>({
    queryKey: ["/api/client-products"],
  });

  const returnPrepStatus = (refund as any)?.returnPrepStatus as string | null;
  const isFiled = returnPrepStatus === "filed";

  const unreadMessages = messages?.filter((m) => !m.isRead && !m.isFromClient).length || 0;
  const pendingSignatures = ["engagement_letter", "form_8879"].filter(
    (type) => !signatures?.some((s) => s.documentType === type)
  ).length;
  const unpaidInvoices = invoices?.filter((i) => i.status === "sent" || i.status === "overdue").length || 0;

  const personalReturn = returns.find((r) => r.returnType === "personal");
  const businessReturns = returns.filter((r) => r.returnType === "business");

  const assignedProductIds = new Set(clientProducts.map(cp => cp.productId));
  const sidebarProducts = allProducts.filter(p => 
    (p.displayLocation === "sidebar" || p.displayLocation === "both") && 
    !assignedProductIds.has(p.id)
  );

  const handleLogout = async () => {
    try {
      localStorage.removeItem("adminViewMode");
      await apiRequest("POST", "/api/auth/logout");
      queryClient.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddProduct = async (productId: string) => {
    try {
      await apiRequest("POST", "/api/client-products", { productId });
      queryClient.invalidateQueries({ queryKey: ["/api/client-products"] });
      setAddDialogOpen(false);
      toast({ title: "Added successfully" });
    } catch (error) {
      toast({ title: "Failed to add", variant: "destructive" });
    }
  };

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  const dot = (status: string | null) =>
    STATUS_DOT[status || "not_started"] || "bg-gray-300";

  const label = (status: string | null) =>
    STATUS_LABEL[status || "not_started"] || "Not Started";

  const getIcon = (iconName: string | null) => {
    return ICON_MAP[iconName || "Package"] || Package;
  };

  const getStageDot = (stage: ClientProductEnriched["currentStage"]) => {
    if (!stage) return "bg-gray-300";
    return stage.color ? "" : "bg-gray-300";
  };

  const coreTools = [
    { icon: Home, href: "/summary", label: "Home", badge: 0 },
    { icon: FileText, href: "/documents", label: "Documents", badge: 0 },
    { icon: MessageSquare, href: "/messages", label: "Messages", badge: unreadMessages },
    { icon: PenTool, href: "/signatures", label: "E-Sign", badge: pendingSignatures },
    { icon: ClipboardList, href: "/questionnaire", label: "Questionnaire", badge: 0 },
    ...(isFiled ? [{ icon: DollarSign, href: "/refund", label: "Refund", badge: 0 }] : []),
    { icon: Receipt, href: "/invoices", label: "Invoices", badge: unpaidInvoices },
  ];

  const tools = [...coreTools];

  return (
    <Sidebar className="border-r border-border/40">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base tracking-tight">TaxPortal</span>
        </div>
        <p className="text-sm text-muted-foreground">Hi {firstName}</p>
      </div>

      <SidebarContent className="px-3 flex-1 overflow-y-auto">
        <div className="mb-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              My Services
            </span>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add Service</DialogTitle>
                  <DialogDescription>
                    Choose a service to add to your portal.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Link
                    href="/businesses"
                    onClick={() => setAddDialogOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New Business Return</p>
                      <p className="text-xs text-muted-foreground">LLC, S-Corp, etc.</p>
                    </div>
                  </Link>
                  {sidebarProducts.map((product) => {
                    const ProductIcon = getIcon(product.icon);
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors w-full text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <ProductIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground">{product.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {personalReturn && (
              <Link href="/">
                <div
                  className={`group flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    location === "/" ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Personal Return</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${dot(personalReturn.status)}`} />
                    <span className="text-[10px] text-muted-foreground hidden group-hover:inline">
                      {label(personalReturn.status)}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {businessReturns.map((ret) => (
              <Link key={ret.id} href="/businesses">
                <div
                  className={`group flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    location === "/businesses" ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ret.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${dot(ret.status)}`} />
                  </div>
                </div>
              </Link>
            ))}

            {clientProducts.map((cp) => {
              const ProductIcon = getIcon(cp.product?.icon || null);
              const stageName = cp.currentStage?.name || "Not Started";
              const stageColor = cp.currentStage?.color || "#6b7280";
              return (
                <div
                  key={cp.id}
                  className="group flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <ProductIcon className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cp.name || cp.product?.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stageColor }}
                    />
                    <span className="text-[10px] text-muted-foreground hidden group-hover:inline">
                      {stageName}
                    </span>
                  </div>
                </div>
              );
            })}

            {returns.length === 0 && clientProducts.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-2.5 py-2">
                No services yet
              </p>
            )}
          </div>
        </div>
      </SidebarContent>

      <div className="border-t border-border/40 px-3 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1 mb-2 block">
          Tools
        </span>
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-4 gap-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = location === tool.href;
              return (
                <Tooltip key={tool.href}>
                  <TooltipTrigger asChild>
                    <Link href={tool.href}>
                      <div
                        className={`relative flex flex-col items-center justify-center py-2 rounded-lg cursor-pointer transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                        {tool.badge > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold px-1">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {tool.label}
                    {tool.badge > 0 && ` (${tool.badge})`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      <SidebarFooter className="px-4 py-3 border-t border-border/40">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

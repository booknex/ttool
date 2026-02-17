import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Briefcase,
  PenTool,
  ClipboardList,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RefundTracking } from "@shared/schema";

interface Return {
  id: string;
  userId: string;
  businessId: string | null;
  returnType: "personal" | "business";
  name: string;
  status: string | null;
  taxYear: number | null;
}

interface AppSidebarProps {
  user: any;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const [returnsExpanded, setReturnsExpanded] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: refund } = useQuery<RefundTracking>({
    queryKey: ["/api/refund"],
  });

  const { data: returns = [] } = useQuery<Return[]>({
    queryKey: ["/api/returns"],
  });

  const returnPrepStatus = (refund as any)?.returnPrepStatus as string | null;
  const isFiled = returnPrepStatus === "filed";

  const personalReturn = returns.find(r => r.returnType === "personal");
  const businessReturns = returns.filter(r => r.returnType === "business");

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

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "filed": return "text-green-600";
      case "return_preparation":
      case "quality_review":
      case "client_review": return "text-blue-600";
      case "documents_gathering":
      case "information_review": return "text-amber-600";
      case "signature_required":
      case "filing": return "text-purple-600";
      default: return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "not_started": return "Not Started";
      case "documents_gathering": return "Gathering Docs";
      case "information_review": return "Info Review";
      case "return_preparation": return "In Preparation";
      case "quality_review": return "QA Review";
      case "client_review": return "Client Review";
      case "signature_required": return "Needs Signature";
      case "filing": return "Filing";
      case "filed": return "Filed";
      default: return "Not Started";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/summary" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">TaxPortal</h1>
            <p className="text-xs text-muted-foreground">Tax Year {new Date().getFullYear()}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/summary"}>
                  <Link href="/summary">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-3 py-1.5">
            <button
              onClick={() => setReturnsExpanded(!returnsExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {returnsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              My Returns
            </button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New</DialogTitle>
                  <DialogDescription>
                    What would you like to add?
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <Link
                    href="/businesses"
                    onClick={() => setAddDialogOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Add a Business</p>
                      <p className="text-xs text-muted-foreground">LLC, S-Corp, Sole Proprietorship, etc.</p>
                    </div>
                  </Link>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {returnsExpanded && (
            <SidebarGroupContent>
              <SidebarMenu>
                {personalReturn && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/"}>
                      <Link href="/">
                        <User className="w-4 h-4" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate text-sm">Personal Return</span>
                          <span className={`text-[10px] ${getStatusColor(personalReturn.status)}`}>
                            {getStatusLabel(personalReturn.status)}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {businessReturns.map((ret) => (
                  <SidebarMenuItem key={ret.id}>
                    <SidebarMenuButton asChild isActive={location === `/businesses`}>
                      <Link href="/businesses">
                        <Building2 className="w-4 h-4" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate text-sm">{ret.name}</span>
                          <span className={`text-[10px] ${getStatusColor(ret.status)}`}>
                            {getStatusLabel(ret.status)}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {returns.length === 0 && (
                  <SidebarMenuItem>
                    <div className="px-3 py-2 text-xs text-muted-foreground italic">
                      No returns yet
                    </div>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/documents"}>
                  <Link href="/documents">
                    <FileText className="w-4 h-4" />
                    <span>Documents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/messages"}>
                  <Link href="/messages">
                    <MessageSquare className="w-4 h-4" />
                    <span>Messages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/signatures"}>
                  <Link href="/signatures">
                    <PenTool className="w-4 h-4" />
                    <span>E-Sign</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/questionnaire"}>
                  <Link href="/questionnaire">
                    <ClipboardList className="w-4 h-4" />
                    <span>Questionnaire</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isFiled && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/refund"}>
                    <Link href="/refund">
                      <DollarSign className="w-4 h-4" />
                      <span>Refund Tracker</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/invoices"}>
                  <Link href="/invoices">
                    <Receipt className="w-4 h-4" />
                    <span>Invoices</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={user?.firstName || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "Client"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

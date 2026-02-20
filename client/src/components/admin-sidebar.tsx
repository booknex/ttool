import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  MessageSquare, 
  PenTool, 
  DollarSign, 
  TrendingUp,
  LogOut,
  Shield,
  ListChecks,
  Kanban,
  User,
  Package,
  CalendarDays,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminSidebarProps {
  user: any;
}

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, testId: "link-admin-dashboard" },
  { title: "Clients", url: "/admin/clients", icon: Users, testId: "link-admin-clients" },
  { title: "Kanban Board", url: "/admin/kanban", icon: Kanban, testId: "link-admin-kanban" },
  { title: "Documents", url: "/admin/documents", icon: FileText, testId: "link-admin-documents" },
  { title: "Messages", url: "/admin/messages", icon: MessageSquare, testId: "link-admin-messages" },
  { title: "Invoices", url: "/admin/invoices", icon: DollarSign, testId: "link-admin-invoices" },
  { title: "Return Status", url: "/admin/return-statuses", icon: ListChecks, testId: "link-admin-return-statuses" },
  { title: "Refunds", url: "/admin/refunds", icon: TrendingUp, testId: "link-admin-refunds" },
  { title: "Signatures", url: "/admin/signatures", icon: PenTool, testId: "link-admin-signatures" },
  { title: "Products", url: "/admin/products", icon: Package, testId: "link-admin-products" },
  { title: "Calendar", url: "/admin/calendar", icon: CalendarDays, testId: "link-admin-calendar" },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [location, setLocation] = useLocation();

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
    return "A";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">TaxPortal</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/admin" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={item.testId}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-admin-name">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Administrator
            </p>
          </div>
        </div>
        <Button 
          variant="default" 
          className="w-full justify-start gap-2" 
          onClick={() => {
            localStorage.setItem("adminViewMode", "customer");
            setLocation("/");
            window.location.reload();
          }}
          data-testid="button-switch-to-customer"
        >
          <User className="w-4 h-4" />
          My Customer Portal
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2" 
          onClick={handleLogout}
          data-testid="button-admin-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import Messages from "@/pages/messages";
import Questionnaire from "@/pages/questionnaire";
import Refund from "@/pages/refund";
import Signatures from "@/pages/signatures";
import Invoices from "@/pages/invoices";
import ReturnStatus from "@/pages/return-status";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import AdminDocuments from "@/pages/admin/documents";
import AdminMessages from "@/pages/admin/messages";
import AdminInvoices from "@/pages/admin/invoices";
import AdminRefunds from "@/pages/admin/refunds";
import AdminSignatures from "@/pages/admin/signatures";
import AdminClientDetail from "@/pages/admin/client-detail";
import AdminReturnStatuses from "@/pages/admin/return-statuses";
import AdminKanban from "@/pages/admin/kanban";
import AffiliateLogin from "@/pages/affiliate/login";
import AffiliateRegister from "@/pages/affiliate/register";
import AffiliateDashboard from "@/pages/affiliate/dashboard";
import { BooknexMascot } from "@/components/booknex-mascot";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Link } from "wouter";

function ClientLayout({ children, user }: { children: React.ReactNode; user: any }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <ImpersonationBanner />
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Link href="/messages">
              <Button variant="default" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
              </Button>
            </Link>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
        <BooknexMascot />
      </div>
    </SidebarProvider>
  );
}

function AdminLayout({ children, user }: { children: React.ReactNode; user: any }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AdminSidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-primary animate-pulse mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/affiliate" component={AffiliateDashboard} />
        <Route path="/affiliate/login" component={AffiliateLogin} />
        <Route path="/affiliate/register" component={AffiliateRegister} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (user?.isAdmin) {
    return (
      <AdminLayout user={user}>
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/clients" component={AdminClients} />
          <Route path="/admin/clients/:id" component={AdminClientDetail} />
          <Route path="/admin/documents" component={AdminDocuments} />
          <Route path="/admin/messages" component={AdminMessages} />
          <Route path="/admin/invoices" component={AdminInvoices} />
          <Route path="/admin/return-statuses" component={AdminReturnStatuses} />
          <Route path="/admin/refunds" component={AdminRefunds} />
          <Route path="/admin/signatures" component={AdminSignatures} />
          <Route path="/admin/kanban" component={AdminKanban} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    );
  }

  if (!user?.hasCompletedQuestionnaire) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="flex items-center gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">T</span>
            </div>
            <span className="font-semibold">TaxPortal</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Questionnaire />
        </main>
      </div>
    );
  }

  return (
    <ClientLayout user={user}>
      <Switch>
        <Route path="/" component={ReturnStatus} />
        <Route path="/summary" component={Dashboard} />
        <Route path="/documents" component={Documents} />
        <Route path="/messages" component={Messages} />
        <Route path="/questionnaire" component={Questionnaire} />
        <Route path="/refund" component={Refund} />
        <Route path="/signatures" component={Signatures} />
        <Route path="/invoices" component={Invoices} />
        <Route component={NotFound} />
      </Switch>
    </ClientLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users,
  FileText,
  MessageSquare,
  DollarSign,
  PenTool,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Plus,
  LayoutGrid,
  Clock,
  CheckCircle2,
  FileUp,
  Send,
  CreditCard,
  UserPlus,
  Receipt,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PIPELINE_LABELS: Record<string, string> = {
  not_started: "Not Started",
  documents_gathering: "Gathering Docs",
  information_review: "Info Review",
  return_preparation: "Preparation",
  quality_review: "QA Review",
  client_review: "Client Review",
  signature_required: "Signatures",
  filing: "Filing",
  filed: "Filed",
};

const PIPELINE_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-700",
  documents_gathering: "bg-amber-100 text-amber-700",
  information_review: "bg-blue-100 text-blue-700",
  return_preparation: "bg-indigo-100 text-indigo-700",
  quality_review: "bg-purple-100 text-purple-700",
  client_review: "bg-orange-100 text-orange-700",
  signature_required: "bg-pink-100 text-pink-700",
  filing: "bg-cyan-100 text-cyan-700",
  filed: "bg-green-100 text-green-700",
};

const ACTIVITY_ICONS: Record<string, any> = {
  document: FileUp,
  message: MessageSquare,
  signature: PenTool,
  payment: CreditCard,
};

const ACTIVITY_COLORS: Record<string, string> = {
  document: "bg-blue-50 text-blue-600",
  message: "bg-orange-50 text-orange-600",
  signature: "bg-purple-50 text-purple-600",
  payment: "bg-green-50 text-green-600",
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/admin/clients",
      testId: "stat-total-clients",
    },
    {
      title: "Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      subtitle: `${stats?.pendingDocuments || 0} pending review`,
      alert: (stats?.pendingDocuments || 0) > 0,
      href: "/admin/documents",
      testId: "stat-total-documents",
    },
    {
      title: "Messages",
      value: stats?.unreadMessages || 0,
      icon: MessageSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      subtitle: "unread from clients",
      alert: (stats?.unreadMessages || 0) > 0,
      href: "/admin/messages",
      testId: "stat-unread-messages",
    },
    {
      title: "Signatures",
      value: stats?.pendingSignatures || 0,
      icon: PenTool,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      subtitle: `${stats?.totalSignatures || 0} total`,
      alert: (stats?.pendingSignatures || 0) > 0,
      href: "/admin/signatures",
      testId: "stat-signatures",
    },
    {
      title: "Revenue",
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      subtitle: `${stats?.totalInvoices || 0} invoices`,
      href: "/admin/invoices",
      testId: "stat-total-revenue",
    },
    {
      title: "Outstanding",
      value: `$${(stats?.totalOutstanding || 0).toLocaleString()}`,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      subtitle: `${stats?.unpaidInvoices || 0} unpaid`,
      alert: (stats?.unpaidInvoices || 0) > 0,
      href: "/admin/invoices",
      testId: "stat-outstanding",
    },
    {
      title: "Returns",
      value: stats?.totalReturns || 0,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      subtitle: `${stats?.filedReturns || 0} filed`,
      href: "/admin/return-statuses",
      testId: "stat-returns",
    },
  ];

  const quickActions = [
    { label: "Add Client", icon: UserPlus, href: "/admin/clients" },
    { label: "Create Invoice", icon: Receipt, href: "/admin/invoices" },
    { label: "Kanban Board", icon: LayoutGrid, href: "/admin/kanban" },
    { label: "View Documents", icon: FileText, href: "/admin/documents" },
  ];

  const totalPipeline = Object.values(stats?.pipeline || {}).reduce((a: number, b: any) => a + Number(b), 0) as number;

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-admin-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your tax practice
          </p>
        </div>
        <Badge variant="outline" className="text-sm">Tax Year 2025</Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:border-gray-300 relative"
              data-testid={stat.testId}
            >
              {stat.alert && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold" data-testid={`${stat.testId}-value`}>
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  {stat.title}
                </div>
                {stat.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Button variant="outline" size="sm" className="gap-2">
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Needs Attention</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stats?.needsAttention?.length || 0} clients
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[360px] overflow-y-auto">
            {(stats?.needsAttention || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                <p className="text-sm font-medium text-green-700">All caught up!</p>
                <p className="text-xs text-muted-foreground">No clients need your attention right now.</p>
              </div>
            ) : (
              (stats?.needsAttention || []).map((client: any) => (
                <Link key={client.id} href={`/admin/clients/${client.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                        {(client.name || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {client.items.map((item: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] font-normal py-0"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 max-h-[360px] overflow-y-auto">
            {(stats?.recentActivity || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              (stats?.recentActivity || []).map((activity: any, idx: number) => {
                const Icon = ACTIVITY_ICONS[activity.type] || Clock;
                const colorClasses = ACTIVITY_COLORS[activity.type] || "bg-gray-50 text-gray-600";
                return (
                  <div key={idx} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                    <div className={`w-7 h-7 rounded-full ${colorClasses} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{activity.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {activity.timestamp
                          ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Return Pipeline</CardTitle>
              <Link href="/admin/kanban">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  <Eye className="w-3.5 h-3.5" />
                  View Kanban
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {totalPipeline === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No returns in pipeline</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-gray-100">
                  {Object.entries(stats?.pipeline || {}).map(([stage, count]) => {
                    const pct = totalPipeline > 0 ? (Number(count) / totalPipeline) * 100 : 0;
                    if (pct === 0) return null;
                    const colors: Record<string, string> = {
                      not_started: "bg-gray-400",
                      documents_gathering: "bg-amber-400",
                      information_review: "bg-blue-400",
                      return_preparation: "bg-indigo-400",
                      quality_review: "bg-purple-400",
                      client_review: "bg-orange-400",
                      signature_required: "bg-pink-400",
                      filing: "bg-cyan-400",
                      filed: "bg-green-500",
                    };
                    return (
                      <div
                        key={stage}
                        className={`${colors[stage] || "bg-gray-300"} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${PIPELINE_LABELS[stage]}: ${count}`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  {Object.entries(stats?.pipeline || {}).map(([stage, count]) => {
                    if (Number(count) === 0) return null;
                    return (
                      <div
                        key={stage}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs ${PIPELINE_COLORS[stage] || "bg-gray-100"}`}
                      >
                        <span className="font-medium truncate mr-1">{PIPELINE_LABELS[stage] || stage}</span>
                        <span className="font-bold">{String(count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
              <Link href="/admin/invoices">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  <Eye className="w-3.5 h-3.5" />
                  View Invoices
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs font-medium text-green-600 mb-1">Collected</p>
                  <p className="text-xl font-bold text-green-700">
                    ${(stats?.totalRevenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs font-medium text-red-600 mb-1">Outstanding</p>
                  <p className="text-xl font-bold text-red-700">
                    ${(stats?.totalOutstanding || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {(stats?.totalRevenue || 0) + (stats?.totalOutstanding || 0) > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Collection Rate</span>
                    <span>
                      {Math.round(
                        ((stats?.totalRevenue || 0) /
                          ((stats?.totalRevenue || 0) + (stats?.totalOutstanding || 0))) *
                          100
                      )}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          ((stats?.totalRevenue || 0) /
                            ((stats?.totalRevenue || 0) + (stats?.totalOutstanding || 0))) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold">{stats?.totalInvoices || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold text-green-600">
                    {(stats?.totalInvoices || 0) - (stats?.unpaidInvoices || 0)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Paid</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold text-red-600">{stats?.unpaidInvoices || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Unpaid</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

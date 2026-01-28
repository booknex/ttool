import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  DollarSign, 
  PenTool,
  AlertCircle,
  TrendingUp
} from "lucide-react";

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
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "text-blue-500",
      testId: "stat-total-clients"
    },
    {
      title: "Total Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      color: "text-green-500",
      subtitle: `${stats?.pendingDocuments || 0} pending review`,
      testId: "stat-total-documents"
    },
    {
      title: "Unread Messages",
      value: stats?.unreadMessages || 0,
      icon: MessageSquare,
      color: "text-orange-500",
      alert: (stats?.unreadMessages || 0) > 0,
      testId: "stat-unread-messages"
    },
    {
      title: "Total Signatures",
      value: stats?.totalSignatures || 0,
      icon: PenTool,
      color: "text-purple-500",
      testId: "stat-total-signatures"
    },
    {
      title: "Total Revenue",
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-500",
      testId: "stat-total-revenue"
    },
    {
      title: "Outstanding",
      value: `$${(stats?.totalOutstanding || 0).toLocaleString()}`,
      icon: AlertCircle,
      color: "text-red-500",
      subtitle: `${stats?.unpaidInvoices || 0} unpaid invoices`,
      testId: "stat-outstanding"
    },
    {
      title: "Total Invoices",
      value: stats?.totalInvoices || 0,
      icon: TrendingUp,
      color: "text-indigo-500",
      testId: "stat-total-invoices"
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-dashboard-title">
          Admin Dashboard
        </h1>
        <Badge variant="outline">Tax Year 2025</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={stat.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold" data-testid={`${stat.testId}-value`}>{stat.value}</div>
                {stat.alert && (
                  <Badge variant="destructive" className="text-xs">New</Badge>
                )}
              </div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1" data-testid={`${stat.testId}-subtitle`}>{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate to different sections and manage your tax practice.
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>View and manage client documents</li>
              <li>Respond to client messages</li>
              <li>Create and track invoices</li>
              <li>Update refund statuses</li>
              <li>Review e-signatures</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.unreadMessages > 0 
                ? `You have ${stats.unreadMessages} unread message${stats.unreadMessages > 1 ? 's' : ''} from clients.`
                : "No pending items require your attention."
              }
            </p>
            {stats?.pendingDocuments > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {stats.pendingDocuments} document{stats.pendingDocuments > 1 ? 's' : ''} pending review.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

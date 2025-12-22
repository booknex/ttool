import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  MessageSquare, 
  PenTool, 
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
} from "lucide-react";

export default function AdminClients() {
  const { data: clients, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "approved":
      case "refund_sent":
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case "processing":
      case "submitted":
      case "accepted":
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Not Filed</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-clients-title">
          Clients
        </h1>
        <Badge variant="outline">{clients?.length || 0} Total</Badge>
      </div>

      {clients?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No clients yet. Clients will appear here when they sign up.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <Link key={client.id} href={`/admin/clients/${client.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-client-${client.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={client.profileImageUrl} />
                      <AvatarFallback>
                        {client.firstName?.[0] || client.email?.[0]?.toUpperCase() || "C"}
                        {client.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {client.firstName && client.lastName 
                          ? `${client.firstName} ${client.lastName}`
                          : client.email || "Unknown Client"
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                      <div className="mt-2">
                        {getStatusBadge(client.stats?.refundStatus)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{client.stats?.documentsCount || 0} docs</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <PenTool className="w-4 h-4 text-muted-foreground" />
                      <span>{client.stats?.signaturesCount || 0} signed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className={`w-4 h-4 ${client.stats?.unreadMessages > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <span>
                        {client.stats?.unreadMessages > 0 
                          ? `${client.stats.unreadMessages} unread`
                          : "No messages"
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className={`w-4 h-4 ${client.stats?.pendingInvoices > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <span>
                        {client.stats?.pendingInvoices > 0 
                          ? `${client.stats.pendingInvoices} unpaid`
                          : "Paid"
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { 
  ArrowLeft,
  FileText, 
  MessageSquare, 
  PenTool, 
  DollarSign,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Save,
  X,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

export default function AdminClientDetail() {
  const [, params] = useRoute("/admin/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const { data: client, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/clients", clientId],
    enabled: !!clientId,
  });

  const { data: documents } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "documents"],
    enabled: !!clientId,
  });

  const { data: messages } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "messages"],
    enabled: !!clientId,
  });

  const { data: signatures } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "signatures"],
    enabled: !!clientId,
  });

  const { data: invoices } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "invoices"],
    enabled: !!clientId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const response = await apiRequest("PATCH", `/api/admin/clients/${clientId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setIsEditing(false);
      toast({ title: "Client information updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update client", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = () => {
    setEditForm({
      firstName: client?.firstName || "",
      lastName: client?.lastName || "",
      email: client?.email || "",
      phone: client?.phone || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500">Verified</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "refund_sent":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "processing":
      case "accepted":
        return <Badge variant="secondary">Processing</Badge>;
      case "submitted":
        return <Badge variant="outline">Submitted</Badge>;
      default:
        return <Badge variant="outline">Not Filed</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Client not found</p>
            <Button asChild className="mt-4">
              <Link href="/admin/clients">Back to Clients</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clients" data-testid="button-back-to-clients">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" data-testid="text-client-name">
            {client.firstName && client.lastName 
              ? `${client.firstName} ${client.lastName}`
              : client.email || "Client"
            }
          </h1>
          <p className="text-sm text-muted-foreground">Client Details</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={handleEdit} data-testid="button-edit-client">
            <Edit className="w-4 h-4 mr-2" />
            Edit Info
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-client">
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={client.profileImageUrl} />
                <AvatarFallback className="text-2xl">
                  {client.firstName?.[0] || client.email?.[0]?.toUpperCase() || "C"}
                  {client.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      data-testid="input-edit-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      data-testid="input-edit-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    data-testid="input-edit-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-edit-phone"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-client-fullname">
                    {client.firstName || client.lastName 
                      ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
                      : "Not provided"
                    }
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-client-email">{client.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-client-phone">{client.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Joined {client.createdAt ? format(new Date(client.createdAt), "MMM d, yyyy") : "Unknown"}
                  </span>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>{client.stats?.documentsCount || 0} docs</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <PenTool className="w-4 h-4 text-muted-foreground" />
                  <span>{client.stats?.signaturesCount || 0} signed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span>{client.stats?.unreadMessages || 0} unread</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>{client.stats?.pendingInvoices || 0} unpaid</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-2">Refund Status</h4>
              {getRefundStatusBadge(client.stats?.refundStatus || "not_filed")}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="documents" className="space-y-4">
            <TabsList>
              <TabsTrigger value="documents" data-testid="tab-documents">
                Documents ({documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages">
                Messages ({messages?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="signatures" data-testid="tab-signatures">
                Signatures ({signatures?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices">
                Invoices ({invoices?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <CardDescription>All documents uploaded by this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {!documents || documents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`doc-${doc.id}`}>
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{doc.originalName}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.documentType?.replace(/_/g, " ").toUpperCase() || "Other"} 
                                {doc.uploadedAt && ` - ${format(new Date(doc.uploadedAt), "MMM d, yyyy")}`}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(doc.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <CardDescription>Communication history with this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {!messages || messages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No messages yet</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`p-3 rounded-lg ${msg.isFromClient ? "bg-muted/50" : "bg-primary/10 ml-8"}`}
                          data-testid={`msg-${msg.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {msg.isFromClient ? "Client" : "You"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {msg.createdAt && format(new Date(msg.createdAt), "MMM d, h:mm a")}
                            </span>
                            {msg.isFromClient && !msg.isRead && (
                              <Badge variant="secondary" className="text-xs">Unread</Badge>
                            )}
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signatures">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">E-Signatures</CardTitle>
                  <CardDescription>All signed documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {!signatures || signatures.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No signatures yet</p>
                  ) : (
                    <div className="space-y-3">
                      {signatures.map((sig) => (
                        <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`sig-${sig.id}`}>
                          <div className="flex items-center gap-3">
                            <PenTool className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="font-medium text-sm">
                                {sig.documentType === "engagement_letter" ? "Engagement Letter" : "Form 8879"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Signed {sig.signedAt && format(new Date(sig.signedAt), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-500">Signed</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoices</CardTitle>
                  <CardDescription>Billing history for this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {!invoices || invoices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No invoices yet</p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`inv-${inv.id}`}>
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{inv.description || `Invoice #${inv.id.slice(0, 8)}`}</p>
                              <p className="text-xs text-muted-foreground">
                                ${parseFloat(inv.total || 0).toFixed(2)}
                                {inv.createdAt && ` - ${format(new Date(inv.createdAt), "MMM d, yyyy")}`}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "outline"}
                            className={inv.status === "paid" ? "bg-green-500" : ""}
                          >
                            {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1) || "Draft"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

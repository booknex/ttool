import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Loader2,
  ClipboardList,
  LogIn,
  Archive,
  ArchiveRestore,
  Trash2,
  Building2,
  Users,
  Receipt
} from "lucide-react";
import { format } from "date-fns";

export default function AdminClientDetail() {
  const [, params] = useRoute("/admin/clients/:id");
  const [, setLocation] = useLocation();
  const clientId = params?.id;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [businessEditForm, setBusinessEditForm] = useState({
    name: "",
    entityType: "",
    taxId: "",
    address: "",
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/admin/businesses/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({ title: "Business updated", description: "Business information has been saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId, "businesses"] });
      setEditingBusinessId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update business",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    },
  });

  const startEditingBusiness = (business: any) => {
    setEditingBusinessId(business.id);
    setBusinessEditForm({
      name: business.name || "",
      entityType: business.entityType || "llc",
      taxId: business.taxId || "",
      address: business.address || "",
    });
  };

  const saveBusinessEdit = () => {
    if (!editingBusinessId) return;
    updateBusinessMutation.mutate({
      id: editingBusinessId,
      updates: businessEditForm,
    });
  };

  const cancelBusinessEdit = () => {
    setEditingBusinessId(null);
    setBusinessEditForm({ name: "", entityType: "", taxId: "", address: "" });
  };

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/clients/${clientId}/impersonate`);
    },
    onSuccess: () => {
      toast({ title: "Now viewing as client", description: "You are now logged in as this client" });
      queryClient.clear();
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to login as client", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      const endpoint = archive ? "archive" : "unarchive";
      return apiRequest("POST", `/api/admin/clients/${clientId}/${endpoint}`);
    },
    onSuccess: (_, archive) => {
      toast({ 
        title: archive ? "Client archived" : "Client restored", 
        description: archive 
          ? "The client and their documents have been archived" 
          : "The client and their documents have been restored"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId] });
    },
    onError: (error: any, archive) => {
      toast({ 
        title: archive ? "Failed to archive client" : "Failed to restore client", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/admin/clients/${clientId}`);
    },
    onSuccess: () => {
      toast({ 
        title: "Client deleted", 
        description: "The client and all their data have been permanently deleted"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setLocation("/admin/clients");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete client", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
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

  const { data: questionnaire } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "questionnaire"],
    enabled: !!clientId,
  });

  const { data: businesses } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "businesses"],
    enabled: !!clientId,
  });

  const { data: returns } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "returns"],
    enabled: !!clientId,
  });

  const { data: dependents } = useQuery<any[]>({
    queryKey: ["/api/admin/clients", clientId, "dependents"],
    enabled: !!clientId,
  });

  const updateReturnMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/admin/returns/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({ title: "Return updated", description: "Return status has been saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId, "returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update return",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    },
  });

  const returnStatusLabels: Record<string, string> = {
    not_started: "Not Started",
    documents_gathering: "Gathering Docs",
    information_review: "Info Review",
    return_preparation: "Prep",
    quality_review: "QA Review",
    client_review: "Client Review",
    signature_required: "Signatures",
    filing: "Filing",
    filed: "Filed",
  };

  const questionLabels: Record<string, { section: string; question: string }> = {
    filing_status: { section: "Filing Status", question: "What is your filing status for 2025?" },
    marital_change: { section: "Filing Status", question: "Did your marital status change during 2025?" },
    employment_type: { section: "Income", question: "What type of income did you have in 2025?" },
    side_business: { section: "Income", question: "Did you have any freelance or side business income?" },
    side_business_type: { section: "Income", question: "What businesses did you operate?" },
    crypto_transactions: { section: "Income", question: "Did you buy, sell, or trade cryptocurrency in 2025?" },
    homeowner: { section: "Deductions", question: "Do you own your home?" },
    mortgage_interest: { section: "Deductions", question: "Did you pay mortgage interest in 2025?" },
    property_taxes: { section: "Deductions", question: "Did you pay property taxes in 2025?" },
    charitable_donations: { section: "Deductions", question: "Did you make charitable donations in 2025?" },
    charitable_amount: { section: "Deductions", question: "Approximately how much did you donate to charity?" },
    medical_expenses: { section: "Deductions", question: "Did you have significant medical expenses?" },
    student_loans: { section: "Education", question: "Did you pay student loan interest in 2025?" },
    education_expenses: { section: "Education", question: "Did you or a dependent have education expenses?" },
    "529_contributions": { section: "Education", question: "Did you contribute to a 529 education savings plan?" },
    dependents: { section: "Family", question: "Do you have any dependents?" },
    dependent_count: { section: "Family", question: "How many dependents do you have?" },
    childcare_expenses: { section: "Family", question: "Did you pay for childcare or dependent care?" },
    major_life_events: { section: "Life Events", question: "Did you experience any major life events in 2025?" },
    home_office: { section: "Life Events", question: "Did you work from home with a dedicated home office?" },
    vehicle_business_use: { section: "Life Events", question: "Did you use your vehicle for business purposes?" },
  };

  const formatQuestionnaireAnswer = (answer: any): string => {
    if (answer === null || answer === undefined) return "Not answered";
    if (typeof answer === "boolean") return answer ? "Yes" : "No";
    if (Array.isArray(answer)) {
      const filtered = answer.filter((a: any) => a && String(a).trim() !== "");
      return filtered.length > 0 ? filtered.join(", ") : "Not answered";
    }
    return String(answer);
  };

  const groupedQuestionnaire = questionnaire?.reduce((acc: Record<string, any[]>, item: any) => {
    const label = questionLabels[item.questionId];
    const section = label?.section || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push({
      ...item,
      questionText: label?.question || item.questionId,
    });
    return acc;
  }, {}) || {};

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

  const getReturnPrepStatusBadge = (status: string) => {
    const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      not_started: { label: "Not Started", variant: "outline" },
      documents_gathering: { label: "Gathering Docs", variant: "secondary" },
      information_review: { label: "Info Review", variant: "secondary" },
      return_preparation: { label: "Prep", variant: "secondary" },
      quality_review: { label: "QA Review", variant: "secondary" },
      client_review: { label: "Client Review", variant: "secondary" },
      signature_required: { label: "Signatures", variant: "secondary" },
      filing: { label: "Filing", variant: "secondary" },
      filed: { label: "Filed", variant: "default" },
    };
    const config = statusLabels[status] || { label: status, variant: "outline" as const };
    return (
      <Badge 
        variant={config.variant} 
        className={config.variant === "default" ? "bg-green-500" : ""}
      >
        {config.label}
      </Badge>
    );
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
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => impersonateMutation.mutate()}
                disabled={impersonateMutation.isPending}
              >
                {impersonateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Login as Client
              </Button>
              <Button variant="outline" onClick={handleEdit} data-testid="button-edit-client">
                <Edit className="w-4 h-4 mr-2" />
                Edit Info
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant={client.isArchived ? "outline" : "destructive"}
                    disabled={archiveMutation.isPending}
                  >
                    {archiveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : client.isArchived ? (
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                    ) : (
                      <Archive className="w-4 h-4 mr-2" />
                    )}
                    {client.isArchived ? "Restore" : "Archive"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {client.isArchived ? "Restore Client?" : "Archive Client?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {client.isArchived 
                        ? "This will restore the client and all their documents. They will be able to access their portal again."
                        : "This will archive the client and all their documents. They will no longer appear in your active client list. You can restore them later from the archived clients filter."
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => archiveMutation.mutate(!client.isArchived)}>
                      {client.isArchived ? "Restore" : "Archive"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {client.isArchived && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete Permanently
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Client Permanently?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the client account 
                        and all associated data including documents, messages, signatures, invoices, 
                        and questionnaire responses.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
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
              <h4 className="text-sm font-medium mb-2">Return Status</h4>
              {getReturnPrepStatusBadge(client.stats?.returnPrepStatus || "not_started")}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="documents" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="documents" data-testid="tab-documents">
                Documents ({documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="questionnaire" data-testid="tab-questionnaire">
                Questionnaire ({questionnaire?.length || 0})
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
              <TabsTrigger value="businesses" data-testid="tab-businesses">
                Businesses ({businesses?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="returns" data-testid="tab-returns">
                Returns ({returns?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="dependents" data-testid="tab-dependents">
                Dependents ({dependents?.length || 0})
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

            <TabsContent value="questionnaire">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tax Questionnaire</CardTitle>
                  <CardDescription>Client's questionnaire responses for their tax return</CardDescription>
                </CardHeader>
                <CardContent>
                  {!questionnaire || questionnaire.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Questionnaire not completed yet</p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedQuestionnaire).map(([section, items]) => (
                        <div key={section}>
                          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" />
                            {section}
                          </h4>
                          <div className="space-y-2">
                            {(items as any[]).map((item: any) => (
                              <div key={item.id} className="p-3 rounded-lg bg-muted/50">
                                <p className="text-sm font-medium mb-1">{item.questionText}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatQuestionnaireAnswer(item.answer)}
                                </p>
                              </div>
                            ))}
                          </div>
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

            <TabsContent value="businesses">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Businesses</CardTitle>
                  <CardDescription>Client's business entities with owners and expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  {!businesses || businesses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No businesses registered yet</p>
                  ) : (
                    <div className="space-y-4">
                      {businesses.map((business: any) => (
                        <div key={business.id} className="border rounded-lg p-4" data-testid={`business-${business.id}`}>
                          {editingBusinessId === business.id ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                <span className="font-semibold">Edit Business</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Business Name</Label>
                                  <Input 
                                    value={businessEditForm.name}
                                    onChange={(e) => setBusinessEditForm({ ...businessEditForm, name: e.target.value })}
                                    placeholder="Business name"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Entity Type</Label>
                                  <select 
                                    value={businessEditForm.entityType}
                                    onChange={(e) => setBusinessEditForm({ ...businessEditForm, entityType: e.target.value })}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                                  >
                                    <option value="llc">LLC</option>
                                    <option value="s_corp">S-Corp</option>
                                    <option value="c_corp">C-Corp</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="sole_proprietor">Sole Proprietor</option>
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Tax ID (EIN)</Label>
                                  <Input 
                                    value={businessEditForm.taxId}
                                    onChange={(e) => setBusinessEditForm({ ...businessEditForm, taxId: e.target.value })}
                                    placeholder="XX-XXXXXXX"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Address</Label>
                                  <Input 
                                    value={businessEditForm.address}
                                    onChange={(e) => setBusinessEditForm({ ...businessEditForm, address: e.target.value })}
                                    placeholder="Business address"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-3">
                                <Button variant="outline" size="sm" onClick={cancelBusinessEdit}>
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={saveBusinessEdit} disabled={updateBusinessMutation.isPending}>
                                  {updateBusinessMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4 mr-1" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Building2 className="w-5 h-5 text-primary" />
                                  <div>
                                    <p className="font-semibold">{business.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Badge variant="outline" className="text-xs">
                                        {business.entityType?.toUpperCase() || 'N/A'}
                                      </Badge>
                                      {business.taxId && <span>TIN: {business.taxId}</span>}
                                      <span>Tax Year: {business.taxYear}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => startEditingBusiness(business)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              {business.address && (
                                <p className="text-sm text-muted-foreground mb-3">{business.address}</p>
                              )}

                              {/* Owners Section */}
                              {business.owners && business.owners.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">Owners ({business.owners.length})</p>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {business.owners.map((owner: any) => (
                                      <div key={owner.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                                        <span>{owner.name}</span>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                          <span>{owner.ownershipPercentage}%</span>
                                          {owner.ssn && <span>SSN: ***-**-{owner.ssn.slice(-4)}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Expenses Section */}
                              {business.expenses && business.expenses.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Receipt className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">Expenses ({business.expenses.length})</p>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {business.expenses.slice(0, 5).map((expense: any) => (
                                      <div key={expense.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                                        <span>{expense.category}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">${parseFloat(expense.amount || 0).toFixed(2)}</span>
                                          {expense.date && <span className="text-muted-foreground">{format(new Date(expense.date), "MMM d, yyyy")}</span>}
                                        </div>
                                      </div>
                                    ))}
                                    {business.expenses.length > 5 && (
                                      <p className="text-xs text-muted-foreground text-center py-1">
                                        +{business.expenses.length - 5} more expenses
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="returns">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tax Returns</CardTitle>
                  <CardDescription>Personal and business returns with status tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  {!returns || returns.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No returns found for this client</p>
                  ) : (
                    <div className="space-y-4">
                      {returns.map((ret: any) => (
                        <div key={ret.id} className="p-4 rounded-lg border bg-card" data-testid={`return-${ret.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={ret.returnType === 'personal' ? 'default' : 'secondary'}>
                                  {ret.returnType === 'personal' ? 'Personal' : 'Business'}
                                </Badge>
                                <span className="font-medium">{ret.name}</span>
                                <span className="text-sm text-muted-foreground">Tax Year {ret.taxYear}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Preparation Status</Label>
                                  <select
                                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                                    value={ret.status || 'not_started'}
                                    onChange={(e) => updateReturnMutation.mutate({ id: ret.id, updates: { status: e.target.value } })}
                                  >
                                    {Object.entries(returnStatusLabels).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Federal Filing Status</Label>
                                  <select
                                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                                    value={ret.federalStatus || 'not_filed'}
                                    onChange={(e) => updateReturnMutation.mutate({ id: ret.id, updates: { federalStatus: e.target.value } })}
                                  >
                                    <option value="not_filed">Not Filed</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="processing">Processing</option>
                                    <option value="approved">Approved</option>
                                    <option value="refund_sent">Refund Sent</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Federal Amount</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      className="h-9"
                                      defaultValue={ret.federalAmount || ''}
                                      onBlur={(e) => {
                                        const val = e.target.value;
                                        if (val !== (ret.federalAmount || '')) {
                                          updateReturnMutation.mutate({ id: ret.id, updates: { federalAmount: val || null } });
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">State Amount</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      className="h-9"
                                      defaultValue={ret.stateAmount || ''}
                                      onBlur={(e) => {
                                        const val = e.target.value;
                                        if (val !== (ret.stateAmount || '')) {
                                          updateReturnMutation.mutate({ id: ret.id, updates: { stateAmount: val || null } });
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dependents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dependents</CardTitle>
                  <CardDescription>Dependent information for this client's tax return</CardDescription>
                </CardHeader>
                <CardContent>
                  {!dependents || dependents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No dependents recorded for this client</p>
                  ) : (
                    <div className="space-y-3">
                      {dependents.map((dep: any) => (
                        <div key={dep.id} className="p-4 rounded-lg border bg-card" data-testid={`dependent-${dep.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{dep.firstName} {dep.lastName}</span>
                                <Badge variant="outline" className="capitalize">
                                  {dep.relationship?.replace(/_/g, " ") || "Unknown"}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">DOB:</span>{" "}
                                  {dep.dateOfBirth ? format(new Date(dep.dateOfBirth), "MMM d, yyyy") : "Not provided"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">SSN (last 4):</span>{" "}
                                  {dep.ssnLastFour || "Not provided"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Months in Home:</span>{" "}
                                  {dep.monthsLivedInHome ?? "Not provided"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Added:</span>{" "}
                                  {dep.createdAt ? format(new Date(dep.createdAt), "MMM d, yyyy") : "N/A"}
                                </div>
                              </div>
                            </div>
                          </div>
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

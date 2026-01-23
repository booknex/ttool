import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  MessageSquare, 
  PenTool, 
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Plus,
  UserPlus,
  Search,
  X,
  Archive,
  Phone,
  Mail
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RETURN_PREP_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "documents_gathering", label: "Gathering Docs" },
  { value: "information_review", label: "Info Review" },
  { value: "return_preparation", label: "Prep" },
  { value: "quality_review", label: "QA Review" },
  { value: "client_review", label: "Client Review" },
  { value: "signature_required", label: "Signatures" },
  { value: "filing", label: "Filing" },
  { value: "filed", label: "Filed" },
];

export default function AdminClients() {
  const [, navigate] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [newClient, setNewClient] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: clients, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

  const filteredClients = clients?.filter((client) => {
    const matchesArchived = showArchived ? client.isArchived : !client.isArchived;
    
    const matchesSearch = searchQuery === "" || 
      (client.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.lastName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (`${client.firstName || ""} ${client.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const clientStatus = client.stats?.returnPrepStatus || "not_started";
    const matchesStatus = statusFilter === "all" || clientStatus === statusFilter;
    
    return matchesArchived && matchesSearch && matchesStatus;
  }) || [];

  const archivedCount = clients?.filter(c => c.isArchived).length || 0;
  const activeCount = clients?.filter(c => !c.isArchived).length || 0;

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof newClient) => {
      return apiRequest("POST", "/api/admin/clients", data);
    },
    onSuccess: () => {
      toast({ title: "Client created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setIsAddDialogOpen(false);
      setNewClient({ email: "", password: "", firstName: "", lastName: "", phone: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create client", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate(newClient);
  };

  const getReturnPrepStatusBadge = (status: string | undefined) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      not_started: { label: "Not Started", className: "bg-gray-100 text-gray-800" },
      documents_gathering: { label: "Gathering Docs", className: "bg-yellow-100 text-yellow-800" },
      information_review: { label: "Info Review", className: "bg-blue-100 text-blue-800" },
      return_preparation: { label: "Prep", className: "bg-purple-100 text-purple-800" },
      quality_review: { label: "QA Review", className: "bg-indigo-100 text-indigo-800" },
      client_review: { label: "Client Review", className: "bg-orange-100 text-orange-800" },
      signature_required: { label: "Signatures", className: "bg-pink-100 text-pink-800" },
      filing: { label: "Filing", className: "bg-cyan-100 text-cyan-800" },
      filed: { label: "Filed", className: "bg-green-100 text-green-800" },
    };
    const config = statusConfig[status || "not_started"] || statusConfig.not_started;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="text-center">Signed</TableHead>
                  <TableHead className="text-center">Messages</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-clients-title">
          Clients
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{clients?.length || 0} Total</Badge>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClient}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={newClient.firstName}
                        onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newClient.lastName}
                        onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Creating..." : "Create Client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {RETURN_PREP_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchived ? `Archived (${archivedCount})` : `Show Archived (${archivedCount})`}
        </Button>
      </div>

      {filteredClients.length === 0 && clients && clients.length > 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {showArchived 
                ? "No archived clients match your search criteria." 
                : "No active clients match your search criteria."}
            </p>
            <Button 
              variant="ghost" 
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      {clients?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No clients yet. Click "Add Client" to create one.</p>
          </CardContent>
        </Card>
      ) : filteredClients.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">Client</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="text-center w-[80px]">Docs</TableHead>
                  <TableHead className="text-center w-[80px]">Signed</TableHead>
                  <TableHead className="text-center w-[100px]">Messages</TableHead>
                  <TableHead className="text-center w-[90px]">Invoices</TableHead>
                  <TableHead className="w-[140px]">Phone</TableHead>
                  <TableHead className="w-[40px]" aria-hidden="true"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/admin/clients/${client.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    data-testid={`row-client-${client.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={client.profileImageUrl} />
                          <AvatarFallback className="text-sm">
                            {client.firstName?.[0] || client.email?.[0]?.toUpperCase() || "C"}
                            {client.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-2">
                            {client.firstName && client.lastName 
                              ? `${client.firstName} ${client.lastName}`
                              : client.email || "Unknown Client"
                            }
                            {client.isArchived && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                                <Archive className="w-3 h-3 mr-1" />
                                Archived
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getReturnPrepStatusBadge(client.stats?.returnPrepStatus)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{client.stats?.documentsCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <PenTool className="w-4 h-4 text-muted-foreground" />
                        <span>{client.stats?.signaturesCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${client.stats?.unreadMessages > 0 ? 'text-orange-600 font-medium' : ''}`}>
                        <MessageSquare className={`w-4 h-4 ${client.stats?.unreadMessages > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <span>
                          {client.stats?.unreadMessages > 0 
                            ? client.stats.unreadMessages
                            : 0
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${client.stats?.pendingInvoices > 0 ? 'text-red-600 font-medium' : ''}`}>
                        <DollarSign className={`w-4 h-4 ${client.stats?.pendingInvoices > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                        <span>
                          {client.stats?.pendingInvoices > 0 
                            ? client.stats.pendingInvoices
                            : 0
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        {client.phone ? (
                          <>
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell aria-hidden="true">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

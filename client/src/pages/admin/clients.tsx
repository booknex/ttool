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
import { useState, useEffect, useMemo } from "react";
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
  ChevronLeft,
  Plus,
  UserPlus,
  Search,
  X,
  Archive,
  Phone,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortField = "name" | "status" | "documents" | "messages" | "invoices";
type SortDirection = "asc" | "desc";

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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminClients() {
  const [, navigate] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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

  const filteredAndSortedClients = useMemo(() => {
    let result = clients?.filter((client) => {
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

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          const nameA = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
          const nameB = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "status":
          const statusA = a.stats?.returnPrepStatus || "not_started";
          const statusB = b.stats?.returnPrepStatus || "not_started";
          comparison = statusA.localeCompare(statusB);
          break;
        case "documents":
          comparison = (a.stats?.documentsCount || 0) - (b.stats?.documentsCount || 0);
          break;
        case "messages":
          comparison = (a.stats?.unreadMessages || 0) - (b.stats?.unreadMessages || 0);
          break;
        case "invoices":
          comparison = (a.stats?.pendingInvoices || 0) - (b.stats?.pendingInvoices || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clients, showArchived, searchQuery, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / pageSize);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

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
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
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
          onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchived ? `Archived (${archivedCount})` : `Show Archived (${archivedCount})`}
        </Button>
      </div>

      {filteredAndSortedClients.length === 0 && clients && clients.length > 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {showArchived 
                ? "No archived clients match your search criteria." 
                : "No active clients match your search criteria."}
            </p>
            <Button 
              variant="ghost" 
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); setCurrentPage(1); }}
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
      ) : paginatedClients.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      Client {getSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("status")}
                    >
                      Status {getSortIcon("status")}
                    </button>
                  </TableHead>
                  <TableHead className="text-center w-[80px]">
                    <button 
                      className="flex items-center justify-center w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("documents")}
                    >
                      Docs {getSortIcon("documents")}
                    </button>
                  </TableHead>
                  <TableHead className="text-center w-[80px]">Signed</TableHead>
                  <TableHead className="text-center w-[100px]">
                    <button 
                      className="flex items-center justify-center w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("messages")}
                    >
                      Messages {getSortIcon("messages")}
                    </button>
                  </TableHead>
                  <TableHead className="text-center w-[90px]">
                    <button 
                      className="flex items-center justify-center w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("invoices")}
                    >
                      Invoices {getSortIcon("invoices")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[140px]">Phone</TableHead>
                  <TableHead className="w-[40px]" aria-hidden="true"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
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

      {filteredAndSortedClients.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedClients.length)} of {filteredAndSortedClients.length} clients
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

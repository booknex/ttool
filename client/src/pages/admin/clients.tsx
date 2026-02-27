import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Search,
  X,
  Archive,
  ArchiveRestore,
  Phone,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  MoreHorizontal,
  LogIn,
  Trash2,
  ExternalLink,
  Package,
  Activity,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";

type SortField = "name" | "services" | "progress" | "actionNeeded" | "lastActivity";
type SortDirection = "asc" | "desc";
type SummaryFilter = "all" | "needsAttention" | "missingDocs" | "readyToFile" | "newThisWeek";

interface ClientStats {
  documentsCount: number;
  documentsUploaded: number;
  documentsRequired: number;
  signaturesCount: number;
  unsignedSignatures: number;
  unreadMessages: number;
  pendingInvoices: number;
  questionnaireProgress: number;
  questionnaireCompleted: boolean;
  refundStatus: string;
  returnPrepStatus: string;
  services: { type: string; status: string }[];
  actionNeeded: number;
  lastActivity: string | null;
}

interface ClientData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  stats: ClientStats;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function SummaryCard({ 
  label, count, icon: Icon, color, active, onClick, description 
}: { 
  label: string; count: number; icon: any; color: string; active: boolean; onClick: () => void; description: string;
}) {
  const colorMap: Record<string, string> = {
    red: active ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:border-red-200 hover:bg-red-50/50',
    amber: active ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-gray-200 hover:border-amber-200 hover:bg-amber-50/50',
    green: active ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/50',
    blue: active ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/50',
  };
  const iconColorMap: Record<string, string> = {
    red: 'text-red-600 bg-red-100',
    amber: 'text-amber-600 bg-amber-100',
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[160px] rounded-xl border p-4 text-left transition-all cursor-pointer ${colorMap[color]}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColorMap[color]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="mt-2 font-semibold text-sm">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

function ProgressBar({ uploaded, required }: { uploaded: number; required: number }) {
  if (required === 0) return <span className="text-xs text-muted-foreground">No docs required</span>;
  const pct = Math.round((uploaded / required) * 100);
  const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{uploaded}/{required}</span>
    </div>
  );
}

function ActionBadges({ stats }: { stats: ClientStats }) {
  if (!stats) return <span className="text-xs text-muted-foreground">-</span>;
  const items: { icon: any; label: string; color: string; count: number }[] = [];
  if ((stats.unreadMessages || 0) > 0) items.push({ icon: MessageSquare, label: 'msg', color: 'text-orange-600 bg-orange-50 border-orange-200', count: stats.unreadMessages });
  if ((stats.pendingInvoices || 0) > 0) items.push({ icon: DollarSign, label: 'inv', color: 'text-red-600 bg-red-50 border-red-200', count: stats.pendingInvoices });
  if ((stats.unsignedSignatures || 0) > 0) items.push({ icon: PenTool, label: 'sig', color: 'text-purple-600 bg-purple-50 border-purple-200', count: stats.unsignedSignatures });
  if ((stats.documentsRequired || 0) > 0 && (stats.documentsUploaded || 0) < stats.documentsRequired) {
    items.push({ icon: FileText, label: 'docs', color: 'text-amber-600 bg-amber-50 border-amber-200', count: stats.documentsRequired - (stats.documentsUploaded || 0) });
  }

  if (items.length === 0) {
    return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> All good</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <span key={i} className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded border ${item.color}`}>
            <Icon className="h-3 w-3" />{item.count}
          </span>
        );
      })}
    </div>
  );
}

function ServiceBadges({ services }: { services: ClientStats['services'] }) {
  if (!services || services.length === 0) {
    return <span className="text-xs text-muted-foreground">No services</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {services.slice(0, 3).map((s, i) => (
        <span key={i} className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 truncate max-w-[120px]">
          {s.type}
        </span>
      ))}
      {services.length > 3 && (
        <span className="text-xs text-muted-foreground">+{services.length - 3}</span>
      )}
    </div>
  );
}

export default function AdminClients() {
  const [, navigate] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>("actionNeeded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [newClient, setNewClient] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: ""
  });
  const [dialogStep, setDialogStep] = useState<'form' | 'assign' | 'return'>('form');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<{ id: string; name: string } | null>(null);
  const [startReturn, setStartReturn] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: clients, isLoading } = useQuery<ClientData[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAddDialogOpen,
  });

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const activeClients = useMemo(() => clients?.filter(c => !c.isArchived) || [], [clients]);
  const archivedCount = useMemo(() => clients?.filter(c => c.isArchived).length || 0, [clients]);

  const summaryStats = useMemo(() => {
    const active = activeClients;
    return {
      needsAttention: active.filter(c => (c.stats?.actionNeeded || 0) > 0).length,
      missingDocs: active.filter(c => (c.stats?.documentsRequired || 0) > 0 && (c.stats?.documentsUploaded || 0) < (c.stats?.documentsRequired || 0)).length,
      readyToFile: active.filter(c => (c.stats?.actionNeeded || 0) === 0 && (c.stats?.services?.length || 0) > 0).length,
      newThisWeek: active.filter(c => new Date(c.createdAt) >= sevenDaysAgo).length,
    };
  }, [activeClients, sevenDaysAgo]);

  const filteredAndSortedClients = useMemo(() => {
    let result = (showArchived ? clients?.filter(c => c.isArchived) : activeClients) || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(q)
      );
    }

    if (!showArchived && summaryFilter !== "all") {
      switch (summaryFilter) {
        case "needsAttention":
          result = result.filter(c => (c.stats?.actionNeeded || 0) > 0);
          break;
        case "missingDocs":
          result = result.filter(c => (c.stats?.documentsRequired || 0) > 0 && (c.stats?.documentsUploaded || 0) < (c.stats?.documentsRequired || 0));
          break;
        case "readyToFile":
          result = result.filter(c => (c.stats?.actionNeeded || 0) === 0 && (c.stats?.services?.length || 0) > 0);
          break;
        case "newThisWeek":
          result = result.filter(c => new Date(c.createdAt) >= sevenDaysAgo);
          break;
      }
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name": {
          const nameA = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
          const nameB = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case "services":
          comparison = (a.stats?.services?.length || 0) - (b.stats?.services?.length || 0);
          break;
        case "progress": {
          const pctA = (a.stats?.documentsRequired || 0) > 0 ? (a.stats?.documentsUploaded || 0) / a.stats.documentsRequired : 0;
          const pctB = (b.stats?.documentsRequired || 0) > 0 ? (b.stats?.documentsUploaded || 0) / b.stats.documentsRequired : 0;
          comparison = pctA - pctB;
          break;
        }
        case "actionNeeded":
          comparison = (a.stats?.actionNeeded || 0) - (b.stats?.actionNeeded || 0);
          break;
        case "lastActivity": {
          const timeA = a.stats?.lastActivity ? new Date(a.stats.lastActivity).getTime() : 0;
          const timeB = b.stats?.lastActivity ? new Date(b.stats.lastActivity).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clients, activeClients, showArchived, searchQuery, summaryFilter, sevenDaysAgo, sortField, sortDirection]);

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
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3.5 h-3.5 ml-1" /> 
      : <ArrowDown className="w-3.5 h-3.5 ml-1" />;
  };

  const toggleSelectClient = (id: string) => {
    const next = new Set(selectedClients);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedClients(next);
  };

  const toggleSelectAll = () => {
    if (selectedClients.size === paginatedClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(paginatedClients.map(c => c.id)));
    }
  };

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof newClient) => {
      const res = await apiRequest("POST", "/api/admin/clients", data);
      return res;
    },
    onSuccess: async (res: any) => {
      const data = typeof res.json === 'function' ? await res.json() : res;
      const clientId = data?.id;
      toast({ title: "Client created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      
      const activeProducts = products?.filter((p: any) => p.isActive) || [];
      if (clientId && activeProducts.length > 0) {
        setCreatedClientId(clientId);
        setDialogStep('assign');
      } else if (clientId) {
        setCreatedClientId(clientId);
        setDialogStep('return');
      } else {
        closeAddDialog();
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create client", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const assignProductsMutation = useMutation({
    mutationFn: async ({ clientId, productIds }: { clientId: string; productIds: string[] }) => {
      await Promise.all(productIds.map(productId =>
        apiRequest("POST", `/api/admin/clients/${clientId}/assign-product`, { productId })
      ));
    },
    onSuccess: () => {
      toast({ title: "Services assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setDialogStep('return');
    },
    onError: (error: any) => {
      toast({ title: "Failed to assign services", description: error.message, variant: "destructive" });
      closeAddDialog();
    },
  });

  const startReturnMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return apiRequest("POST", `/api/admin/clients/${clientId}/start-return`);
    },
    onSuccess: () => {
      toast({ title: "Tax return started" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      closeAddDialog();
    },
    onError: (error: any) => {
      toast({ title: "Failed to start return", description: error.message, variant: "destructive" });
      closeAddDialog();
    },
  });

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    setNewClient({ email: "", password: "", firstName: "", lastName: "", phone: "" });
    setDialogStep('form');
    setCreatedClientId(null);
    setSelectedProducts(new Set());
    setStartReturn(true);
  };

  const archiveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'archive' | 'unarchive' }) => {
      return apiRequest("POST", `/api/admin/clients/${id}/${action}`);
    },
    onSuccess: () => {
      toast({ title: "Client updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setSelectedClients(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/clients/${id}/impersonate`);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({ title: "Failed to impersonate", description: error.message, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/clients/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Client permanently deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setDeleteConfirmClient(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete client", description: error.message, variant: "destructive" });
      setDeleteConfirmClient(null);
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("POST", `/api/admin/clients/${id}/archive`)));
    },
    onSuccess: () => {
      toast({ title: `${selectedClients.size} client(s) archived` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setSelectedClients(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Bulk action failed", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate(newClient);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeClients.length} active client{activeClients.length !== 1 ? 's' : ''}
            {archivedCount > 0 && ` · ${archivedCount} archived`}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) closeAddDialog(); else setIsAddDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            {dialogStep === 'form' ? (
              <>
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
                    <Button type="button" variant="outline" onClick={closeAddDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createClientMutation.isPending}>
                      {createClientMutation.isPending ? "Creating..." : "Create Client"}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : dialogStep === 'assign' ? (
              <>
                <DialogHeader>
                  <DialogTitle>Assign Services (Optional)</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select services to assign to the new client. You can also do this later.
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {products?.filter((p: any) => p.isActive).map((product: any) => (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProducts.has(product.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => {
                            const next = new Set(selectedProducts);
                            if (next.has(product.id)) next.delete(product.id); else next.add(product.id);
                            setSelectedProducts(next);
                          }}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[250px]">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogStep('return')}>
                    Skip
                  </Button>
                  <Button
                    disabled={selectedProducts.size === 0 || assignProductsMutation.isPending}
                    onClick={() => {
                      if (createdClientId) {
                        assignProductsMutation.mutate({
                          clientId: createdClientId,
                          productIds: Array.from(selectedProducts),
                        });
                      }
                    }}
                  >
                    {assignProductsMutation.isPending ? "Assigning..." : `Assign ${selectedProducts.size} Service${selectedProducts.size !== 1 ? 's' : ''}`}
                  </Button>
                </DialogFooter>
              </>
            ) : dialogStep === 'return' ? (
              <>
                <DialogHeader>
                  <DialogTitle>Start a Tax Return? (Optional)</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Would you like to start a personal tax return for this client? It will be placed in the "Not Started" stage on the Kanban board.
                  </p>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      startReturn ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Checkbox
                      checked={startReturn}
                      onCheckedChange={(checked) => setStartReturn(!!checked)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Personal Tax Return (2025)</p>
                        <p className="text-xs text-muted-foreground">Creates a return in "Not Started" status</p>
                      </div>
                    </div>
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeAddDialog}>
                    Skip
                  </Button>
                  <Button
                    disabled={!startReturn || startReturnMutation.isPending}
                    onClick={() => {
                      if (createdClientId && startReturn) {
                        startReturnMutation.mutate(createdClientId);
                      }
                    }}
                  >
                    {startReturnMutation.isPending ? "Starting..." : "Start Return"}
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {!showArchived && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Needs Attention"
            count={summaryStats.needsAttention}
            icon={AlertTriangle}
            color="red"
            active={summaryFilter === "needsAttention"}
            onClick={() => { setSummaryFilter(summaryFilter === "needsAttention" ? "all" : "needsAttention"); setCurrentPage(1); }}
            description="Unread messages, unpaid invoices, or missing signatures"
          />
          <SummaryCard
            label="Missing Documents"
            count={summaryStats.missingDocs}
            icon={FileText}
            color="amber"
            active={summaryFilter === "missingDocs"}
            onClick={() => { setSummaryFilter(summaryFilter === "missingDocs" ? "all" : "missingDocs"); setCurrentPage(1); }}
            description="Still need to upload required documents"
          />
          <SummaryCard
            label="Ready to File"
            count={summaryStats.readyToFile}
            icon={CheckCircle2}
            color="green"
            active={summaryFilter === "readyToFile"}
            onClick={() => { setSummaryFilter(summaryFilter === "readyToFile" ? "all" : "readyToFile"); setCurrentPage(1); }}
            description="All items complete, no actions pending"
          />
          <SummaryCard
            label="New This Week"
            count={summaryStats.newThisWeek}
            icon={Sparkles}
            color="blue"
            active={summaryFilter === "newThisWeek"}
            onClick={() => { setSummaryFilter(summaryFilter === "newThisWeek" ? "all" : "newThisWeek"); setCurrentPage(1); }}
            description="Signed up in the last 7 days"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
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
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowArchived(!showArchived); setSummaryFilter("all"); setCurrentPage(1); setSelectedClients(new Set()); }}
            className="gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? `Archived (${archivedCount})` : `Archived (${archivedCount})`}
          </Button>
          {summaryFilter !== "all" && !showArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSummaryFilter("all"); setCurrentPage(1); }}
              className="gap-1 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Clear filter
            </Button>
          )}
        </div>
      </div>

      {selectedClients.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-blue-800">{selectedClients.size} selected</span>
          <div className="flex-1" />
          {!showArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkArchiveMutation.mutate(Array.from(selectedClients))}
              disabled={bulkArchiveMutation.isPending}
              className="gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive Selected
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedClients(new Set())} className="text-muted-foreground">
            Cancel
          </Button>
        </div>
      )}

      {filteredAndSortedClients.length === 0 && clients && clients.length > 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {showArchived ? "No archived clients found." : "No clients match your current filters."}
            </p>
            <Button 
              variant="ghost" 
              onClick={() => { setSearchQuery(""); setSummaryFilter("all"); setCurrentPage(1); }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : clients?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No clients yet. Click "Add Client" to get started.</p>
          </CardContent>
        </Card>
      ) : paginatedClients.length > 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[40px] px-3">
                    <Checkbox
                      checked={selectedClients.size === paginatedClients.length && paginatedClients.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[240px]">
                    <button 
                      className="flex items-center text-xs font-semibold uppercase tracking-wider hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      Client {getSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[180px]">
                    <button 
                      className="flex items-center text-xs font-semibold uppercase tracking-wider hover:text-foreground"
                      onClick={() => handleSort("services")}
                    >
                      Services {getSortIcon("services")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <button 
                      className="flex items-center text-xs font-semibold uppercase tracking-wider hover:text-foreground"
                      onClick={() => handleSort("progress")}
                    >
                      Doc Progress {getSortIcon("progress")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[180px]">
                    <button 
                      className="flex items-center text-xs font-semibold uppercase tracking-wider hover:text-foreground"
                      onClick={() => handleSort("actionNeeded")}
                    >
                      Action Needed {getSortIcon("actionNeeded")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <button 
                      className="flex items-center text-xs font-semibold uppercase tracking-wider hover:text-foreground"
                      onClick={() => handleSort("lastActivity")}
                    >
                      Last Active {getSortIcon("lastActivity")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-muted/40 group"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => toggleSelectClient(client.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs bg-gray-100">
                            {client.firstName?.[0] || client.email?.[0]?.toUpperCase() || "C"}
                            {client.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-1.5">
                            {client.firstName && client.lastName 
                              ? `${client.firstName} ${client.lastName}`
                              : client.email || "Unknown"
                            }
                            {client.isArchived && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-500 text-[10px] px-1 py-0">Archived</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{client.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ServiceBadges services={client.stats?.services} />
                    </TableCell>
                    <TableCell>
                      <ProgressBar uploaded={client.stats?.documentsUploaded || 0} required={client.stats?.documentsRequired || 0} />
                    </TableCell>
                    <TableCell>
                      <ActionBadges stats={client.stats} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {client.stats?.lastActivity 
                          ? formatDistanceToNow(new Date(client.stats.lastActivity), { addSuffix: true })
                          : "No activity"
                        }
                      </span>
                    </TableCell>
                    <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}`)}>
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/messages?client=${client.id}`)}>
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => impersonateMutation.mutate(client.id)}>
                            <LogIn className="h-3.5 w-3.5 mr-2" />Log in as Client
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {client.isArchived ? (
                            <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: client.id, action: 'unarchive' })}>
                              <ArchiveRestore className="h-3.5 w-3.5 mr-2" />Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: client.id, action: 'archive' })} className="text-red-600">
                              <Archive className="h-3.5 w-3.5 mr-2" />Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onSelect={() => {
                              setDeleteConfirmClient({
                                id: client.id,
                                name: client.firstName ? `${client.firstName} ${client.lastName}` : client.email
                              });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          <span className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredAndSortedClients.length)} of {filteredAndSortedClients.length}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[65px] h-8 text-xs">
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
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                <ChevronLeft className="w-3.5 h-3.5" /><ChevronLeft className="w-3.5 h-3.5 -ml-2.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-3 text-xs font-medium">
                {currentPage} / {totalPages || 1}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>
                <ChevronRight className="w-3.5 h-3.5" /><ChevronRight className="w-3.5 h-3.5 -ml-2.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!deleteConfirmClient} onOpenChange={(open) => { if (!open) setDeleteConfirmClient(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Client Permanently</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteConfirmClient?.name}</strong>? This will remove ALL their data including documents, messages, invoices, returns, and services. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmClient(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteClientMutation.isPending}
              onClick={() => {
                if (deleteConfirmClient) {
                  deleteClientMutation.mutate(deleteConfirmClient.id);
                }
              }}
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

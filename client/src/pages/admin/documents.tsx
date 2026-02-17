import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  Clock,
  Search,
  Archive,
  Download,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileWarning,
  Files,
  Folder,
  FolderOpen,
  ArrowLeft,
  FileImage,
  FileSpreadsheet,
  File,
  LayoutGrid,
  List,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";

type SortField = "clientName" | "documentType" | "status" | "uploadedAt" | "fileSize";
type SortDirection = "asc" | "desc";
type ViewMode = "folders" | "client";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface ClientFolder {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isArchived: boolean;
  docCount: number;
  pending: number;
  processing: number;
  verified: number;
  rejected: number;
  lastUpload: string | null;
}

export default function AdminDocuments() {
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("grid");
  
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/documents"],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/documents/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Document status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update document", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const promises = ids.map((id) =>
        apiRequest("PATCH", `/api/admin/documents/${id}`, { status })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelectedIds(new Set());
      toast({ title: `Updated ${selectedIds.size} documents` });
    },
    onError: () => {
      toast({ title: "Failed to update some documents", variant: "destructive" });
    },
  });

  const clientFolders = useMemo(() => {
    const folderMap = new Map<string, ClientFolder>();
    
    const clientList = clients.filter((c: any) => c.role === "client" || !c.role);
    clientList.forEach((c: any) => {
      if (!showArchived && c.isArchived) return;
      folderMap.set(c.id, {
        id: c.id,
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        email: c.email || "",
        isArchived: c.isArchived || false,
        docCount: 0,
        pending: 0,
        processing: 0,
        verified: 0,
        rejected: 0,
        lastUpload: null,
      });
    });

    documents.forEach((doc: any) => {
      if (!showArchived && doc.clientIsArchived) return;
      const folder = folderMap.get(String(doc.userId));
      if (folder) {
        folder.docCount++;
        if (doc.status === "pending") folder.pending++;
        else if (doc.status === "processing") folder.processing++;
        else if (doc.status === "verified") folder.verified++;
        else if (doc.status === "rejected") folder.rejected++;
        if (!folder.lastUpload || new Date(doc.uploadedAt) > new Date(folder.lastUpload)) {
          folder.lastUpload = doc.uploadedAt;
        }
      }
    });

    let folders = Array.from(folderMap.values()).filter(f => f.docCount > 0);

    if (folderSearch) {
      const search = folderSearch.toLowerCase();
      folders = folders.filter(f =>
        `${f.firstName} ${f.lastName}`.toLowerCase().includes(search) ||
        f.email.toLowerCase().includes(search)
      );
    }

    folders.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return folders;
  }, [clients, documents, folderSearch, showArchived]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c: any) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const clientDocuments = useMemo(() => {
    if (!selectedClientId) return [];
    let result = documents.filter((doc: any) => String(doc.userId) === selectedClientId);

    if (docSearch) {
      const search = docSearch.toLowerCase();
      result = result.filter((doc: any) =>
        doc.originalName?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((doc: any) => doc.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((doc: any) => doc.documentType === typeFilter);
    }

    result.sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "uploadedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortField === "fileSize") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, selectedClientId, docSearch, statusFilter, typeFilter, sortField, sortDirection]);

  const documentTypes = useMemo(() => {
    const docs = selectedClientId
      ? documents.filter((d: any) => String(d.userId) === selectedClientId)
      : documents;
    const types = new Set(docs.map((d: any) => d.documentType));
    return Array.from(types).sort();
  }, [documents, selectedClientId]);

  const totalPages = Math.ceil(clientDocuments.length / itemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedDocuments = clientDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const globalStats = useMemo(() => {
    const all = showArchived ? documents : documents.filter((d: any) => !d.clientIsArchived);
    return {
      total: all.length,
      pending: all.filter((d: any) => d.status === "pending").length,
      processing: all.filter((d: any) => d.status === "processing").length,
      verified: all.filter((d: any) => d.status === "verified").length,
      rejected: all.filter((d: any) => d.status === "rejected").length,
      archived: documents.filter((d: any) => d.clientIsArchived).length,
    };
  }, [documents, showArchived]);

  const openFolder = (clientId: string) => {
    setSelectedClientId(clientId);
    setViewMode("client");
    setDocSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const goBack = () => {
    setViewMode("folders");
    setSelectedClientId(null);
    setSelectedIds(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ChevronUp className="w-4 h-4 ml-1" />
      : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedDocuments.map((d: any) => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "processing":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      w2: "W-2",
      "1099_nec": "1099-NEC",
      "1099_int": "1099-INT",
      "1099_div": "1099-DIV",
      "1099_k": "1099-K",
      "1099_b": "1099-B",
      k1: "K-1",
      mortgage_interest: "1098 (Mortgage)",
      property_tax: "Property Tax",
      charitable_donation: "Charitable Donation",
      medical_expense: "Medical Expense",
      form_8879: "Form 8879",
      engagement_letter: "Engagement Letter",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getFileIcon = (name: string) => {
    const ext = name?.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "")) {
      return <FileImage className="w-5 h-5 text-purple-500" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext || "")) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    }
    if (["pdf"].includes(ext || "")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <File className="w-5 h-5 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getClientName = (client: any) => {
    if (client?.firstName || client?.lastName) {
      return `${client.firstName || ""} ${client.lastName || ""}`.trim();
    }
    return client?.email || "Client";
  };

  const getInitials = (firstName: string, lastName: string, email: string) => {
    if (firstName || lastName) {
      return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    }
    return email?.[0]?.toUpperCase() || "C";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {viewMode === "client" && (
            <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-documents-title">
              {viewMode === "client" && selectedClient
                ? getClientName(selectedClient)
                : "Documents"
              }
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {viewMode === "client" ? (
                <>
                  <button onClick={goBack} className="hover:text-foreground transition-colors">
                    All Clients
                  </button>
                  <ChevronRight className="w-3 h-3" />
                  <span>{getClientName(selectedClient)}</span>
                  <span>({clientDocuments.length} files)</span>
                </>
              ) : (
                <span>{clientFolders.length} clients with documents</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Files className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{globalStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { if (viewMode === "client") { setStatusFilter(statusFilter === "pending" ? "all" : "pending"); setCurrentPage(1); } }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{globalStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { if (viewMode === "client") { setStatusFilter(statusFilter === "processing" ? "all" : "processing"); setCurrentPage(1); } }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <FileWarning className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{globalStats.processing}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { if (viewMode === "client") { setStatusFilter(statusFilter === "verified" ? "all" : "verified"); setCurrentPage(1); } }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{globalStats.verified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { if (viewMode === "client") { setStatusFilter(statusFilter === "rejected" ? "all" : "rejected"); setCurrentPage(1); } }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{globalStats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowArchived(!showArchived)}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${showArchived ? 'bg-purple-100' : 'bg-gray-100'} flex items-center justify-center shrink-0`}>
              <Archive className={`w-4 h-4 ${showArchived ? 'text-purple-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-xl font-bold">{globalStats.archived}</p>
              <p className="text-xs text-muted-foreground">Archived</p>
            </div>
          </div>
        </Card>
      </div>

      {viewMode === "folders" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center border rounded-lg">
              <Button
                variant={folderViewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setFolderViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={folderViewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setFolderViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {clientFolders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Folder className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {folderSearch ? "No clients match your search." : "No clients with documents yet."}
                </p>
              </CardContent>
            </Card>
          ) : folderViewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {clientFolders.map((folder) => {
                const progress = folder.docCount > 0 
                  ? Math.round((folder.verified / folder.docCount) * 100) 
                  : 0;
                return (
                  <Card
                    key={folder.id}
                    className="cursor-pointer hover:bg-muted/30 hover:shadow-md transition-all group"
                    onClick={() => openFolder(folder.id)}
                    data-testid={`folder-${folder.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                          <FolderOpen className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">
                            {folder.firstName || folder.lastName 
                              ? `${folder.firstName} ${folder.lastName}`.trim()
                              : folder.email
                            }
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{folder.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{folder.docCount} files</span>
                          <span className="font-medium">{progress}% verified</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {folder.pending > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {folder.pending} pending
                            </span>
                          )}
                          {folder.processing > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              {folder.processing} processing
                            </span>
                          )}
                          {folder.rejected > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                              {folder.rejected} rejected
                            </span>
                          )}
                        </div>
                      </div>
                      {folder.isArchived && (
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Files</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Processing</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Upload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientFolders.map((folder) => {
                    const progress = folder.docCount > 0 
                      ? Math.round((folder.verified / folder.docCount) * 100) 
                      : 0;
                    return (
                      <TableRow
                        key={folder.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openFolder(folder.id)}
                        data-testid={`folder-row-${folder.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FolderOpen className="w-5 h-5 text-amber-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {folder.firstName || folder.lastName 
                                  ? `${folder.firstName} ${folder.lastName}`.trim()
                                  : folder.email
                                }
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{folder.email}</p>
                            </div>
                            {folder.isArchived && (
                              <Badge variant="outline" className="text-[10px] shrink-0">Archived</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{folder.docCount}</TableCell>
                        <TableCell className="text-center">
                          {folder.pending > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{folder.pending}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {folder.processing > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{folder.processing}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {folder.verified > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium">{folder.verified}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {folder.rejected > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-medium">{folder.rejected}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={progress} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {folder.lastUpload ? format(new Date(folder.lastUpload), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={docSearch}
                  onChange={(e) => {
                    setDocSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getDocumentTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(docSearch || statusFilter !== "all" || typeFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setDocSearch(""); setStatusFilter("all"); setTypeFilter("all"); setCurrentPage(1); }} className="gap-1">
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: "verified" })}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: "processing" })}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Processing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: "rejected" })}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto"
                >
                  Clear selection
                </Button>
              </div>
            )}

            {clientDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {docSearch || statusFilter !== "all" || typeFilter !== "all"
                    ? "No files match your filters."
                    : "No documents uploaded by this client yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === paginatedDocuments.length && paginatedDocuments.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>
                          <button
                            className="flex items-center font-medium hover:text-foreground transition-colors"
                            onClick={() => handleSort("documentType")}
                          >
                            Type
                            {getSortIcon("documentType")}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center font-medium hover:text-foreground transition-colors"
                            onClick={() => handleSort("status")}
                          >
                            Status
                            {getSortIcon("status")}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center font-medium hover:text-foreground transition-colors"
                            onClick={() => handleSort("uploadedAt")}
                          >
                            Uploaded
                            {getSortIcon("uploadedAt")}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center font-medium hover:text-foreground transition-colors"
                            onClick={() => handleSort("fileSize")}
                          >
                            Size
                            {getSortIcon("fileSize")}
                          </button>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDocuments.map((doc: any) => (
                        <TableRow key={doc.id} className={selectedIds.has(doc.id) ? "bg-blue-50" : ""} data-testid={`doc-${doc.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(doc.id)}
                              onCheckedChange={() => toggleSelect(doc.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getFileIcon(doc.originalName)}
                              <span className="truncate max-w-[250px] font-medium text-sm" title={doc.originalName}>
                                {doc.originalName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs">
                              {getDocumentTypeLabel(doc.documentType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={doc.status}
                              onValueChange={(status) => updateDocumentMutation.mutate({ id: doc.id, status })}
                              disabled={updateDocumentMutation.isPending}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {doc.uploadedAt ? format(new Date(doc.uploadedAt), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatFileSize(doc.fileSize)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/api/documents/${doc.id}/file`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/api/documents/${doc.id}/file?download=true`}
                                    download
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => updateDocumentMutation.mutate({ id: doc.id, status: "verified" })}
                                  disabled={doc.status === "verified"}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                  Mark Verified
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateDocumentMutation.mutate({ id: doc.id, status: "rejected" })}
                                  disabled={doc.status === "rejected"}
                                >
                                  <XCircle className="w-4 h-4 mr-2 text-red-500" />
                                  Mark Rejected
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>of {clientDocuments.length} files</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <ChevronLeft className="w-4 h-4 -ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="w-4 h-4" />
                      <ChevronRight className="w-4 h-4 -ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

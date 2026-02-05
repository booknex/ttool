import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Filter,
  X,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileWarning,
  Files,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";

type SortField = "clientName" | "documentType" | "status" | "uploadedAt" | "fileSize";
type SortDirection = "asc" | "desc";

interface DocumentFilters {
  search: string;
  status: string;
  documentType: string;
  clientId: string;
  showArchived: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function AdminDocuments() {
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<DocumentFilters>({
    search: "",
    status: "all",
    documentType: "all",
    clientId: "all",
    showArchived: false,
  });
  
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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

  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    if (!filters.showArchived) {
      result = result.filter((doc) => !doc.clientIsArchived);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.originalName?.toLowerCase().includes(search) ||
          doc.clientName?.toLowerCase().includes(search)
      );
    }

    if (filters.status !== "all") {
      result = result.filter((doc) => doc.status === filters.status);
    }

    if (filters.documentType !== "all") {
      result = result.filter((doc) => doc.documentType === filters.documentType);
    }

    if (filters.clientId !== "all") {
      result = result.filter((doc) => String(doc.userId) === filters.clientId);
    }

    result.sort((a, b) => {
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
  }, [documents, filters, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedDocuments.length / itemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedDocuments = filteredAndSortedDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const all = filters.showArchived ? documents : documents.filter((d) => !d.clientIsArchived);
    return {
      total: all.length,
      pending: all.filter((d) => d.status === "pending").length,
      processing: all.filter((d) => d.status === "processing").length,
      verified: all.filter((d) => d.status === "verified").length,
      rejected: all.filter((d) => d.status === "rejected").length,
      archived: documents.filter((d) => d.clientIsArchived).length,
    };
  }, [documents, filters.showArchived]);

  const documentTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.documentType));
    return Array.from(types).sort();
  }, [documents]);

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
      setSelectedIds(new Set(paginatedDocuments.map((d) => d.id)));
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

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      documentType: "all",
      clientId: "all",
      showArchived: false,
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    filters.search || 
    filters.status !== "all" || 
    filters.documentType !== "all" || 
    filters.clientId !== "all" ||
    filters.showArchived;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-admin-documents-title">
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all client document uploads
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Files className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFilters({...filters, status: filters.status === "pending" ? "all" : "pending"}); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFilters({...filters, status: filters.status === "processing" ? "all" : "processing"}); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileWarning className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFilters({...filters, status: filters.status === "verified" ? "all" : "verified"}); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.verified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFilters({...filters, status: filters.status === "rejected" ? "all" : "rejected"}); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFilters({...filters, showArchived: !filters.showArchived}); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${filters.showArchived ? 'bg-purple-100' : 'bg-gray-100'} flex items-center justify-center`}>
              <Archive className={`w-5 h-5 ${filters.showArchived ? 'text-purple-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.archived}</p>
              <p className="text-xs text-muted-foreground">Archived</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name or filename..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
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
                value={filters.documentType}
                onValueChange={(value) => {
                  setFilters({ ...filters, documentType: value });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Document Type" />
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

              <Select
                value={filters.clientId}
                onValueChange={(value) => {
                  setFilters({ ...filters, clientId: value });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients
                    .filter((c: any) => c.role === "client")
                    .sort((a: any, b: any) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
                    .map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.lastName}, {client.firstName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
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

          {filteredAndSortedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? "No documents match your filters."
                  : "No documents uploaded yet."}
              </p>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
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
                      <TableHead>
                        <button
                          className="flex items-center font-medium hover:text-foreground transition-colors"
                          onClick={() => handleSort("clientName")}
                        >
                          Client
                          {getSortIcon("clientName")}
                        </button>
                      </TableHead>
                      <TableHead>Document</TableHead>
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
                    {paginatedDocuments.map((doc) => (
                      <TableRow key={doc.id} className={selectedIds.has(doc.id) ? "bg-blue-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(doc.id)}
                            onCheckedChange={() => toggleSelect(doc.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{doc.clientName}</span>
                            {doc.clientIsArchived && (
                              <Badge variant="outline" className="text-xs">
                                <Archive className="w-3 h-3 mr-1" />
                                Archived
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]" title={doc.originalName}>
                              {doc.originalName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
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
                        <TableCell className="text-muted-foreground">
                          {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                  <span>of {filteredAndSortedDocuments.length} documents</span>
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
    </div>
  );
}

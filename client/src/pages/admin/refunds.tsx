import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  TrendingUp, 
  Edit2, 
  Archive, 
  Search, 
  X, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";
import { format } from "date-fns";

type SortField = "client" | "federalStatus" | "federalAmount" | "stateStatus" | "stateAmount" | "updatedAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const refundStatuses = [
  { value: "not_filed", label: "Not Filed" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "processing", label: "Processing" },
  { value: "approved", label: "Approved" },
  { value: "refund_sent", label: "Refund Sent" },
  { value: "completed", label: "Completed" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...refundStatuses,
];

export default function AdminRefunds() {
  const { toast } = useToast();
  const [editingRefund, setEditingRefund] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [formData, setFormData] = useState({
    federalStatus: "",
    federalAmount: "",
    stateStatus: "",
    stateAmount: "",
  });

  const { data: refunds, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/refunds"],
  });

  const filteredAndSortedRefunds = useMemo(() => {
    let result = refunds?.filter((ref) => {
      const matchesArchived = showArchived ? ref.clientIsArchived : !ref.clientIsArchived;
      const matchesSearch = searchQuery === "" ||
        ref.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
        ref.federalStatus === statusFilter || 
        ref.stateStatus === statusFilter;
      return matchesArchived && matchesSearch && matchesStatus;
    }) || [];

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "client":
          comparison = (a.clientName || "").localeCompare(b.clientName || "");
          break;
        case "federalStatus":
          comparison = (a.federalStatus || "").localeCompare(b.federalStatus || "");
          break;
        case "federalAmount":
          comparison = Number(a.federalAmount || 0) - Number(b.federalAmount || 0);
          break;
        case "stateStatus":
          comparison = (a.stateStatus || "").localeCompare(b.stateStatus || "");
          break;
        case "stateAmount":
          comparison = Number(a.stateAmount || 0) - Number(b.stateAmount || 0);
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [refunds, showArchived, searchQuery, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedRefunds.length / pageSize);
  const paginatedRefunds = filteredAndSortedRefunds.slice(
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

  const stats = useMemo(() => {
    const all = refunds?.filter(r => showArchived ? r.clientIsArchived : !r.clientIsArchived) || [];
    const completed = all.filter(r => r.federalStatus === "completed" || r.stateStatus === "completed").length;
    const inProgress = all.filter(r => 
      ["submitted", "accepted", "processing", "approved", "refund_sent"].includes(r.federalStatus) ||
      ["submitted", "accepted", "processing", "approved", "refund_sent"].includes(r.stateStatus)
    ).length;
    const notFiled = all.filter(r => 
      (r.federalStatus === "not_filed" || !r.federalStatus) && 
      (r.stateStatus === "not_filed" || !r.stateStatus)
    ).length;
    const totalFederal = all.reduce((sum, r) => sum + Number(r.federalAmount || 0), 0);
    const totalState = all.reduce((sum, r) => sum + Number(r.stateAmount || 0), 0);
    return { total: all.length, completed, inProgress, notFiled, totalFederal, totalState };
  }, [refunds, showArchived]);

  const archivedCount = refunds?.filter(r => r.clientIsArchived).length || 0;

  const updateRefundMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      return apiRequest("PATCH", `/api/admin/refunds/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
      setEditingRefund(null);
      toast({ title: "Refund status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update refund", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "refund_sent":
        return <Badge variant="default" className="bg-blue-500">Refund Sent</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-emerald-500">Approved</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "accepted":
        return <Badge variant="secondary">Accepted</Badge>;
      case "submitted":
        return <Badge variant="outline">Submitted</Badge>;
      default:
        return <Badge variant="outline">Not Filed</Badge>;
    }
  };

  const openEditDialog = (refund: any) => {
    setEditingRefund(refund);
    setFormData({
      federalStatus: refund.federalStatus || "not_filed",
      federalAmount: refund.federalAmount || "",
      stateStatus: refund.stateStatus || "not_filed",
      stateAmount: refund.stateAmount || "",
    });
  };

  const handleUpdate = () => {
    updateRefundMutation.mutate({
      userId: editingRefund.userId,
      data: formData,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Refund Tracking</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-refunds-title">
          Refund Tracking
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? `Archived (${archivedCount})` : `Show Archived (${archivedCount})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "completed" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("completed"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "processing" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("processing"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">
                  ${(stats.totalFederal + stats.totalState).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Refunds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name or email..."
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
            {STATUS_FILTER_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(searchQuery || statusFilter !== "all") && (
          <Button variant="ghost" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setCurrentPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {filteredAndSortedRefunds.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No refund data from archived clients." : "No refund data matches your criteria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("client")}
                    >
                      Client {getSortIcon("client")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("federalStatus")}
                    >
                      Federal Status {getSortIcon("federalStatus")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      className="flex items-center justify-end w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("federalAmount")}
                    >
                      Federal Amount {getSortIcon("federalAmount")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("stateStatus")}
                    >
                      State Status {getSortIcon("stateStatus")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      className="flex items-center justify-end w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("stateAmount")}
                    >
                      State Amount {getSortIcon("stateAmount")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("updatedAt")}
                    >
                      Updated {getSortIcon("updatedAt")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRefunds.map((refund) => (
                  <TableRow key={refund.id} data-testid={`row-refund-${refund.id}`}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{refund.clientName}</span>
                          {refund.clientIsArchived && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{refund.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.federalStatus)}</TableCell>
                    <TableCell className="text-right">
                      {refund.federalAmount ? (
                        <span className="font-semibold text-green-600">
                          ${Number(refund.federalAmount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.stateStatus)}</TableCell>
                    <TableCell className="text-right">
                      {refund.stateAmount ? (
                        <span className="font-semibold text-green-600">
                          ${Number(refund.stateAmount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(refund.updatedAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(refund)}
                        data-testid={`button-edit-refund-${refund.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedRefunds.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedRefunds.length)} of {filteredAndSortedRefunds.length} clients
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

      <Dialog open={!!editingRefund} onOpenChange={() => setEditingRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Refund Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Federal Status</Label>
                <Select 
                  value={formData.federalStatus} 
                  onValueChange={(v) => setFormData({ ...formData, federalStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {refundStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Federal Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.federalAmount}
                  onChange={(e) => setFormData({ ...formData, federalAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>State Status</Label>
                <Select 
                  value={formData.stateStatus} 
                  onValueChange={(v) => setFormData({ ...formData, stateStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {refundStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.stateAmount}
                  onChange={(e) => setFormData({ ...formData, stateAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingRefund(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateRefundMutation.isPending}
                data-testid="button-save-refund"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ListChecks,
  User,
  RefreshCw,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  FileText,
} from "lucide-react";

type ReturnStatusData = {
  id: string;
  userId: string;
  returnPrepStatus: string | null;
  federalStatus: string | null;
  stateStatus: string | null;
  clientName: string;
  clientEmail: string;
};

type SortField = "client" | "status";
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const RETURN_PREP_STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-gray-100 text-gray-800" },
  { value: "documents_gathering", label: "Gathering Docs", color: "bg-yellow-100 text-yellow-800" },
  { value: "information_review", label: "Info Review", color: "bg-blue-100 text-blue-800" },
  { value: "return_preparation", label: "Prep", color: "bg-purple-100 text-purple-800" },
  { value: "quality_review", label: "QA Review", color: "bg-indigo-100 text-indigo-800" },
  { value: "client_review", label: "Client Review", color: "bg-orange-100 text-orange-800" },
  { value: "signature_required", label: "Signatures", color: "bg-pink-100 text-pink-800" },
  { value: "filing", label: "Filing", color: "bg-cyan-100 text-cyan-800" },
  { value: "filed", label: "Filed", color: "bg-green-100 text-green-800" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...RETURN_PREP_STATUSES,
];

function getStatusConfig(status: string | null) {
  return RETURN_PREP_STATUSES.find((s) => s.value === status) || RETURN_PREP_STATUSES[0];
}

export default function AdminReturnStatuses() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("client");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: refunds, isLoading } = useQuery<ReturnStatusData[]>({
    queryKey: ["/api/admin/refunds"],
  });

  const filteredAndSortedData = useMemo(() => {
    let result = refunds?.filter((client) => {
      const matchesSearch = searchQuery === "" ||
        client.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase());
      const clientStatus = client.returnPrepStatus || "not_started";
      const matchesStatus = statusFilter === "all" || clientStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "client":
          comparison = (a.clientName || "").localeCompare(b.clientName || "");
          break;
        case "status":
          const statusA = a.returnPrepStatus || "not_started";
          const statusB = b.returnPrepStatus || "not_started";
          comparison = statusA.localeCompare(statusB);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [refunds, searchQuery, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const paginatedData = filteredAndSortedData.slice(
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
    const all = refunds || [];
    return {
      total: all.length,
      notStarted: all.filter(c => !c.returnPrepStatus || c.returnPrepStatus === "not_started").length,
      inProgress: all.filter(c => c.returnPrepStatus && !["not_started", "filed"].includes(c.returnPrepStatus)).length,
      filed: all.filter(c => c.returnPrepStatus === "filed").length,
    };
  }, [refunds]);

  const updateMutation = useMutation({
    mutationFn: async ({ userId, returnPrepStatus }: { userId: string; returnPrepStatus: string }) => {
      return apiRequest("PATCH", `/api/admin/refunds/${userId}`, { returnPrepStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
      toast({
        title: "Status Updated",
        description: "Return preparation status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (userId: string, newStatus: string) => {
    updateMutation.mutate({ userId, returnPrepStatus: newStatus });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Return Statuses</h1>
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
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ListChecks className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-admin-return-statuses-title">
            Return Statuses
          </h1>
          <p className="text-muted-foreground">
            Manage client tax return preparation statuses
          </p>
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
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "not_started" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("not_started"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.notStarted}</p>
                <p className="text-sm text-muted-foreground">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => { setStatusFilter("return_preparation"); setCurrentPage(1); }}
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
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "filed" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("filed"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.filed}</p>
                <p className="text-sm text-muted-foreground">Filed</p>
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

      {filteredAndSortedData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No clients match your criteria.</p>
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
                      onClick={() => handleSort("status")}
                    >
                      Current Status {getSortIcon("status")}
                    </button>
                  </TableHead>
                  <TableHead>Update Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((client) => {
                  const statusConfig = getStatusConfig(client.returnPrepStatus);
                  return (
                    <TableRow key={client.userId} data-testid={`row-client-${client.userId}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-client-name-${client.userId}`}>
                            {client.clientName || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {client.clientEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={client.returnPrepStatus || "not_started"}
                            onValueChange={(value) => handleStatusChange(client.userId, value)}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="w-48" data-testid={`select-status-${client.userId}`}>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {RETURN_PREP_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {updateMutation.isPending && (
                            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedData.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} clients
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

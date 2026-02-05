import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { 
  PenTool, 
  CheckCircle, 
  Archive, 
  Search, 
  X, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { format } from "date-fns";

type SortField = "client" | "documentType" | "taxYear" | "signedAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "engagement_letter", label: "Engagement Letter" },
  { value: "form_8879", label: "Form 8879" },
];

export default function AdminSignatures() {
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("signedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  const { data: signatures, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/signatures"],
  });

  const filteredAndSortedSignatures = useMemo(() => {
    let result = signatures?.filter((sig) => {
      const matchesArchived = showArchived ? sig.clientIsArchived : !sig.clientIsArchived;
      const matchesSearch = searchQuery === "" ||
        sig.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sig.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDocType = documentTypeFilter === "all" || sig.documentType === documentTypeFilter;
      return matchesArchived && matchesSearch && matchesDocType;
    }) || [];

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "client":
          comparison = (a.clientName || "").localeCompare(b.clientName || "");
          break;
        case "documentType":
          comparison = (a.documentType || "").localeCompare(b.documentType || "");
          break;
        case "taxYear":
          comparison = Number(a.taxYear || 0) - Number(b.taxYear || 0);
          break;
        case "signedAt":
          comparison = new Date(a.signedAt).getTime() - new Date(b.signedAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [signatures, showArchived, searchQuery, documentTypeFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedSignatures.length / pageSize);
  const paginatedSignatures = filteredAndSortedSignatures.slice(
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
    const all = signatures?.filter(s => showArchived ? s.clientIsArchived : !s.clientIsArchived) || [];
    return {
      total: all.length,
      engagementLetters: all.filter(s => s.documentType === "engagement_letter").length,
      form8879: all.filter(s => s.documentType === "form_8879").length,
    };
  }, [signatures, showArchived]);

  const archivedCount = signatures?.filter(s => s.clientIsArchived).length || 0;

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "engagement_letter":
        return "Engagement Letter";
      case "form_8879":
        return "Form 8879 (E-File Authorization)";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Signatures</h1>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
        <h1 className="text-2xl font-semibold" data-testid="text-admin-signatures-title">
          E-Signatures
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${documentTypeFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setDocumentTypeFilter("all"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${documentTypeFilter === "engagement_letter" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setDocumentTypeFilter("engagement_letter"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.engagementLetters}</p>
                <p className="text-sm text-muted-foreground">Engagement Letters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${documentTypeFilter === "form_8879" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setDocumentTypeFilter("form_8879"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PenTool className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.form8879}</p>
                <p className="text-sm text-muted-foreground">Form 8879</p>
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
        {(searchQuery || documentTypeFilter !== "all") && (
          <Button variant="ghost" onClick={() => { setSearchQuery(""); setDocumentTypeFilter("all"); setCurrentPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {filteredAndSortedSignatures.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PenTool className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No signatures from archived clients." : "No signatures match your criteria."}
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
                      onClick={() => handleSort("documentType")}
                    >
                      Document {getSortIcon("documentType")}
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button 
                      className="flex items-center justify-center w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("taxYear")}
                    >
                      Tax Year {getSortIcon("taxYear")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("signedAt")}
                    >
                      Signed {getSortIcon("signedAt")}
                    </button>
                  </TableHead>
                  <TableHead>Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSignatures.map((sig) => (
                  <TableRow key={sig.id} data-testid={`row-signature-${sig.id}`}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sig.clientName}</span>
                          {sig.clientIsArchived && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{sig.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">Signed</Badge>
                        <span className="text-sm">{getDocumentTypeLabel(sig.documentType)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{sig.taxYear}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(sig.signedAt), "MMM d, yyyy")}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(sig.signedAt), "h:mm a")}
                          {sig.ipAddress && ` from ${sig.ipAddress}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 h-12 border rounded-md overflow-hidden bg-white">
                        <img 
                          src={sig.signatureData} 
                          alt="Signature"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedSignatures.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedSignatures.length)} of {filteredAndSortedSignatures.length} signatures
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

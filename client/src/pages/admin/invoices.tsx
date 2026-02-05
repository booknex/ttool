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
  DialogTrigger,
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
  DollarSign, 
  Plus, 
  Trash2, 
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
  AlertCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";

type SortField = "client" | "invoice" | "status" | "amount" | "dueDate";
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminInvoices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: "", rate: "", quantity: 1, amount: "" }
  ]);

  const { data: invoices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
  });

  const { data: clients } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

  const filteredAndSortedInvoices = useMemo(() => {
    let result = invoices?.filter((inv) => {
      const matchesArchived = showArchived ? inv.clientIsArchived : !inv.clientIsArchived;
      const matchesSearch = searchQuery === "" ||
        inv.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesArchived && matchesSearch && matchesStatus;
    }) || [];

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "client":
          comparison = (a.clientName || "").localeCompare(b.clientName || "");
          break;
        case "invoice":
          comparison = (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "amount":
          comparison = Number(a.total || 0) - Number(b.total || 0);
          break;
        case "dueDate":
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [invoices, showArchived, searchQuery, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedInvoices.length / pageSize);
  const paginatedInvoices = filteredAndSortedInvoices.slice(
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
    const all = invoices?.filter(i => showArchived ? i.clientIsArchived : !i.clientIsArchived) || [];
    return {
      total: all.length,
      draft: all.filter(i => i.status === "draft").length,
      sent: all.filter(i => i.status === "sent").length,
      paid: all.filter(i => i.status === "paid").length,
      overdue: all.filter(i => i.status === "overdue").length,
    };
  }, [invoices, showArchived]);

  const archivedCount = invoices?.filter(i => i.clientIsArchived).length || 0;

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/invoices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsDialogOpen(false);
      setSelectedClient("");
      setInvoiceItems([{ description: "", rate: "", quantity: 1, amount: "" }]);
      toast({ title: "Invoice created" });
    },
    onError: () => {
      toast({ title: "Failed to create invoice", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "sent":
        return <Badge variant="secondary">Sent</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...invoiceItems];
    (newItems[index] as any)[field] = value;
    
    if (field === "rate" || field === "quantity") {
      const rate = parseFloat(newItems[index].rate) || 0;
      const qty = parseInt(String(newItems[index].quantity)) || 1;
      newItems[index].amount = (rate * qty).toFixed(2);
    }
    
    setInvoiceItems(newItems);
  };

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { description: "", rate: "", quantity: 1, amount: "" }]);
  };

  const removeItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateInvoice = () => {
    if (!selectedClient || invoiceItems.some(i => !i.description || !i.amount)) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    createInvoiceMutation.mutate({
      userId: selectedClient,
      items: invoiceItems.map(i => ({
        description: i.description,
        rate: i.rate,
        quantity: i.quantity,
        amount: i.amount,
      })),
    });
  };

  const totalAmount = invoiceItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-invoices-title">
          Invoices
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-invoice">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName && client.lastName 
                          ? `${client.firstName} ${client.lastName}`
                          : client.email
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Line Items</Label>
                {invoiceItems.map((item, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        placeholder="Rate"
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(index, "rate", e.target.value)}
                      />
                    </div>
                    <div className="w-16">
                      <Input
                        placeholder="Qty"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Input placeholder="Amount" value={item.amount} readOnly />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={invoiceItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line Item
                </Button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-medium">Total: ${totalAmount.toFixed(2)}</span>
                <Button 
                  onClick={handleCreateInvoice}
                  disabled={createInvoiceMutation.isPending}
                  data-testid="button-submit-invoice"
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "draft" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("draft"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-sm text-muted-foreground">Draft</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "sent" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("sent"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "paid" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("paid"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paid}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "overdue" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setStatusFilter("overdue"); setCurrentPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by client or invoice number..."
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
        {(searchQuery || statusFilter !== "all") && (
          <Button variant="ghost" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setCurrentPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {filteredAndSortedInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No invoices from archived clients." : "No invoices match your criteria."}
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
                      onClick={() => handleSort("invoice")}
                    >
                      Invoice {getSortIcon("invoice")}
                    </button>
                  </TableHead>
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
                      Status {getSortIcon("status")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      className="flex items-center justify-end w-full font-medium hover:text-foreground"
                      onClick={() => handleSort("amount")}
                    >
                      Amount {getSortIcon("amount")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort("dueDate")}
                    >
                      Due Date {getSortIcon("dueDate")}
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((inv) => (
                  <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inv.invoiceNumber}</span>
                        {inv.clientIsArchived && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                            <Archive className="w-3 h-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{inv.clientName}</TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(inv.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(inv.dueDate), "MMM d, yyyy")}
                        {inv.paidAt && (
                          <div className="text-xs text-muted-foreground">
                            Paid: {format(new Date(inv.paidAt), "MMM d")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {inv.items?.length || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedInvoices.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedInvoices.length)} of {filteredAndSortedInvoices.length} invoices
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

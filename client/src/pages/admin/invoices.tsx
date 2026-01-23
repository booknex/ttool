import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DollarSign, Plus, Trash2, Archive } from "lucide-react";
import { format } from "date-fns";

export default function AdminInvoices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: "", rate: "", quantity: 1, amount: "" }
  ]);

  const { data: invoices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
  });

  const { data: clients } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

  const filteredInvoices = invoices?.filter((inv) => 
    showArchived ? inv.clientIsArchived : !inv.clientIsArchived
  ) || [];

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
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
            onClick={() => setShowArchived(!showArchived)}
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

      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No invoices from archived clients." : "No invoices yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => (
            <Card key={inv.id} data-testid={`card-invoice-${inv.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{inv.invoiceNumber}</h3>
                      {getStatusBadge(inv.status)}
                      {inv.clientIsArchived && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span>{inv.clientName}</span>
                      <span>Due: {format(new Date(inv.dueDate), "MMM d, yyyy")}</span>
                      {inv.paidAt && (
                        <span>Paid: {format(new Date(inv.paidAt), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold">${Number(inv.total).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {inv.items?.length || 0} items
                    </div>
                  </div>
                </div>

                {inv.items && inv.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-muted-foreground space-y-1">
                      {inv.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.description}</span>
                          <span>${Number(item.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

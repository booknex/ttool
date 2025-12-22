import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Invoice, InvoiceItem } from "@shared/schema";
import { SiVisa, SiMastercard, SiApplepay } from "react-icons/si";

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
        </Badge>
      );
    case "sent":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="w-3 h-3 mr-1" /> Overdue
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-muted text-muted-foreground">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          Draft
        </Badge>
      );
  }
};

export default function Invoices() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: invoiceItems } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoices", selectedInvoice, "items"],
    enabled: !!selectedInvoice,
  });

  const payMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest("POST", `/api/invoices/${invoiceId}/pay`, { paymentMethod: "card" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setPayingInvoice(null);
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed. Thank you!",
      });
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "Could not process your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectedInvoiceData = invoices?.find((i) => i.id === selectedInvoice);
  const unpaidTotal = invoices
    ?.filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.total), 0) || 0;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-invoices-title">
          Invoices & Payments
        </h1>
        <p className="text-muted-foreground">
          View and pay your tax preparation invoices
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-3xl font-bold" data-testid="text-total-invoices">
                  {invoices?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-outstanding-balance">
                  ${unpaidTotal.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Paid This Year</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${invoices
                    ?.filter((i) => i.status === "paid")
                    .reduce((sum, i) => sum + Number(i.total), 0)
                    .toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            Click on an invoice to view details or make a payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedInvoice(invoice.id)}
                    >
                      <TableCell className="font-medium">
                        #{invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.taxYear}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {invoice.dueDate
                          ? new Date(invoice.dueDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(invoice.total).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(invoice.status === "sent" || invoice.status === "overdue") && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayingInvoice(invoice.id);
                            }}
                            data-testid={`button-pay-${invoice.id}`}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Invoices Yet</p>
              <p className="text-sm">
                Invoices will appear here once your tax preparation begins
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Receipt className="w-5 h-5" />
              Invoice #{selectedInvoiceData?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Tax Year {selectedInvoiceData?.taxYear}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoiceData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">TaxPortal Services</p>
                    <p className="text-sm text-muted-foreground">
                      Professional Tax Preparation
                    </p>
                  </div>
                </div>
                {getStatusBadge(selectedInvoiceData.status)}
              </div>

              <Separator />

              {invoiceItems && invoiceItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          ${Number(item.rate).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(item.amount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Subtotal</TableCell>
                      <TableCell className="text-right">
                        ${Number(selectedInvoiceData.subtotal).toLocaleString()}
                      </TableCell>
                    </TableRow>
                    {Number(selectedInvoiceData.tax) > 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>Tax</TableCell>
                        <TableCell className="text-right">
                          ${Number(selectedInvoiceData.tax).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        ${Number(selectedInvoiceData.total).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}

              {selectedInvoiceData.dueDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Due: {new Date(selectedInvoiceData.dueDate).toLocaleDateString()}
                </div>
              )}

              {(selectedInvoiceData.status === "sent" ||
                selectedInvoiceData.status === "overdue") && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setPayingInvoice(selectedInvoiceData.id);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ${Number(selectedInvoiceData.total).toLocaleString()}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!payingInvoice} onOpenChange={() => setPayingInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Choose your preferred payment method
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold">
                ${Number(
                  invoices?.find((i) => i.id === payingInvoice)?.total || 0
                ).toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => payMutation.mutate(payingInvoice!)}
                disabled={payMutation.isPending}
              >
                <CreditCard className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Credit / Debit Card</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                </div>
                <div className="flex gap-1">
                  <SiVisa className="w-8 h-5 text-blue-600" />
                  <SiMastercard className="w-8 h-5 text-orange-500" />
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => payMutation.mutate(payingInvoice!)}
                disabled={payMutation.isPending}
              >
                <Building2 className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Bank Transfer (ACH)</p>
                  <p className="text-xs text-muted-foreground">Direct from your bank</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => payMutation.mutate(payingInvoice!)}
                disabled={payMutation.isPending}
              >
                <SiApplepay className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Apple Pay</p>
                  <p className="text-xs text-muted-foreground">Fast and secure</p>
                </div>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              Payments secured with bank-level encryption
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

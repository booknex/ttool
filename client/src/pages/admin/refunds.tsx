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
import { TrendingUp, Edit2, Archive } from "lucide-react";
import { format } from "date-fns";

const refundStatuses = [
  { value: "not_filed", label: "Not Filed" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "processing", label: "Processing" },
  { value: "approved", label: "Approved" },
  { value: "refund_sent", label: "Refund Sent" },
  { value: "completed", label: "Completed" },
];

export default function AdminRefunds() {
  const { toast } = useToast();
  const [editingRefund, setEditingRefund] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    federalStatus: "",
    federalAmount: "",
    stateStatus: "",
    stateAmount: "",
  });

  const { data: refunds, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/refunds"],
  });

  const filteredRefunds = refunds?.filter((ref) => 
    showArchived ? ref.clientIsArchived : !ref.clientIsArchived
  ) || [];

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
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
          <Badge variant="outline">{filteredRefunds.length} Showing</Badge>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? `Archived (${archivedCount})` : `Show Archived (${archivedCount})`}
          </Button>
        </div>
      </div>

      {filteredRefunds.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No refund data from archived clients." : "No refund tracking data yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRefunds.map((refund) => (
            <Card key={refund.id} data-testid={`card-refund-${refund.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{refund.clientName}</h3>
                      {refund.clientIsArchived && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{refund.clientEmail}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm font-medium">Federal</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(refund.federalStatus)}
                        </div>
                        {refund.federalAmount && (
                          <p className="text-lg font-semibold text-green-600 mt-1">
                            ${Number(refund.federalAmount).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">State ({refund.stateName || "CA"})</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(refund.stateStatus)}
                        </div>
                        {refund.stateAmount && (
                          <p className="text-lg font-semibold text-green-600 mt-1">
                            ${Number(refund.stateAmount).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(refund)}
                    data-testid={`button-edit-refund-${refund.id}`}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Update
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Last updated: {format(new Date(refund.updatedAt), "MMM d, yyyy h:mm a")}
                </p>
              </CardContent>
            </Card>
          ))}
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

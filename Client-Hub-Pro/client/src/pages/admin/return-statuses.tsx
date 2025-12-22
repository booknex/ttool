import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const RETURN_PREP_STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  { value: "documents_gathering", label: "Documents Gathering", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "information_review", label: "Information Review", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "return_preparation", label: "Return Preparation", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "quality_review", label: "Quality Review", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "client_review", label: "Client Review", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "signature_required", label: "Signature Required", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "filing", label: "Filing", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "filed", label: "Filed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
];

function getStatusConfig(status: string | null) {
  return RETURN_PREP_STATUSES.find((s) => s.value === status) || RETURN_PREP_STATUSES[0];
}

export default function AdminReturnStatuses() {
  const { toast } = useToast();

  const { data: refunds, isLoading } = useQuery<ReturnStatusData[]>({
    queryKey: ["/api/admin/refunds"],
  });

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

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            All Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !refunds || refunds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No clients found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Update Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((client) => {
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {RETURN_PREP_STATUSES.map((status) => (
              <div key={status.value} className="flex items-center gap-2">
                <Badge className={status.color}>{status.label}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

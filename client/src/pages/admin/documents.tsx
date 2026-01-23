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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  Clock,
  Loader2,
  Archive
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function AdminDocuments() {
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  
  const { data: documents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/documents"],
  });

  const filteredDocuments = documents?.filter((doc) => 
    showArchived ? doc.clientIsArchived : !doc.clientIsArchived
  ) || [];

  const archivedCount = documents?.filter(d => d.clientIsArchived).length || 0;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="default" className="bg-green-500">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-documents-title">
          Documents
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{filteredDocuments.length} Showing</Badge>
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

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No documents from archived clients." : "No documents uploaded yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{doc.originalName}</h3>
                      {getStatusBadge(doc.status)}
                      {doc.clientIsArchived && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span>{doc.clientName}</span>
                      <span>{getDocumentTypeLabel(doc.documentType)}</span>
                      <span>{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={doc.status}
                      onValueChange={(status) => updateDocumentMutation.mutate({ id: doc.id, status })}
                      disabled={updateDocumentMutation.isPending}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-status-${doc.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {doc.aiClassification && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      AI Classification: {getDocumentTypeLabel(doc.aiClassification.suggestedType)} 
                      ({Math.round(doc.aiClassification.confidence * 100)}% confidence)
                    </p>
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

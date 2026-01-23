import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PenTool, CheckCircle, Archive } from "lucide-react";
import { format } from "date-fns";

export default function AdminSignatures() {
  const [showArchived, setShowArchived] = useState(false);
  
  const { data: signatures, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/signatures"],
  });

  const filteredSignatures = signatures?.filter((sig) => 
    showArchived ? sig.clientIsArchived : !sig.clientIsArchived
  ) || [];

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
        <h1 className="text-2xl font-semibold" data-testid="text-admin-signatures-title">
          E-Signatures
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{filteredSignatures.length} Showing</Badge>
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

      {filteredSignatures.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PenTool className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showArchived ? "No signatures from archived clients." : "No signatures yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSignatures.map((sig) => (
            <Card key={sig.id} data-testid={`card-signature-${sig.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{getDocumentTypeLabel(sig.documentType)}</h3>
                      <Badge variant="default" className="bg-green-500">Signed</Badge>
                      {sig.clientIsArchived && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span>{sig.clientName}</span>
                      <span>{sig.clientEmail}</span>
                      <span>Tax Year {sig.taxYear}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Signed on {format(new Date(sig.signedAt), "MMMM d, yyyy 'at' h:mm a")}
                      {sig.ipAddress && ` from IP ${sig.ipAddress}`}
                    </p>
                  </div>

                  <div className="w-32 h-16 border rounded-md overflow-hidden bg-white">
                    <img 
                      src={sig.signatureData} 
                      alt="Signature"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

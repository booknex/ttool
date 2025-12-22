import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PenTool, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminSignatures() {
  const { data: signatures, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/signatures"],
  });

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-signatures-title">
          E-Signatures
        </h1>
        <Badge variant="outline">{signatures?.length || 0} Total</Badge>
      </div>

      {signatures?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PenTool className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No signatures yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {signatures?.map((sig) => (
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

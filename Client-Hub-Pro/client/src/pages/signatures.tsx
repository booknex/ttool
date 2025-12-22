import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PenTool,
  CheckCircle2,
  FileText,
  AlertCircle,
  Eraser,
  Download,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Signature } from "@shared/schema";

const documentTypes = [
  {
    id: "engagement_letter",
    title: "Engagement Letter",
    description:
      "Authorization for us to prepare your tax return and represent you before the IRS.",
    required: true,
  },
  {
    id: "form_8879",
    title: "Form 8879 - IRS e-file Signature Authorization",
    description:
      "Authorization for electronic filing of your tax return with the IRS.",
    required: true,
  },
];

export default function Signatures() {
  const { toast } = useToast();
  const [signingDoc, setSigningDoc] = useState<string | null>(null);
  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const { data: signatures, isLoading } = useQuery<Signature[]>({
    queryKey: ["/api/signatures"],
  });

  const signMutation = useMutation({
    mutationFn: async ({ documentType, signatureData }: { documentType: string; signatureData: string }) => {
      await apiRequest("POST", "/api/signatures", { documentType, signatureData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signatures"] });
      setSigningDoc(null);
      toast({
        title: "Document Signed",
        description: "Your signature has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Signature Failed",
        description: "Could not save your signature. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getSignatureForDoc = (docId: string) => {
    return signatures?.find((s) => s.documentType === docId);
  };

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  const handleSign = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please sign in the signature area before submitting.",
        variant: "destructive",
      });
      return;
    }

    const signatureData = sigPadRef.current.toDataURL("image/png");
    signMutation.mutate({
      documentType: signingDoc!,
      signatureData,
    });
  };

  const signedCount = documentTypes.filter((doc) => getSignatureForDoc(doc.id)).length;
  const totalRequired = documentTypes.filter((doc) => doc.required).length;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-signatures-title">
          E-Signatures
        </h1>
        <p className="text-muted-foreground">
          Sign required documents electronically
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Signature Status</p>
                <p className="text-sm text-muted-foreground">
                  {signedCount} of {totalRequired} required documents signed
                </p>
              </div>
            </div>
            {signedCount === totalRequired ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3 mr-1" /> All Complete
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertCircle className="w-3 h-3 mr-1" /> Action Required
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {documentTypes.map((doc) => {
          const signature = getSignatureForDoc(doc.id);
          const isSigned = !!signature;

          return (
            <Card key={doc.id} className={isSigned ? "border-green-200 dark:border-green-800" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${isSigned
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-amber-100 dark:bg-amber-900/30"
                        }
                      `}
                    >
                      {isSigned ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      {doc.required && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{doc.description}</p>

                {isSigned && signature && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Signed</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(signature.signedAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border">
                      <img
                        src={signature.signatureData}
                        alt="Your signature"
                        className="h-16 w-auto mx-auto"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                {isSigned ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Document signed successfully
                  </div>
                ) : (
                  <Button
                    onClick={() => setSigningDoc(doc.id)}
                    className="w-full"
                    data-testid={`button-sign-${doc.id}`}
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Sign Document
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!signingDoc} onOpenChange={() => setSigningDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Sign {documentTypes.find((d) => d.id === signingDoc)?.title}
            </DialogTitle>
            <DialogDescription>
              Draw your signature in the box below. This will serve as your
              electronic signature for this document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-1 bg-white dark:bg-gray-900">
              <SignatureCanvas
                ref={sigPadRef}
                canvasProps={{
                  className: "w-full h-48 cursor-crosshair",
                  style: { width: "100%", height: "192px" },
                }}
                backgroundColor="transparent"
                penColor="#000"
              />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Draw your signature above</span>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Eraser className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-2">Electronic Signature Consent</p>
              <p className="text-muted-foreground">
                By clicking "Sign Document," you agree that your electronic signature
                is the legal equivalent of your manual/handwritten signature.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSigningDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={signMutation.isPending}
              data-testid="button-confirm-signature"
            >
              {signMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4 mr-2" />
                  Sign Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

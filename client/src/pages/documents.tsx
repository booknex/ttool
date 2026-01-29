import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  Image,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  FolderOpen,
  Sparkles,
  Shield,
  Loader2,
  FileCheck,
  CircleDashed,
  User,
  Building2,
  XCircle,
  Undo2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Document, RequiredDocument, Return } from "@shared/schema";

const documentTypeLabels: Record<string, string> = {
  w2: "W-2",
  "1099_nec": "1099-NEC",
  "1099_k": "1099-K",
  "1099_int": "1099-INT",
  "1099_div": "1099-DIV",
  "1099_b": "1099-B",
  k1: "Schedule K-1",
  brokerage: "Brokerage Statement",
  mortgage_interest: "Mortgage Interest (1098)",
  property_tax: "Property Tax Statement",
  charitable_donation: "Charitable Donation Receipt",
  medical_expense: "Medical Expense Receipt",
  business_expense: "Business Expense",
  engagement_letter: "Engagement Letter",
  form_8879: "Form 8879",
  other: "Other Document",
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3 mr-1" /> Processing
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="w-3 h-3 mr-1" /> Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </Badge>
      );
  }
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
  if (fileType.includes("image")) return <Image className="w-8 h-8 text-blue-500" />;
  return <File className="w-8 h-8 text-muted-foreground" />;
};

export default function Documents() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<string>("");
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [fileChecklistMap, setFileChecklistMap] = useState<Map<number, string>>(new Map());

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: requiredDocs, isLoading: reqDocsLoading } = useQuery<RequiredDocument[]>({
    queryKey: ["/api/required-documents"],
  });

  const { data: returns = [] } = useQuery<Return[]>({
    queryKey: ["/api/returns"],
  });

  // Group required documents by return type
  const personalReturn = returns.find(r => r.returnType === 'personal');
  const businessReturns = returns.filter(r => r.returnType === 'business');
  
  const personalDocs = requiredDocs?.filter(d => 
    !d.returnId || d.returnId === personalReturn?.id
  ) || [];
  
  const businessDocs = requiredDocs?.filter(d => 
    d.returnId && businessReturns.some(br => br.id === d.returnId)
  ) || [];

  const uploadSingleFileMutation = useMutation({
    mutationFn: async ({ file, requiredDocumentId }: { file: File; requiredDocumentId?: string }) => {
      const formData = new FormData();
      formData.append("files", file);
      if (requiredDocumentId) {
        formData.append("requiredDocumentId", requiredDocumentId);
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/required-documents"] });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading a document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const processNextFile = () => {
    const nextIndex = currentFileIndex + 1;
    if (nextIndex < pendingFiles.length) {
      setCurrentFileIndex(nextIndex);
      setSelectedChecklistItem("");
    } else {
      finishUpload();
    }
  };

  const finishUpload = async () => {
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const checklistItemId = fileChecklistMap.get(i);
        await uploadSingleFileMutation.mutateAsync({ 
          file, 
          requiredDocumentId: checklistItemId 
        });
      }
      
      toast({
        title: "Upload Successful",
        description: `${pendingFiles.length} document${pendingFiles.length > 1 ? 's have' : ' has'} been uploaded and ${pendingFiles.length > 1 ? 'are' : 'is'} being processed.`,
      });
      setUploadProgress(100);
    } catch {
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setPendingFiles([]);
        setCurrentFileIndex(0);
        setSelectedChecklistItem("");
        setShowChecklistDialog(false);
        setFileChecklistMap(new Map());
      }, 1000);
    }
  };

  const handleUploadWithSelection = () => {
    if (pendingFiles.length > 0 && currentFileIndex < pendingFiles.length) {
      if (selectedChecklistItem) {
        setFileChecklistMap(prev => new Map(prev).set(currentFileIndex, selectedChecklistItem));
      }
      processNextFile();
    }
  };

  const handleSkipSelection = () => {
    if (pendingFiles.length > 0 && currentFileIndex < pendingFiles.length) {
      processNextFile();
    }
  };

  const handleSkipAllRemaining = () => {
    if (selectedChecklistItem) {
      setFileChecklistMap(prev => new Map(prev).set(currentFileIndex, selectedChecklistItem));
    }
    finishUpload();
  };

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/required-documents"] });
      toast({
        title: "Document Deleted",
        description: "The document has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Could not delete the document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markNotApplicableMutation = useMutation({
    mutationFn: async ({ docId, notApplicable }: { docId: string; notApplicable: boolean }) => {
      await apiRequest("PATCH", `/api/required-documents/${docId}/not-applicable`, { notApplicable });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/required-documents"] });
      toast({
        title: variables.notApplicable ? "Marked as N/A" : "Unmarked",
        description: variables.notApplicable 
          ? "This document has been marked as not applicable."
          : "This document requirement has been restored.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update the document status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getIncompleteChecklistItems = useCallback(() => {
    const alreadySelected = new Set(fileChecklistMap.values());
    // Exclude uploaded, N/A marked, and already selected items
    return requiredDocs?.filter(d => !d.isUploaded && !d.markedNotApplicable && !alreadySelected.has(d.id)) || [];
  }, [requiredDocs, fileChecklistMap]);

  const incompleteChecklistItems = getIncompleteChecklistItems();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        if (reqDocsLoading) {
          toast({
            title: "Please Wait",
            description: "Loading your document checklist. Please try again in a moment.",
          });
          return;
        }
        
        const incompleteItems = requiredDocs?.filter(d => !d.isUploaded) || [];
        if (incompleteItems.length > 0) {
          setPendingFiles(acceptedFiles);
          setCurrentFileIndex(0);
          setFileChecklistMap(new Map());
          setSelectedChecklistItem("");
          setShowChecklistDialog(true);
        } else {
          setUploading(true);
          setUploadProgress(0);
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 10, 90));
          }, 200);
          
          Promise.all(acceptedFiles.map(file => 
            uploadSingleFileMutation.mutateAsync({ file })
          )).then(() => {
            toast({
              title: "Upload Successful",
              description: `${acceptedFiles.length} document${acceptedFiles.length > 1 ? 's have' : ' has'} been uploaded.`,
            });
            setUploadProgress(100);
          }).catch(() => {
            setUploadProgress(0);
          }).finally(() => {
            clearInterval(progressInterval);
            setTimeout(() => {
              setUploading(false);
              setUploadProgress(0);
            }, 1000);
          });
        }
      }
    },
    [reqDocsLoading, requiredDocs, toast, uploadSingleFileMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024,
  });

  // Count uploaded OR marked N/A as complete
  const completedReqDocs = requiredDocs?.filter((d) => d.isUploaded || d.markedNotApplicable).length || 0;
  const totalReqDocs = requiredDocs?.length || 0;
  const docProgress = totalReqDocs > 0 ? Math.round((completedReqDocs / totalReqDocs) * 100) : 0;

  const verifiedDocs = documents?.filter((d) => d.status === "verified").length || 0;
  const processingDocs = documents?.filter((d) => d.status === "processing").length || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-documents-title">
            Document Center
          </h1>
          <p className="text-muted-foreground">
            Upload and manage your tax documents securely
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifiedDocs}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingDocs}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{docProgress}%</p>
                <p className="text-xs text-muted-foreground">Checklist</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Documents
              </CardTitle>
              <CardDescription>
                Drag and drop your tax documents or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-300
                  ${isDragActive 
                    ? "border-primary bg-primary/5 scale-[1.02]" 
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
                  ${uploading ? "pointer-events-none" : ""}
                `}
                data-testid="dropzone-upload"
              >
                <input {...getInputProps()} data-testid="input-file-upload" />
                
                {uploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="font-medium mb-2">Uploading your files...</p>
                      <div className="max-w-xs mx-auto">
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% complete</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${
                      isDragActive ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <Upload className={`w-8 h-8 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    {isDragActive ? (
                      <div>
                        <p className="text-lg font-medium text-primary">Drop your files here</p>
                        <p className="text-sm text-muted-foreground">Release to upload</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium">
                          Drag & drop files here
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          or click to browse your computer
                        </p>
                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> PDF
                          </span>
                          <span className="flex items-center gap-1">
                            <Image className="w-3 h-3" /> PNG, JPG
                          </span>
                          <span>Max 10MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>256-bit encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>AI-powered classification</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>My Documents</CardTitle>
                  <CardDescription>
                    {documents?.length || 0} files uploaded
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.originalName}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {documentTypeLabels[doc.documentType || "other"]}
                          </Badge>
                          <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                          <span>
                            {doc.uploadedAt && new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedDoc(doc)}
                          data-testid={`button-view-${doc.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          data-testid={`button-delete-${doc.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">No documents yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first document to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Document Checklist
              </CardTitle>
              <CardDescription>
                Tax year 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{completedReqDocs} of {totalReqDocs}</span>
                  <span className="font-semibold text-primary">{docProgress}%</span>
                </div>
                <Progress value={docProgress} className="h-2" />
              </div>

              <Separator className="my-4" />

              {reqDocsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : requiredDocs && requiredDocs.length > 0 ? (
                <div className="space-y-4">
                  {/* Personal Return Documents */}
                  {personalDocs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-600">Personal Return</span>
                        <span className="text-xs text-muted-foreground">
                          ({personalDocs.filter(d => d.isUploaded || d.markedNotApplicable).length}/{personalDocs.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {personalDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                              doc.isUploaded 
                                ? "bg-green-50 dark:bg-green-900/10" 
                                : doc.markedNotApplicable
                                  ? "bg-gray-50 dark:bg-gray-900/10"
                                  : "bg-muted/30"
                            }`}
                          >
                            {doc.isUploaded ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : doc.markedNotApplicable ? (
                              <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <CircleDashed className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                doc.isUploaded 
                                  ? "text-green-800 dark:text-green-300" 
                                  : doc.markedNotApplicable 
                                    ? "text-gray-500 line-through" 
                                    : ""
                              }`}>
                                {documentTypeLabels[doc.documentType || "other"]}
                              </p>
                              {doc.description && (
                                <p className={`text-xs truncate ${doc.markedNotApplicable ? "text-gray-400" : "text-muted-foreground"}`}>
                                  {doc.markedNotApplicable ? "Marked as N/A" : doc.description}
                                </p>
                              )}
                            </div>
                            {!doc.isUploaded && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-xs flex-shrink-0 ${doc.markedNotApplicable ? "text-blue-600 hover:text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
                                onClick={() => markNotApplicableMutation.mutate({ docId: doc.id, notApplicable: !doc.markedNotApplicable })}
                                disabled={markNotApplicableMutation.isPending}
                              >
                                {doc.markedNotApplicable ? (
                                  <>
                                    <Undo2 className="w-3 h-3 mr-1" />
                                    Undo
                                  </>
                                ) : (
                                  "I don't have this"
                                )}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Return Documents */}
                  {businessDocs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-600">Business Return</span>
                        <span className="text-xs text-muted-foreground">
                          ({businessDocs.filter(d => d.isUploaded || d.markedNotApplicable).length}/{businessDocs.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {businessDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                              doc.isUploaded 
                                ? "bg-green-50 dark:bg-green-900/10" 
                                : doc.markedNotApplicable
                                  ? "bg-gray-50 dark:bg-gray-900/10"
                                  : "bg-muted/30"
                            }`}
                          >
                            {doc.isUploaded ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : doc.markedNotApplicable ? (
                              <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <CircleDashed className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                doc.isUploaded 
                                  ? "text-green-800 dark:text-green-300" 
                                  : doc.markedNotApplicable 
                                    ? "text-gray-500 line-through" 
                                    : ""
                              }`}>
                                {documentTypeLabels[doc.documentType || "other"]}
                              </p>
                              {doc.description && (
                                <p className={`text-xs truncate ${doc.markedNotApplicable ? "text-gray-400" : "text-muted-foreground"}`}>
                                  {doc.markedNotApplicable ? "Marked as N/A" : doc.description}
                                </p>
                              )}
                            </div>
                            {!doc.isUploaded && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-xs flex-shrink-0 ${doc.markedNotApplicable ? "text-blue-600 hover:text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
                                onClick={() => markNotApplicableMutation.mutate({ docId: doc.id, notApplicable: !doc.markedNotApplicable })}
                                disabled={markNotApplicableMutation.isPending}
                              >
                                {doc.markedNotApplicable ? (
                                  <>
                                    <Undo2 className="w-3 h-3 mr-1" />
                                    Undo
                                  </>
                                ) : (
                                  "I don't have this"
                                )}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">No required documents</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Accepted Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(documentTypeLabels).slice(0, 8).map(([key, label]) => (
                  <div
                    key={key}
                    className="p-2 rounded-lg bg-muted/50 text-xs flex items-center gap-2"
                  >
                    <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedDoc && getFileIcon(selectedDoc.fileType)}
              <span className="truncate">{selectedDoc?.originalName}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.documentType && documentTypeLabels[selectedDoc.documentType]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">File Size</p>
                <p className="font-medium">
                  {selectedDoc && (selectedDoc.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Tax Year</p>
                <p className="font-medium">{selectedDoc?.taxYear}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Uploaded</p>
                <p className="font-medium">
                  {selectedDoc?.uploadedAt && new Date(selectedDoc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div className="mt-0.5">{selectedDoc && getStatusBadge(selectedDoc.status)}</div>
              </div>
            </div>
            {selectedDoc?.aiClassification && (
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300">AI Classification</p>
                </div>
                <pre className="text-xs text-purple-700 dark:text-purple-400 overflow-auto">
                  {JSON.stringify(selectedDoc.aiClassification as Record<string, unknown>, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChecklistDialog} onOpenChange={(open) => {
        if (!open && !uploading) {
          setShowChecklistDialog(false);
          setPendingFiles([]);
          setCurrentFileIndex(0);
          setSelectedChecklistItem("");
          setFileChecklistMap(new Map());
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              {pendingFiles.length > 1 ? `File ${currentFileIndex + 1} of ${pendingFiles.length}` : "What document is this?"}
            </DialogTitle>
            <DialogDescription>
              Select which item from your checklist this document is for. This helps us process your tax return faster.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {pendingFiles[currentFileIndex] && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Current file:</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="truncate">{pendingFiles[currentFileIndex].name}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="checklist-select">Document type</Label>
              {incompleteChecklistItems.length > 0 ? (
                <Select value={selectedChecklistItem} onValueChange={setSelectedChecklistItem}>
                  <SelectTrigger id="checklist-select">
                    <SelectValue placeholder="Select from your checklist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {incompleteChecklistItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <CircleDashed className="w-4 h-4 text-muted-foreground" />
                          <span>{item.description || documentTypeLabels[item.documentType || "other"]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <p className="font-medium">No more checklist items available</p>
                  <p className="text-xs mt-1">All your required documents have been assigned. This file will be uploaded as an additional document.</p>
                </div>
              )}
            </div>

            {pendingFiles.length > 1 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Remaining files ({pendingFiles.length - currentFileIndex - 1}):</p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {pendingFiles.slice(currentFileIndex + 1).map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {pendingFiles.length > 1 && currentFileIndex < pendingFiles.length - 1 && (
              <Button 
                variant="ghost" 
                onClick={handleSkipAllRemaining}
                disabled={uploading}
                className="mr-auto"
              >
                Skip All & Upload
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleSkipSelection}
              disabled={uploading}
            >
              {currentFileIndex < pendingFiles.length - 1 ? "Skip File" : "Skip"}
            </Button>
            <Button 
              onClick={incompleteChecklistItems.length === 0 ? handleSkipSelection : handleUploadWithSelection}
              disabled={(incompleteChecklistItems.length > 0 && !selectedChecklistItem) || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : currentFileIndex < pendingFiles.length - 1 ? (
                incompleteChecklistItems.length === 0 ? "Continue" : "Next File"
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {incompleteChecklistItems.length === 0 ? "Upload" : "Upload All"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Trash2,
  Pencil,
  Package,
  FileText,
  Calculator,
  Briefcase,
  Building2,
  Shield,
  Heart,
  Star,
  Globe,
  Wrench,
  BookOpen,
  Truck,
  ShoppingCart,
  CreditCard,
  Headphones,
  Mail,
} from "lucide-react";

const ICON_OPTIONS = [
  { value: "Package", label: "Package", icon: Package },
  { value: "FileText", label: "FileText", icon: FileText },
  { value: "Calculator", label: "Calculator", icon: Calculator },
  { value: "Briefcase", label: "Briefcase", icon: Briefcase },
  { value: "Building2", label: "Building2", icon: Building2 },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Heart", label: "Heart", icon: Heart },
  { value: "Star", label: "Star", icon: Star },
  { value: "Globe", label: "Globe", icon: Globe },
  { value: "Wrench", label: "Wrench", icon: Wrench },
  { value: "BookOpen", label: "BookOpen", icon: BookOpen },
  { value: "Truck", label: "Truck", icon: Truck },
  { value: "ShoppingCart", label: "ShoppingCart", icon: ShoppingCart },
  { value: "CreditCard", label: "CreditCard", icon: CreditCard },
  { value: "Headphones", label: "Headphones", icon: Headphones },
  { value: "Mail", label: "Mail", icon: Mail },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, FileText, Calculator, Briefcase, Building2, Shield,
  Heart, Star, Globe, Wrench, BookOpen, Truck, ShoppingCart,
  CreditCard, Headphones, Mail,
};

const DISPLAY_LOCATIONS = [
  { value: "sidebar", label: "Sidebar" },
  { value: "tools", label: "Tools" },
  { value: "both", label: "Both" },
];

interface StageInput {
  name: string;
  slug: string;
  color: string;
}

interface ProductFormData {
  name: string;
  description: string;
  icon: string;
  displayLocation: string;
  isActive: boolean;
  stages: StageInput[];
}

const defaultFormData: ProductFormData = {
  name: "",
  description: "",
  icon: "Package",
  displayLocation: "sidebar",
  isActive: true,
  stages: [],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);

  const { data: products, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return apiRequest("POST", "/api/admin/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      closeDialog();
      toast({ title: "Product created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      return apiRequest("PUT", `/api/admin/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      closeDialog();
      toast({ title: "Product updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setDeleteProductId(null);
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData(defaultFormData);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      icon: product.icon || "Package",
      displayLocation: product.displayLocation || "sidebar",
      isActive: product.isActive !== false,
      stages: (product.stages || []).map((s: any) => ({
        name: s.name,
        slug: s.slug,
        color: s.color || "#6b7280",
      })),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addStage = () => {
    setFormData({
      ...formData,
      stages: [...formData.stages, { name: "", slug: "", color: "#6b7280" }],
    });
  };

  const updateStage = (index: number, field: keyof StageInput, value: string) => {
    const newStages = [...formData.stages];
    newStages[index] = { ...newStages[index], [field]: value };
    if (field === "name") {
      newStages[index].slug = slugify(value);
    }
    setFormData({ ...formData, stages: newStages });
  };

  const removeStage = (index: number) => {
    setFormData({
      ...formData,
      stages: formData.stages.filter((_, i) => i !== index),
    });
  };

  const getIconComponent = (iconName: string | null) => {
    const IconComp = ICON_MAP[iconName || "Package"] || Package;
    return <IconComp className="w-4 h-4" />;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </Button>
      </div>

      {!products?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products yet. Click "Create Product" to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Display Location</TableHead>
                  <TableHead className="text-center">Stages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{product.name}</span>
                        {product.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getIconComponent(product.icon)}
                        <span className="text-sm text-muted-foreground">{product.icon || "Package"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {product.displayLocation || "sidebar"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {product.stages?.length || 0}
                    </TableCell>
                    <TableCell>
                      {product.isActive !== false ? (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProductId(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Create Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Name *</Label>
              <Input
                id="product-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Tax Return Preparation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Input
                id="product-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Display Location</Label>
                <Select
                  value={formData.displayLocation}
                  onValueChange={(v) => setFormData({ ...formData, displayLocation: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_LOCATIONS.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="product-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="product-active">Active</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pipeline Stages</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Stage
                </Button>
              </div>

              {formData.stages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No stages defined. Add stages to create a pipeline.
                </p>
              )}

              {formData.stages.map((stage, index) => (
                <div key={index} className="flex items-end gap-2 p-3 border rounded-md">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={stage.name}
                      onChange={(e) => updateStage(index, "name", e.target.value)}
                      placeholder="Stage name"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Slug</Label>
                    <Input
                      value={stage.slug}
                      onChange={(e) => updateStage(index, "slug", e.target.value)}
                      placeholder="auto-generated"
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="w-16 space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(index, "color", e.target.value)}
                      className="h-9 p-1 cursor-pointer"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStage(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? editingProduct ? "Updating..." : "Creating..."
                : editingProduct ? "Update Product" : "Create Product"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProductId} onOpenChange={(open) => { if (!open) setDeleteProductId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone and will remove all associated stages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && deleteMutation.mutate(deleteProductId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
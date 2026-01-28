import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  Receipt,
  DollarSign,
  Briefcase,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Business {
  id: string;
  userId: string;
  name: string;
  entityType: "sole_proprietorship" | "llc" | "s_corp" | "c_corp" | "partnership" | "other" | null;
  taxId: string | null;
  industry: string | null;
  description: string | null;
  address: string | null;
  taxYear: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface BusinessOwner {
  id: string;
  businessId: string;
  name: string;
  ownershipPercentage: string | null;
  ssn: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date | null;
}

interface BusinessExpense {
  id: string;
  businessId: string;
  category: string;
  description: string | null;
  amount: string;
  taxYear: number | null;
  createdAt: Date | null;
}

const entityTypeLabels: Record<string, string> = {
  sole_proprietorship: "Sole Proprietorship",
  llc: "LLC",
  s_corp: "S-Corporation",
  c_corp: "C-Corporation",
  partnership: "Partnership",
  other: "Other",
};

const expenseCategories = [
  "Advertising",
  "Car and truck expenses",
  "Commissions and fees",
  "Contract labor",
  "Depreciation",
  "Employee benefit programs",
  "Insurance",
  "Interest",
  "Legal and professional services",
  "Office expense",
  "Rent or lease",
  "Repairs and maintenance",
  "Supplies",
  "Taxes and licenses",
  "Travel",
  "Utilities",
  "Wages",
  "Other expenses",
];

export default function BusinessesPage() {
  const { toast } = useToast();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [isEditBusinessOpen, setIsEditBusinessOpen] = useState(false);
  const [isAddOwnerOpen, setIsAddOwnerOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    entityType: "sole_proprietorship" as string,
    taxId: "",
    industry: "",
    description: "",
    address: "",
  });
  const [newOwner, setNewOwner] = useState({
    name: "",
    ownershipPercentage: "",
    email: "",
    phone: "",
  });
  const [newExpense, setNewExpense] = useState({
    category: "",
    description: "",
    amount: "",
  });

  const { data: businesses = [], isLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
  });

  const { data: owners = [] } = useQuery<BusinessOwner[]>({
    queryKey: ["/api/businesses", selectedBusiness?.id, "owners"],
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${selectedBusiness?.id}/owners`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch owners");
      return res.json();
    },
    enabled: !!selectedBusiness,
  });

  const { data: expenses = [] } = useQuery<BusinessExpense[]>({
    queryKey: ["/api/businesses", selectedBusiness?.id, "expenses"],
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${selectedBusiness?.id}/expenses`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!selectedBusiness,
  });

  const createBusinessMutation = useMutation({
    mutationFn: (data: typeof newBusiness) =>
      apiRequest("POST", "/api/businesses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      setIsAddBusinessOpen(false);
      setNewBusiness({
        name: "",
        entityType: "sole_proprietorship",
        taxId: "",
        industry: "",
        description: "",
        address: "",
      });
      toast({ title: "Business added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add business", variant: "destructive" });
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: (data: Partial<Business>) =>
      apiRequest("PATCH", `/api/businesses/${selectedBusiness?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      setIsEditBusinessOpen(false);
      toast({ title: "Business updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update business", variant: "destructive" });
    },
  });

  const deleteBusinessMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/businesses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      setSelectedBusiness(null);
      toast({ title: "Business deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete business", variant: "destructive" });
    },
  });

  const createOwnerMutation = useMutation({
    mutationFn: (data: typeof newOwner) =>
      apiRequest("POST", `/api/businesses/${selectedBusiness?.id}/owners`, {
        ...data,
        ownershipPercentage: data.ownershipPercentage ? parseFloat(data.ownershipPercentage) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", selectedBusiness?.id, "owners"] });
      setIsAddOwnerOpen(false);
      setNewOwner({ name: "", ownershipPercentage: "", email: "", phone: "" });
      toast({ title: "Owner added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add owner", variant: "destructive" });
    },
  });

  const deleteOwnerMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/business-owners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", selectedBusiness?.id, "owners"] });
      toast({ title: "Owner removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove owner", variant: "destructive" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: typeof newExpense) =>
      apiRequest("POST", `/api/businesses/${selectedBusiness?.id}/expenses`, {
        ...data,
        amount: parseFloat(data.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", selectedBusiness?.id, "expenses"] });
      setIsAddExpenseOpen(false);
      setNewExpense({ category: "", description: "", amount: "" });
      toast({ title: "Expense added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add expense", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/business-expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", selectedBusiness?.id, "expenses"] });
      toast({ title: "Expense removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove expense", variant: "destructive" });
    },
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Businesses
          </h1>
          <p className="text-muted-foreground">
            Manage your business information for tax year 2025
          </p>
        </div>
        <Button onClick={() => setIsAddBusinessOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </div>

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No businesses yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your businesses to track expenses and provide information for your tax returns.
            </p>
            <Button onClick={() => setIsAddBusinessOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Business
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Your Businesses</h2>
            {businesses.map((business) => (
              <Card
                key={business.id}
                className={`cursor-pointer transition-colors ${
                  selectedBusiness?.id === business.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedBusiness(business)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{business.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {entityTypeLabels[business.entityType || "other"]}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="md:col-span-2">
            {selectedBusiness ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {selectedBusiness.name}
                      </CardTitle>
                      <CardDescription>
                        {entityTypeLabels[selectedBusiness.entityType || "other"]}
                        {selectedBusiness.taxId && ` • EIN: ${selectedBusiness.taxId}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditBusinessOpen(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this business?")) {
                            deleteBusinessMutation.mutate(selectedBusiness.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={["details", "owners", "expenses"]}>
                    <AccordionItem value="details">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Business Details
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 pt-4">
                          {selectedBusiness.industry && (
                            <div>
                              <Label className="text-muted-foreground">Industry</Label>
                              <p>{selectedBusiness.industry}</p>
                            </div>
                          )}
                          {selectedBusiness.description && (
                            <div>
                              <Label className="text-muted-foreground">Description</Label>
                              <p>{selectedBusiness.description}</p>
                            </div>
                          )}
                          {selectedBusiness.address && (
                            <div>
                              <Label className="text-muted-foreground">Address</Label>
                              <p>{selectedBusiness.address}</p>
                            </div>
                          )}
                          {!selectedBusiness.industry && !selectedBusiness.description && !selectedBusiness.address && (
                            <p className="text-muted-foreground text-sm">
                              No additional details provided. Click Edit to add more information.
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="owners">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Owners ({owners.length})
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {owners.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No owners added yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {owners.map((owner) => (
                                <div
                                  key={owner.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">{owner.name}</p>
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                      {owner.ownershipPercentage && (
                                        <span>{owner.ownershipPercentage}% ownership</span>
                                      )}
                                      {owner.email && <span>{owner.email}</span>}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteOwnerMutation.mutate(owner.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddOwnerOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Owner
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="expenses">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Expenses ({expenses.length})
                          {totalExpenses > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {expenses.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No expenses recorded yet. Add your business expenses for deductions.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {expenses.map((expense) => (
                                <div
                                  key={expense.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">{expense.category}</p>
                                    {expense.description && (
                                      <p className="text-sm text-muted-foreground">
                                        {expense.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      ${parseFloat(expense.amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddExpenseOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Expense
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a business</h3>
                  <p className="text-muted-foreground">
                    Click on a business from the list to view and manage its details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Add Business Dialog */}
      <Dialog open={isAddBusinessOpen} onOpenChange={setIsAddBusinessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Business</DialogTitle>
            <DialogDescription>
              Add a new business for your 2025 tax return.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={newBusiness.name}
                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                placeholder="My Business LLC"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={newBusiness.entityType}
                onValueChange={(value) => setNewBusiness({ ...newBusiness, entityType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(entityTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taxId">EIN (Tax ID)</Label>
              <Input
                id="taxId"
                value={newBusiness.taxId}
                onChange={(e) => setNewBusiness({ ...newBusiness, taxId: e.target.value })}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={newBusiness.industry}
                onChange={(e) => setNewBusiness({ ...newBusiness, industry: e.target.value })}
                placeholder="e.g., Consulting, Retail"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={newBusiness.address}
                onChange={(e) => setNewBusiness({ ...newBusiness, address: e.target.value })}
                placeholder="123 Main St, City, State ZIP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBusinessOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBusinessMutation.mutate(newBusiness)}
              disabled={!newBusiness.name || createBusinessMutation.isPending}
            >
              {createBusinessMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Business Dialog */}
      <Dialog open={isEditBusinessOpen} onOpenChange={setIsEditBusinessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update your business information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Business Name *</Label>
              <Input
                id="edit-name"
                defaultValue={selectedBusiness?.name}
                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-entityType">Entity Type</Label>
              <Select
                defaultValue={selectedBusiness?.entityType || "sole_proprietorship"}
                onValueChange={(value) => setNewBusiness({ ...newBusiness, entityType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(entityTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-taxId">EIN (Tax ID)</Label>
              <Input
                id="edit-taxId"
                defaultValue={selectedBusiness?.taxId || ""}
                onChange={(e) => setNewBusiness({ ...newBusiness, taxId: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input
                id="edit-industry"
                defaultValue={selectedBusiness?.industry || ""}
                onChange={(e) => setNewBusiness({ ...newBusiness, industry: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Business Address</Label>
              <Textarea
                id="edit-address"
                defaultValue={selectedBusiness?.address || ""}
                onChange={(e) => setNewBusiness({ ...newBusiness, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBusinessOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateBusinessMutation.mutate(newBusiness)}
              disabled={updateBusinessMutation.isPending}
            >
              {updateBusinessMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Owner Dialog */}
      <Dialog open={isAddOwnerOpen} onOpenChange={setIsAddOwnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Owner</DialogTitle>
            <DialogDescription>
              Add an owner to {selectedBusiness?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="owner-name">Name *</Label>
              <Input
                id="owner-name"
                value={newOwner.name}
                onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-percentage">Ownership Percentage</Label>
              <Input
                id="owner-percentage"
                type="number"
                min="0"
                max="100"
                value={newOwner.ownershipPercentage}
                onChange={(e) => setNewOwner({ ...newOwner, ownershipPercentage: e.target.value })}
                placeholder="e.g., 50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-email">Email</Label>
              <Input
                id="owner-email"
                type="email"
                value={newOwner.email}
                onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                placeholder="owner@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-phone">Phone</Label>
              <Input
                id="owner-phone"
                value={newOwner.phone}
                onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOwnerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createOwnerMutation.mutate(newOwner)}
              disabled={!newOwner.name || createOwnerMutation.isPending}
            >
              {createOwnerMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a business expense for {selectedBusiness?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expense-category">Category *</Label>
              <Select
                value={newExpense.category}
                onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-8"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Optional notes about this expense"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createExpenseMutation.mutate(newExpense)}
              disabled={!newExpense.category || !newExpense.amount || createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

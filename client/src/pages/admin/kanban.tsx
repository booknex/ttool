import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useMemo } from "react";
import { User, GripVertical, Building2, Package, ChevronDown, ChevronRight, FileText, MoreVertical, CheckCircle2, RotateCcw } from "lucide-react";

interface Return {
  id: string;
  returnType: 'personal' | 'business';
  name: string;
  businessId: string | null;
  status: string;
  taxYear: number;
  clientId: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
}

interface ProductStage {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sortOrder: number | null;
}

interface ClientProductEnriched {
  id: string;
  userId: string;
  productId: string;
  currentStageId: string | null;
  name: string | null;
  product: { id: string; name: string; icon: string | null; stages: ProductStage[] } | null;
  currentStage: { id: string; name: string; slug: string; color: string | null } | null;
  clientName: string;
  clientEmail: string;
}

interface ProductRow {
  productId: string;
  productName: string;
  productIcon: string | null;
  stages: ProductStage[];
  clientProducts: ClientProductEnriched[];
  completedProducts: ClientProductEnriched[];
  totalClients: number;
  completedCount: number;
}

interface KanbanAllData {
  returns: {
    columns: Record<string, Return[]>;
    statuses: string[];
    totalClients: number;
  };
  productRows: ProductRow[];
}

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  documents_gathering: "Gathering Docs",
  information_review: "Info Review",
  return_preparation: "Prep",
  quality_review: "QA Review",
  client_review: "Client Review",
  signature_required: "Signatures",
  filing: "Filing",
  filed: "Filed",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 border-gray-300",
  documents_gathering: "bg-blue-50 border-blue-300",
  information_review: "bg-yellow-50 border-yellow-300",
  return_preparation: "bg-orange-50 border-orange-300",
  quality_review: "bg-purple-50 border-purple-300",
  client_review: "bg-pink-50 border-pink-300",
  signature_required: "bg-indigo-50 border-indigo-300",
  filing: "bg-cyan-50 border-cyan-300",
  filed: "bg-green-50 border-green-300",
};

function ReturnCard({ ret, isDragging }: { ret: Return; isDragging?: boolean }) {
  return (
    <div className={`bg-white rounded border shadow-sm px-2 py-1.5 ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}>
      <div className="flex items-start gap-1.5">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          ret.returnType === 'personal' ? 'bg-blue-100' : 'bg-amber-100'
        }`}>
          {ret.returnType === 'personal' ? (
            <User className="h-3 w-3 text-blue-600" />
          ) : (
            <Building2 className="h-3 w-3 text-amber-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-xs truncate">{ret.clientName}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {ret.returnType === 'personal' ? 'Personal' : ret.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ cp, isDragging, onComplete, showMenu = false }: { cp: ClientProductEnriched; isDragging?: boolean; onComplete?: (id: string) => void; showMenu?: boolean }) {
  return (
    <div className={`bg-white rounded border shadow-sm px-2 py-1.5 ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}>
      <div className="flex items-start gap-1.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-100">
          <Package className="h-3 w-3 text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-xs truncate">{cp.clientName}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {cp.name || cp.product?.name}
          </p>
        </div>
        {showMenu && onComplete && !isDragging && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-0.5 rounded hover:bg-gray-100 flex-shrink-0">
                <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(cp.id); }}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                Mark Complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function SortableReturnCard({ ret }: { ret: Return }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ret.id, data: { ret } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-0.5">
        <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <ReturnCard ret={ret} isDragging={isDragging} />
        </div>
      </div>
    </div>
  );
}

function SortableProductCard({ cp, onComplete }: { cp: ClientProductEnriched; onComplete?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cp.id, data: { cp } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-0.5">
        <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <ProductCard cp={cp} isDragging={isDragging} onComplete={onComplete} showMenu />
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ status, label, colorClass, returns }: { status: string; label: string; colorClass: string; returns: Return[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={`flex flex-col rounded-lg border-2 ${colorClass} min-w-[150px] w-[150px] ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <div className="px-2 py-1.5 border-b bg-white/50">
        <h3 className="font-semibold text-xs">{label}</h3>
        <span className="text-[10px] text-gray-500">{returns.length}</span>
      </div>
      <div ref={setNodeRef} className={`p-1.5 flex-1 overflow-y-auto min-h-[120px] max-h-[300px] ${isOver ? 'bg-primary/5' : ''}`}>
        <SortableContext items={returns.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {returns.map((ret) => (
              <SortableReturnCard key={ret.id} ret={ret} />
            ))}
            {returns.length === 0 && (
              <div className="h-12 flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function ProductKanbanColumn({ stageId, label, color, items, onComplete }: { stageId: string; label: string; color: string | null; items: ClientProductEnriched[]; onComplete?: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const borderColor = color || '#6b7280';

  return (
    <div
      className={`flex flex-col rounded-lg border-2 min-w-[150px] w-[150px] ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={{ borderColor, backgroundColor: `${borderColor}10` }}
    >
      <div className="px-2 py-1.5 border-b bg-white/50">
        <h3 className="font-semibold text-xs">{label}</h3>
        <span className="text-[10px] text-gray-500">{items.length}</span>
      </div>
      <div ref={setNodeRef} className={`p-1.5 flex-1 overflow-y-auto min-h-[120px] max-h-[300px] ${isOver ? 'bg-primary/5' : ''}`}>
        <SortableContext items={items.map(cp => cp.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {items.map((cp) => (
              <SortableProductCard key={cp.id} cp={cp} onComplete={onComplete} />
            ))}
            {items.length === 0 && (
              <div className="h-12 flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function ReturnsRow({
  data,
  typeFilter,
  setTypeFilter,
}: {
  data: KanbanAllData['returns'];
  typeFilter: 'all' | 'personal' | 'business';
  setTypeFilter: (v: 'all' | 'personal' | 'business') => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [activeReturn, setActiveReturn] = useState<Return | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const updateReturnStatusMutation = useMutation({
    mutationFn: async ({ returnId, status }: { returnId: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/kanban/${returnId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) =>
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/kanban')
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message || "Could not update status", variant: "destructive" });
      queryClient.invalidateQueries({ predicate: (query) =>
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/kanban')
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const ret = event.active.data.current?.ret as Return;
    if (ret) setActiveReturn(ret);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveReturn(null);
    if (!over) return;

    const draggedReturn = active.data.current?.ret as Return;
    if (!draggedReturn) return;

    let targetStatus: string | null = null;
    const overId = over.id.toString();

    if (data.statuses.includes(overId)) {
      targetStatus = overId;
    } else {
      for (const [status, returns] of Object.entries(data.columns)) {
        if (returns.some(r => r.id === overId)) {
          targetStatus = status;
          break;
        }
      }
    }

    if (targetStatus && targetStatus !== draggedReturn.status) {
      queryClient.setQueryData(
        ["/api/admin/kanban-all?type=" + typeFilter],
        (old: KanbanAllData | undefined) => {
          if (!old) return old;
          const newColumns: Record<string, Return[]> = {};
          for (const status of old.returns.statuses) {
            newColumns[status] = old.returns.columns[status]?.filter(r => r.id !== draggedReturn.id) || [];
          }
          newColumns[targetStatus!] = [
            ...newColumns[targetStatus!],
            { ...draggedReturn, status: targetStatus! },
          ];
          return { ...old, returns: { ...old.returns, columns: newColumns } };
        }
      );
      updateReturnStatusMutation.mutate({ returnId: draggedReturn.id, status: targetStatus });
    }
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          {collapsed ? <ChevronRight className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Tax Returns</h3>
            <p className="text-xs text-muted-foreground">{data.totalClients} active client{data.totalClients !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex rounded-lg border overflow-hidden">
            <Button variant={typeFilter === 'all' ? 'default' : 'ghost'} size="sm" className="rounded-none h-7 text-xs px-2" onClick={() => setTypeFilter('all')}>All</Button>
            <Button variant={typeFilter === 'personal' ? 'default' : 'ghost'} size="sm" className="rounded-none border-x h-7 text-xs px-2" onClick={() => setTypeFilter('personal')}>
              <User className="h-3 w-3 mr-1" />Personal
            </Button>
            <Button variant={typeFilter === 'business' ? 'default' : 'ghost'} size="sm" className="rounded-none h-7 text-xs px-2" onClick={() => setTypeFilter('business')}>
              <Building2 className="h-3 w-3 mr-1" />Business
            </Button>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className="px-4 pb-4 border-t">
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
              {data.statuses.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={statusLabels[status] || status}
                  colorClass={statusColors[status] || 'bg-gray-100 border-gray-300'}
                  returns={data.columns[status] || []}
                />
              ))}
            </div>
            <DragOverlay>
              {activeReturn && <ReturnCard ret={activeReturn} isDragging />}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function ProductRowComponent({ row, typeFilter }: { row: ProductRow; typeFilter: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeClientProduct, setActiveClientProduct] = useState<ClientProductEnriched | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const invalidateKanban = () => {
    queryClient.invalidateQueries({ predicate: (query) =>
      typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/kanban')
    });
  };

  const updateClientProductStageMutation = useMutation({
    mutationFn: async ({ id, currentStageId }: { id: string; currentStageId: string }) => {
      return apiRequest("PATCH", `/api/admin/client-products/${id}`, { currentStageId });
    },
    onSuccess: invalidateKanban,
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message || "Could not update stage", variant: "destructive" });
      invalidateKanban();
    },
  });

  const completeProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/client-products/${id}/complete`);
    },
    onSuccess: () => {
      toast({ title: "Marked as complete" });
      invalidateKanban();
    },
    onError: (error: any) => {
      toast({ title: "Failed to complete", description: error.message, variant: "destructive" });
    },
  });

  const reopenProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/client-products/${id}/reopen`);
    },
    onSuccess: () => {
      toast({ title: "Reopened" });
      invalidateKanban();
    },
    onError: (error: any) => {
      toast({ title: "Failed to reopen", description: error.message, variant: "destructive" });
    },
  });

  const handleComplete = (id: string) => {
    completeProductMutation.mutate(id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const cp = event.active.data.current?.cp as ClientProductEnriched;
    if (cp) setActiveClientProduct(cp);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClientProduct(null);
    if (!over) return;

    const draggedCp = active.data.current?.cp as ClientProductEnriched;
    if (!draggedCp) return;

    const overId = over.id.toString();
    const stageIds = row.stages.map(s => s.id);
    let targetStageId: string | null = null;

    if (stageIds.includes(overId)) {
      targetStageId = overId;
    } else {
      for (const cp of row.clientProducts) {
        if (cp.id === overId) {
          targetStageId = cp.currentStageId;
          break;
        }
      }
    }

    if (targetStageId && targetStageId !== draggedCp.currentStageId) {
      queryClient.setQueryData(
        ["/api/admin/kanban-all?type=" + typeFilter],
        (old: KanbanAllData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            productRows: old.productRows.map(pr =>
              pr.productId === row.productId
                ? { ...pr, clientProducts: pr.clientProducts.map(cp => cp.id === draggedCp.id ? { ...cp, currentStageId: targetStageId } : cp) }
                : pr
            ),
          };
        }
      );
      updateClientProductStageMutation.mutate({ id: draggedCp.id, currentStageId: targetStageId });
    }
  };

  const stageColumns = useMemo(() => {
    return row.stages.map(stage => ({
      stage,
      items: row.clientProducts.filter(cp => cp.currentStageId === stage.id),
    }));
  }, [row.stages, row.clientProducts]);

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          {collapsed ? <ChevronRight className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Package className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{row.productName}</h3>
            <p className="text-xs text-muted-foreground">{row.totalClients} active client{row.totalClients !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {row.completedCount > 0 && (
            <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {row.completedCount} completed
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">{row.stages.length} stages</Badge>
        </div>
      </div>
      {!collapsed && (
        <div className="px-4 pb-4 border-t">
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
              {stageColumns.map(({ stage, items }) => (
                <ProductKanbanColumn
                  key={stage.id}
                  stageId={stage.id}
                  label={stage.name}
                  color={stage.color}
                  items={items}
                  onComplete={handleComplete}
                />
              ))}
            </div>
            <DragOverlay>
              {activeClientProduct && <ProductCard cp={activeClientProduct} isDragging />}
            </DragOverlay>
          </DndContext>

          {row.completedCount > 0 && (
            <div className="mt-3 border-t pt-3">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {row.completedCount} completed
              </button>
              {showCompleted && (
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {row.completedProducts.map((cp) => (
                    <div key={cp.id} className="bg-green-50 rounded border border-green-200 px-2 py-1.5 opacity-75">
                      <div className="flex items-start gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{cp.clientName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{cp.name || cp.product?.name}</p>
                        </div>
                        <button
                          onClick={() => reopenProductMutation.mutate(cp.id)}
                          className="p-0.5 rounded hover:bg-green-200 flex-shrink-0"
                          title="Reopen"
                        >
                          <RotateCcw className="h-3 w-3 text-green-700" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminKanban() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'business'>('all');

  const { data, isLoading } = useQuery<KanbanAllData>({
    queryKey: ["/api/admin/kanban-all?type=" + typeFilter],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const hasReturns = data && data.returns.totalClients > 0;
  const activeProductRows = data?.productRows.filter(row => row.clientProducts.length > 0) ?? [];
  const hasProducts = activeProductRows.length > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Workflow Board</h1>
        <p className="text-gray-500">All active services at a glance. Drag clients between stages to update progress.</p>
      </div>

      <div className="space-y-4">
        {hasReturns && (
          <ReturnsRow data={data!.returns} typeFilter={typeFilter} setTypeFilter={setTypeFilter} />
        )}

        {activeProductRows.map((row) => (
          <ProductRowComponent key={row.productId} row={row} typeFilter={typeFilter} />
        ))}

        {!hasReturns && !hasProducts && (
          <div className="text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No active services</p>
            <p className="text-sm">Services will appear here when clients have active returns or products.</p>
          </div>
        )}
      </div>
    </div>
  );
}

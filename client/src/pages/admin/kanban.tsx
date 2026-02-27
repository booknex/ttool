import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  User,
  GripVertical,
  Building2,
  Package,
  ChevronDown,
  ChevronRight,
  FileText,
  MoreVertical,
  CheckCircle2,
  RotateCcw,
  Search,
  ArrowRight,
  ExternalLink,
  Users,
  LayoutGrid,
  Inbox,
  Calendar,
  Archive,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

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
  hasCompletedQuestionnaire: boolean;
  createdAt: string;
  completedAt: string | null;
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
    completedReturns: Return[];
    completedCount: number;
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

const statusAccentColors: Record<string, string> = {
  not_started: "#9ca3af",
  documents_gathering: "#3b82f6",
  information_review: "#eab308",
  return_preparation: "#f97316",
  quality_review: "#8b5cf6",
  client_review: "#ec4899",
  signature_required: "#6366f1",
  filing: "#06b6d4",
  filed: "#22c55e",
};

const statusBgColors: Record<string, string> = {
  not_started: "bg-gray-50",
  documents_gathering: "bg-blue-50/60",
  information_review: "bg-yellow-50/60",
  return_preparation: "bg-orange-50/60",
  quality_review: "bg-purple-50/60",
  client_review: "bg-pink-50/60",
  signature_required: "bg-indigo-50/60",
  filing: "bg-cyan-50/60",
  filed: "bg-green-50/60",
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getInitialColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function ReturnCard({
  ret,
  isDragging,
  onComplete,
  onAdvance,
  showMenu = false,
  searchMatch = true,
}: {
  ret: Return;
  isDragging?: boolean;
  onComplete?: (id: string) => void;
  onAdvance?: (id: string) => void;
  showMenu?: boolean;
  searchMatch?: boolean;
}) {
  const [, navigate] = useLocation();
  return (
    <div className={`bg-white rounded-lg border shadow-sm transition-all group
      ${isDragging ? "shadow-xl ring-2 ring-primary/50 scale-[1.02]" : "hover:shadow-md hover:border-gray-300"}
      ${!searchMatch ? "opacity-30" : ""}
    `}>
      <div className="p-3">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold ${getInitialColor(ret.clientName)}`}>
              {getInitials(ret.clientName)}
            </div>
            <p className="font-semibold text-sm leading-tight">{ret.clientName}</p>
          </div>
          {showMenu && !isDragging && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1 rounded-md hover:bg-gray-100 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${ret.clientId}`); }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  View Client
                </DropdownMenuItem>
                {onAdvance && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdvance(ret.id); }}>
                    <ArrowRight className="h-3.5 w-3.5 mr-2 text-blue-600" />
                    Advance Stage
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onComplete && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(ret.id); }}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{ret.clientEmail}</p>
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 font-medium ${
              ret.returnType === 'personal'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {ret.returnType === 'personal' ? (
              <><User className="h-2.5 w-2.5 mr-0.5" /> Personal</>
            ) : (
              <><Building2 className="h-2.5 w-2.5 mr-0.5" /> Business</>
            )}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{ret.taxYear}</span>
          {ret.returnType !== 'personal' && ret.name && (
            <span className="text-[10px] text-muted-foreground ml-auto">{ret.name}</span>
          )}
        </div>
        {!ret.hasCompletedQuestionnaire && (
          <div className="flex items-center gap-1 mt-2 px-1.5 py-1 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
            <span className="text-[10px] font-medium text-amber-700">Needs Questionnaire</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  cp,
  isDragging,
  onComplete,
  onAdvance,
  onArchive,
  onDelete,
  showMenu = false,
  searchMatch = true,
}: {
  cp: ClientProductEnriched;
  isDragging?: boolean;
  onComplete?: (id: string) => void;
  onAdvance?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  showMenu?: boolean;
  searchMatch?: boolean;
}) {
  const [, navigate] = useLocation();
  return (
    <div className={`bg-white rounded-lg border shadow-sm transition-all group
      ${isDragging ? "shadow-xl ring-2 ring-primary/50 scale-[1.02]" : "hover:shadow-md hover:border-gray-300"}
      ${!searchMatch ? "opacity-30" : ""}
    `}>
      <div className="p-3">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold ${getInitialColor(cp.clientName)}`}>
              {getInitials(cp.clientName)}
            </div>
            <p className="font-semibold text-sm leading-tight">{cp.clientName}</p>
          </div>
          {showMenu && !isDragging && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1 rounded-md hover:bg-gray-100 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${cp.userId}`); }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  View Client
                </DropdownMenuItem>
                {onAdvance && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdvance(cp.id); }}>
                    <ArrowRight className="h-3.5 w-3.5 mr-2 text-blue-600" />
                    Advance Stage
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onComplete && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(cp.id); }}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(cp.id); }}>
                    <Archive className="h-3.5 w-3.5 mr-2 text-amber-600" />
                    Archive
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(cp.id); }} className="text-red-600 focus:text-red-600">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{cp.name || cp.product?.name}</p>
      </div>
    </div>
  );
}

function SortableReturnCard({ ret, onComplete, onAdvance, searchMatch }: { ret: Return; onComplete?: (id: string) => void; onAdvance?: (id: string) => void; searchMatch?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ret.id, data: { ret } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-1" {...listeners}>
        <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 hover:text-gray-500 transition-colors" />
        <div className="flex-1 min-w-0">
          <ReturnCard ret={ret} isDragging={isDragging} onComplete={onComplete} onAdvance={onAdvance} showMenu searchMatch={searchMatch} />
        </div>
      </div>
    </div>
  );
}

function SortableProductCard({ cp, onComplete, onAdvance, onArchive, onDelete, searchMatch }: { cp: ClientProductEnriched; onComplete?: (id: string) => void; onAdvance?: (id: string) => void; onArchive?: (id: string) => void; onDelete?: (id: string) => void; searchMatch?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cp.id, data: { cp } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-1" {...listeners}>
        <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 hover:text-gray-500 transition-colors" />
        <div className="flex-1 min-w-0">
          <ProductCard cp={cp} isDragging={isDragging} onComplete={onComplete} onAdvance={onAdvance} onArchive={onArchive} onDelete={onDelete} showMenu searchMatch={searchMatch} />
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  accentColor,
  bgClass,
  returns,
  onComplete,
  onAdvance,
  searchQuery,
  totalAcrossAll,
}: {
  status: string;
  label: string;
  accentColor: string;
  bgClass: string;
  returns: Return[];
  onComplete?: (id: string) => void;
  onAdvance?: (id: string) => void;
  searchQuery: string;
  totalAcrossAll: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const pct = totalAcrossAll > 0 ? Math.round((returns.length / totalAcrossAll) * 100) : 0;

  return (
    <div className={`flex flex-col rounded-xl border bg-white min-w-[260px] flex-1 overflow-hidden transition-all ${isOver ? 'ring-2 ring-primary/40 ring-offset-1 shadow-lg' : 'shadow-sm'}`}>
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      <div className={`px-3 py-2.5 border-b ${bgClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">{label}</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-900 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center shadow-sm border">
              {returns.length}
            </span>
          </div>
        </div>
        {totalAcrossAll > 0 && (
          <div className="mt-1.5 h-1 bg-gray-200/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: accentColor }} />
          </div>
        )}
      </div>
      <div ref={setNodeRef} className={`p-2 flex-1 overflow-y-auto min-h-[140px] max-h-[420px] transition-colors ${isOver ? 'bg-primary/5' : ''}`}>
        <SortableContext items={returns.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {returns.map((ret) => (
              <SortableReturnCard
                key={ret.id}
                ret={ret}
                onComplete={onComplete}
                onAdvance={onAdvance}
                searchMatch={!searchQuery || ret.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || ret.clientEmail.toLowerCase().includes(searchQuery.toLowerCase())}
              />
            ))}
            {returns.length === 0 && (
              <div className="h-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <Inbox className="h-5 w-5 mb-1" />
                <span className="text-[11px]">No items</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function ProductKanbanColumn({
  stageId,
  label,
  color,
  items,
  onComplete,
  onAdvance,
  onArchive,
  onDelete,
  searchQuery,
  totalAcrossAll,
}: {
  stageId: string;
  label: string;
  color: string | null;
  items: ClientProductEnriched[];
  onComplete?: (id: string) => void;
  onAdvance?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  searchQuery: string;
  totalAcrossAll: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const accentColor = color || '#6b7280';
  const pct = totalAcrossAll > 0 ? Math.round((items.length / totalAcrossAll) * 100) : 0;

  return (
    <div className={`flex flex-col rounded-xl border bg-white min-w-[260px] flex-1 overflow-hidden transition-all ${isOver ? 'ring-2 ring-primary/40 ring-offset-1 shadow-lg' : 'shadow-sm'}`}>
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      <div className="px-3 py-2.5 border-b" style={{ backgroundColor: `${accentColor}08` }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">{label}</h3>
          <span className="text-xs font-bold text-gray-900 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center shadow-sm border">
            {items.length}
          </span>
        </div>
        {totalAcrossAll > 0 && (
          <div className="mt-1.5 h-1 bg-gray-200/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: accentColor }} />
          </div>
        )}
      </div>
      <div ref={setNodeRef} className={`p-2 flex-1 overflow-y-auto min-h-[140px] max-h-[420px] transition-colors ${isOver ? 'bg-primary/5' : ''}`}>
        <SortableContext items={items.map(cp => cp.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((cp) => (
              <SortableProductCard
                key={cp.id}
                cp={cp}
                onComplete={onComplete}
                onAdvance={onAdvance}
                onArchive={onArchive}
                onDelete={onDelete}
                searchMatch={!searchQuery || cp.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || cp.clientEmail.toLowerCase().includes(searchQuery.toLowerCase())}
              />
            ))}
            {items.length === 0 && (
              <div className="h-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <Inbox className="h-5 w-5 mb-1" />
                <span className="text-[11px]">No items</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function PipelineProgressBar({ statuses, columns, accentColors }: { statuses: string[]; columns: Record<string, any[]>; accentColors: Record<string, string> }) {
  const total = statuses.reduce((sum, s) => sum + (columns[s]?.length || 0), 0);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-0.5 h-2.5 rounded-full overflow-hidden bg-gray-100 w-full max-w-md">
      {statuses.map((status) => {
        const count = columns[status]?.length || 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={status}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${pct}%`, backgroundColor: accentColors[status] || '#9ca3af', minWidth: count > 0 ? '4px' : '0' }}
            title={`${statusLabels[status] || status}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function ReturnsRow({
  data,
  typeFilter,
  setTypeFilter,
  searchQuery,
}: {
  data: KanbanAllData['returns'];
  typeFilter: 'all' | 'personal' | 'business';
  setTypeFilter: (v: 'all' | 'personal' | 'business') => void;
  searchQuery: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeReturn, setActiveReturn] = useState<Return | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const invalidateKanban = () => {
    queryClient.invalidateQueries({ predicate: (query) =>
      typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/kanban')
    });
  };

  const updateReturnStatusMutation = useMutation({
    mutationFn: async ({ returnId, status }: { returnId: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/kanban/${returnId}`, { status });
    },
    onSuccess: invalidateKanban,
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message || "Could not update status", variant: "destructive" });
      invalidateKanban();
    },
  });

  const completeReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/returns/${id}/complete`);
    },
    onSuccess: () => {
      toast({ title: "Marked as complete" });
      invalidateKanban();
    },
    onError: (error: any) => {
      toast({ title: "Failed to complete", description: error.message, variant: "destructive" });
    },
  });

  const reopenReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/returns/${id}/reopen`);
    },
    onSuccess: () => {
      toast({ title: "Reopened" });
      invalidateKanban();
    },
    onError: (error: any) => {
      toast({ title: "Failed to reopen", description: error.message, variant: "destructive" });
    },
  });

  const handleComplete = (id: string) => completeReturnMutation.mutate(id);

  const handleAdvance = (id: string) => {
    const allReturns = data.statuses.flatMap(s => data.columns[s] || []);
    const ret = allReturns.find(r => r.id === id);
    if (!ret) return;
    const currentIdx = data.statuses.indexOf(ret.status);
    if (currentIdx < data.statuses.length - 1) {
      const nextStatus = data.statuses[currentIdx + 1];
      queryClient.setQueryData(
        ["/api/admin/kanban-all?type=" + typeFilter],
        (old: KanbanAllData | undefined) => {
          if (!old) return old;
          const newColumns: Record<string, Return[]> = {};
          for (const status of old.returns.statuses) {
            newColumns[status] = old.returns.columns[status]?.filter(r => r.id !== id) || [];
          }
          newColumns[nextStatus] = [...newColumns[nextStatus], { ...ret, status: nextStatus }];
          return { ...old, returns: { ...old.returns, columns: newColumns } };
        }
      );
      updateReturnStatusMutation.mutate({ returnId: id, status: nextStatus });
    }
  };

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

  const totalActive = data.statuses.reduce((sum, s) => sum + (data.columns[s]?.length || 0), 0);

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {collapsed ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900">Tax Returns</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-muted-foreground">{data.totalClients} active</span>
              {data.completedCount > 0 && (
                <span className="text-sm text-green-600 font-medium">{data.completedCount} completed</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="hidden lg:block w-48">
            <PipelineProgressBar statuses={data.statuses} columns={data.columns} accentColors={statusAccentColors} />
          </div>
          <div className="flex rounded-lg border overflow-hidden bg-gray-50">
            <Button variant={typeFilter === 'all' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 text-xs px-3 font-medium" onClick={() => setTypeFilter('all')}>All</Button>
            <Button variant={typeFilter === 'personal' ? 'default' : 'ghost'} size="sm" className="rounded-none border-x h-8 text-xs px-3 font-medium" onClick={() => setTypeFilter('personal')}>
              <User className="h-3.5 w-3.5 mr-1" />Personal
            </Button>
            <Button variant={typeFilter === 'business' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 text-xs px-3 font-medium" onClick={() => setTypeFilter('business')}>
              <Building2 className="h-3.5 w-3.5 mr-1" />Business
            </Button>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className="px-5 pb-5 border-t bg-gray-50/30">
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pt-4 pb-2 -mx-1 px-1">
              {data.statuses.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={statusLabels[status] || status}
                  accentColor={statusAccentColors[status] || '#9ca3af'}
                  bgClass={statusBgColors[status] || 'bg-gray-50'}
                  returns={data.columns[status] || []}
                  onComplete={handleComplete}
                  onAdvance={handleAdvance}
                  searchQuery={searchQuery}
                  totalAcrossAll={totalActive}
                />
              ))}
            </div>
            <DragOverlay>
              {activeReturn && <div className="min-w-[240px]"><ReturnCard ret={activeReturn} isDragging /></div>}
            </DragOverlay>
          </DndContext>

          {data.completedCount > 0 && (
            <div className="mt-4 border-t pt-4">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {data.completedCount} completed return{data.completedCount !== 1 ? 's' : ''}
              </button>
              {showCompleted && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {data.completedReturns.map((ret) => (
                    <div key={ret.id} className="flex items-center gap-2.5 bg-green-50 rounded-lg border border-green-200 px-3 py-2.5 group hover:bg-green-100/80 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold ${getInitialColor(ret.clientName)}`}>
                        {getInitials(ret.clientName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{ret.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {ret.returnType === 'personal' ? 'Personal' : ret.name} · {ret.taxYear}
                        </p>
                      </div>
                      <button
                        onClick={() => reopenReturnMutation.mutate(ret.id)}
                        className="p-1.5 rounded-md hover:bg-green-200 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Reopen"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-green-700" />
                      </button>
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

function ProductRowComponent({ row, typeFilter, searchQuery }: { row: ProductRow; typeFilter: string; searchQuery: string }) {
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

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/client-products/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Service deleted" });
      invalidateKanban();
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const handleComplete = (id: string) => {
    completeProductMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this service? This cannot be undone.")) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleAdvance = (id: string) => {
    const cp = row.clientProducts.find(c => c.id === id);
    if (!cp || !cp.currentStageId) return;
    const currentIdx = row.stages.findIndex(s => s.id === cp.currentStageId);
    if (currentIdx < row.stages.length - 1) {
      const nextStageId = row.stages[currentIdx + 1].id;
      queryClient.setQueryData(
        ["/api/admin/kanban-all?type=" + typeFilter],
        (old: KanbanAllData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            productRows: old.productRows.map(pr =>
              pr.productId === row.productId
                ? { ...pr, clientProducts: pr.clientProducts.map(c => c.id === id ? { ...c, currentStageId: nextStageId } : c) }
                : pr
            ),
          };
        }
      );
      updateClientProductStageMutation.mutate({ id, currentStageId: nextStageId });
    }
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

  const stageProgressColumns: Record<string, any[]> = {};
  const stageAccentColors: Record<string, string> = {};
  row.stages.forEach(s => {
    stageProgressColumns[s.id] = row.clientProducts.filter(cp => cp.currentStageId === s.id);
    stageAccentColors[s.id] = s.color || '#6b7280';
  });

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {collapsed ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900">{row.productName}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-muted-foreground">{row.totalClients} active</span>
              {row.completedCount > 0 && (
                <span className="text-sm text-green-600 font-medium">{row.completedCount} completed</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:block w-48">
            <PipelineProgressBar statuses={row.stages.map(s => s.id)} columns={stageProgressColumns} accentColors={stageAccentColors} />
          </div>
          <Badge variant="secondary" className="text-xs font-medium">{row.stages.length} stages</Badge>
        </div>
      </div>
      {!collapsed && (
        <div className="px-5 pb-5 border-t bg-gray-50/30">
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pt-4 pb-2 -mx-1 px-1">
              {stageColumns.map(({ stage, items }) => (
                <ProductKanbanColumn
                  key={stage.id}
                  stageId={stage.id}
                  label={stage.name}
                  color={stage.color}
                  items={items}
                  onComplete={handleComplete}
                  onAdvance={handleAdvance}
                  onArchive={handleComplete}
                  onDelete={handleDelete}
                  searchQuery={searchQuery}
                  totalAcrossAll={row.totalClients}
                />
              ))}
            </div>
            <DragOverlay>
              {activeClientProduct && <div className="min-w-[240px]"><ProductCard cp={activeClientProduct} isDragging /></div>}
            </DragOverlay>
          </DndContext>

          {row.completedCount > 0 && (
            <div className="mt-4 border-t pt-4">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {row.completedCount} completed
              </button>
              {showCompleted && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {row.completedProducts.map((cp) => (
                    <div key={cp.id} className="flex items-center gap-2.5 bg-green-50 rounded-lg border border-green-200 px-3 py-2.5 group hover:bg-green-100/80 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold ${getInitialColor(cp.clientName)}`}>
                        {getInitials(cp.clientName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{cp.clientName}</p>
                        <p className="text-xs text-muted-foreground">{cp.name || cp.product?.name}</p>
                      </div>
                      <button
                        onClick={() => reopenProductMutation.mutate(cp.id)}
                        className="p-1.5 rounded-md hover:bg-green-200 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Reopen"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-green-700" />
                      </button>
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
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery<KanbanAllData>({
    queryKey: ["/api/admin/kanban-all?type=" + typeFilter],
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const hasReturns = data && (data.returns.totalClients > 0 || data.returns.completedCount > 0);
  const activeProductRows = data?.productRows.filter(row => row.clientProducts.length > 0) ?? [];
  const completedOnlyRows = data?.productRows.filter(row => row.clientProducts.length === 0 && row.completedCount > 0) ?? [];
  const totalCompletedProducts = data?.productRows.reduce((sum, row) => sum + row.completedCount, 0) ?? 0;
  const totalCompletedReturns = data?.returns.completedCount ?? 0;
  const totalCompleted = totalCompletedProducts + totalCompletedReturns;
  const hasProducts = activeProductRows.length > 0;

  const totalActive = (data?.returns.totalClients ?? 0) + activeProductRows.reduce((s, r) => s + r.totalClients, 0);
  const needsAttention = (data?.returns.columns['not_started']?.length ?? 0) + (data?.returns.columns['client_review']?.length ?? 0);
  const inProgress = totalActive - needsAttention;

  return (
    <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <LayoutGrid className="h-7 w-7 text-primary" />
              Workflow Board
            </h1>
            <p className="text-gray-500 mt-1">Manage your pipeline. Drag clients between stages to update progress.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-56 h-9 text-sm"
              />
            </div>
            {totalCompleted > 0 && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showCompleted
                    ? 'bg-green-100 text-green-800 border border-green-300 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {totalCompleted} Completed
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white rounded-xl border shadow-sm px-4 py-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Active Clients</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm px-4 py-3">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{inProgress > 0 ? inProgress : 0}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm px-4 py-3">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Needs Attention</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{needsAttention}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm px-4 py-3">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Completed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalCompleted}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {hasReturns && (
          <ReturnsRow data={data!.returns} typeFilter={typeFilter} setTypeFilter={setTypeFilter} searchQuery={searchQuery} />
        )}

        {activeProductRows.map((row) => (
          <ProductRowComponent key={row.productId} row={row} typeFilter={typeFilter} searchQuery={searchQuery} />
        ))}

        {showCompleted && completedOnlyRows.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-green-200" />
              <span className="text-sm font-semibold text-green-700 px-3">Completed Services</span>
              <div className="h-px flex-1 bg-green-200" />
            </div>
            {completedOnlyRows.map((row) => (
              <ProductRowComponent key={row.productId} row={row} typeFilter={typeFilter} searchQuery={searchQuery} />
            ))}
          </div>
        )}

        {!hasReturns && !hasProducts && (
          <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700">No active services</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Services will appear here when clients have active returns or products assigned to them.</p>
          </div>
        )}
      </div>
    </div>
  );
}

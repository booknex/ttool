import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import { useState } from "react";
import { User, GripVertical, Building2, Filter } from "lucide-react";

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

interface KanbanData {
  columns: Record<string, Return[]>;
  statuses: string[];
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
    <div
      className={`bg-white rounded border shadow-sm px-2 py-1.5 ${
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      }`}
    >
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

function SortableReturnCard({ ret }: { ret: Return }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ret.id, data: { ret } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

function KanbanColumn({
  status,
  returns,
}: {
  status: string;
  returns: Return[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className={`flex flex-col rounded-lg border-2 ${statusColors[status]} min-w-[160px] w-[160px] ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <div className="px-2 py-1.5 border-b bg-white/50">
        <h3 className="font-semibold text-xs">{statusLabels[status]}</h3>
        <span className="text-[10px] text-gray-500">{returns.length}</span>
      </div>
      <div 
        ref={setNodeRef}
        className={`p-1.5 flex-1 overflow-y-auto min-h-[200px] max-h-[calc(100vh-240px)] ${isOver ? 'bg-primary/5' : ''}`}
      >
        <SortableContext items={returns.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {returns.map((ret) => (
              <SortableReturnCard key={ret.id} ret={ret} />
            ))}
            {returns.length === 0 && (
              <div className="h-16 flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function AdminKanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeReturn, setActiveReturn] = useState<Return | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'business'>('all');

  const { data, isLoading } = useQuery<KanbanData>({
    queryKey: ["/api/admin/kanban?type=" + typeFilter],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ returnId, status }: { returnId: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/kanban/${returnId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/kanban')
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message || "Could not update return status",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/kanban')
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const ret = event.active.data.current?.ret as Return;
    if (ret) {
      setActiveReturn(ret);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveReturn(null);

    if (!over || !data) return;

    const draggedReturn = active.data.current?.ret as Return;
    if (!draggedReturn) return;

    let targetStatus: string | null = null;
    const overId = over.id.toString();

    // Check if dropped directly on a column (by column status id)
    if (data.statuses.includes(overId)) {
      targetStatus = overId;
    } else {
      // Check if dropped on a return card - find which column that return is in
      for (const [status, returns] of Object.entries(data.columns)) {
        if (returns.some(r => r.id === overId)) {
          targetStatus = status;
          break;
        }
      }
    }

    if (targetStatus && targetStatus !== draggedReturn.status) {
      // Optimistic update
      queryClient.setQueryData(["/api/admin/kanban?type=" + typeFilter], (old: KanbanData | undefined) => {
        if (!old) return old;
        
        const newColumns: Record<string, Return[]> = {};
        for (const status of old.statuses) {
          newColumns[status] = old.columns[status]?.filter(r => r.id !== draggedReturn.id) || [];
        }
        newColumns[targetStatus] = [
          ...newColumns[targetStatus],
          { ...draggedReturn, status: targetStatus },
        ];
        
        return { ...old, columns: newColumns };
      });

      updateStatusMutation.mutate({
        returnId: draggedReturn.id,
        status: targetStatus,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-4 overflow-x-auto">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-48 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Could not load kanban data</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Returns Workflow Board</h1>
          <p className="text-gray-500">Drag returns between columns to update their preparation status</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'personal' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none border-x"
              onClick={() => setTypeFilter('personal')}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Personal
            </Button>
            <Button
              variant={typeFilter === 'business' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setTypeFilter('business')}
            >
              <Building2 className="h-3.5 w-3.5 mr-1" />
              Business
            </Button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 overflow-x-auto pb-4">
          {data.statuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              returns={data.columns[status] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeReturn && <ReturnCard ret={activeReturn} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { User, GripVertical } from "lucide-react";

interface Client {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  returnPrepStatus: string;
  createdAt: string;
}

interface KanbanData {
  columns: Record<string, Client[]>;
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

function ClientCard({ client, isDragging }: { client: Client; isDragging?: boolean }) {
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ") || client.email;
  
  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-3 ${
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{client.email}</p>
        </div>
      </div>
    </div>
  );
}

function SortableClientCard({ client }: { client: Client }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id, data: { client } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-1">
        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <ClientCard client={client} isDragging={isDragging} />
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  clients,
}: {
  status: string;
  clients: Client[];
}) {
  return (
    <div className={`flex flex-col rounded-lg border-2 ${statusColors[status]} min-w-[200px] w-[200px]`}>
      <div className="p-3 border-b bg-white/50">
        <h3 className="font-semibold text-sm">{statusLabels[status]}</h3>
        <span className="text-xs text-gray-500">{clients.length} clients</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]">
        <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {clients.map((client) => (
              <SortableClientCard key={client.id} client={client} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function AdminKanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeClient, setActiveClient] = useState<Client | null>(null);

  const { data, isLoading } = useQuery<KanbanData>({
    queryKey: ["/api/admin/kanban"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, returnPrepStatus }: { userId: string; returnPrepStatus: string }) => {
      return apiRequest("PATCH", `/api/admin/kanban/${userId}`, { returnPrepStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kanban"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message || "Could not update client status",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kanban"] });
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
    const client = event.active.data.current?.client as Client;
    if (client) {
      setActiveClient(client);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);

    if (!over || !data) return;

    const activeClient = active.data.current?.client as Client;
    if (!activeClient) return;

    let targetStatus: string | null = null;
    for (const [status, clients] of Object.entries(data.columns)) {
      const isInColumn = clients.some(c => c.id === over.id);
      if (isInColumn || over.id === status) {
        targetStatus = status;
        break;
      }
    }

    for (const [status, clients] of Object.entries(data.columns)) {
      if (clients.some(c => c.id === over.id)) {
        targetStatus = status;
        break;
      }
    }

    if (!targetStatus) {
      for (const status of data.statuses) {
        if (over.id.toString().includes(status)) {
          targetStatus = status;
          break;
        }
      }
    }

    if (targetStatus && targetStatus !== activeClient.returnPrepStatus) {
      queryClient.setQueryData(["/api/admin/kanban"], (old: KanbanData | undefined) => {
        if (!old) return old;
        
        const newColumns = { ...old.columns };
        newColumns[activeClient.returnPrepStatus] = newColumns[activeClient.returnPrepStatus].filter(
          c => c.id !== activeClient.id
        );
        newColumns[targetStatus] = [
          ...newColumns[targetStatus],
          { ...activeClient, returnPrepStatus: targetStatus },
        ];
        
        return { ...old, columns: newColumns };
      });

      updateStatusMutation.mutate({
        userId: activeClient.id,
        returnPrepStatus: targetStatus,
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Client Workflow Board</h1>
        <p className="text-gray-500">Drag clients between columns to update their return preparation status</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {data.statuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              clients={data.columns[status] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeClient && <ClientCard client={activeClient} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

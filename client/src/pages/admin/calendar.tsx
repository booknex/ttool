import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  CalendarDays,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-orange-100 text-orange-800 border-orange-200",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
  no_show: "bg-orange-500",
};

type AppointmentWithClient = {
  id: string;
  title: string;
  description: string | null;
  clientId: string | null;
  adminId: string | null;
  startTime: string;
  endTime: string;
  status: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; firstName: string; lastName: string; email: string } | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithClient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showNewClientFields, setShowNewClientFields] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    status: "scheduled",
    location: "",
    notes: "",
  });

  const [newClientData, setNewClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const { data: appointments = [] } = useQuery<AppointmentWithClient[]>({
    queryKey: ["/api/admin/appointments"],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/appointments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({ title: "Appointment created" });
      closeForm();
    },
    onError: () => {
      toast({ title: "Failed to create appointment", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/appointments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({ title: "Appointment updated" });
      closeForm();
    },
    onError: () => {
      toast({ title: "Failed to update appointment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({ title: "Appointment deleted" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete appointment", variant: "destructive" });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/clients", data);
      return res.json();
    },
    onSuccess: (newClient: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setFormData(prev => ({ ...prev, clientId: newClient.id }));
      setShowNewClientFields(false);
      setNewClientData({ firstName: "", lastName: "", email: "" });
      toast({ title: "Client created and selected" });
    },
    onError: () => {
      toast({ title: "Failed to create client", variant: "destructive" });
    },
  });

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentWithClient[]>();
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.startTime), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(apt);
    });
    map.forEach((apts) => apts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    return map;
  }, [appointments]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.filter((c: any) => !c.isAdmin);
    const q = clientSearch.toLowerCase();
    return clients.filter((c: any) => !c.isAdmin && (
      (c.firstName && c.firstName.toLowerCase().includes(q)) ||
      (c.lastName && c.lastName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ));
  }, [clients, clientSearch]);

  const todayAppointments = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    return appointmentsByDate.get(todayKey) || [];
  }, [appointmentsByDate]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => new Date(a.startTime) > now && a.status !== "cancelled" && a.status !== "completed")
      .slice(0, 5);
  }, [appointments]);

  const openNewAppointment = (date?: Date) => {
    const d = date || new Date();
    const dateStr = format(d, "yyyy-MM-dd");
    setFormData({
      title: "",
      description: "",
      clientId: "",
      startDate: dateStr,
      startTime: "09:00",
      endDate: dateStr,
      endTime: "10:00",
      status: "scheduled",
      location: "",
      notes: "",
    });
    setEditingAppointment(null);
    setShowNewClientFields(false);
    setClientSearch("");
    setShowForm(true);
  };

  const openEditAppointment = (apt: AppointmentWithClient) => {
    const startDt = new Date(apt.startTime);
    const endDt = new Date(apt.endTime);
    setFormData({
      title: apt.title,
      description: apt.description || "",
      clientId: apt.clientId || "",
      startDate: format(startDt, "yyyy-MM-dd"),
      startTime: format(startDt, "HH:mm"),
      endDate: format(endDt, "yyyy-MM-dd"),
      endTime: format(endDt, "HH:mm"),
      status: apt.status || "scheduled",
      location: apt.location || "",
      notes: apt.notes || "",
    });
    setEditingAppointment(apt);
    setShowNewClientFields(false);
    setClientSearch("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAppointment(null);
    setShowNewClientFields(false);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!formData.startDate || !formData.startTime) {
      toast({ title: "Start date and time are required", variant: "destructive" });
      return;
    }

    const startTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
    const endTime = new Date(`${formData.endDate || formData.startDate}T${formData.endTime}:00`);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      clientId: formData.clientId || null,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: formData.status,
      location: formData.location.trim() || null,
      notes: formData.notes.trim() || null,
    };

    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCreateNewClient = () => {
    if (!newClientData.email.trim()) {
      toast({ title: "Email is required for new client", variant: "destructive" });
      return;
    }
    createClientMutation.mutate({
      email: newClientData.email.trim(),
      firstName: newClientData.firstName.trim(),
      lastName: newClientData.lastName.trim(),
    });
  };

  const selectedDateAppointments = selectedDate
    ? appointmentsByDate.get(format(selectedDate, "yyyy-MM-dd")) || []
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage appointments and scheduling</p>
        </div>
        <Button onClick={() => openNewAppointment()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-7">
                {WEEKDAYS.map(day => (
                  <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground border-b">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, i) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayAppointments = appointmentsByDate.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] border border-gray-100 p-1 cursor-pointer transition-colors
                        ${!isCurrentMonth ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50/50"}
                        ${isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""}
                      `}
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => openNewAppointment(day)}
                    >
                      <div className={`text-right text-sm mb-1 ${isTodayDate ? "font-bold" : ""}`}>
                        <span className={isTodayDate ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs" : ""}>
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayAppointments.slice(0, 3).map(apt => (
                          <div
                            key={apt.id}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate border ${STATUS_COLORS[apt.status || "scheduled"]}`}
                            onClick={(e) => { e.stopPropagation(); openEditAppointment(apt); }}
                            title={`${apt.title} - ${apt.client ? `${apt.client.firstName} ${apt.client.lastName}` : "No client"}`}
                          >
                            <span className="font-medium">{format(new Date(apt.startTime), "h:mm a")}</span>{" "}
                            {apt.title}
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayAppointments.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDate ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {format(selectedDate, "EEEE, MMM d")}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => openNewAppointment(selectedDate)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedDateAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No appointments</p>
                ) : (
                  selectedDateAppointments.map(apt => (
                    <div
                      key={apt.id}
                      className="p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{apt.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(apt.startTime), "h:mm a")} – {format(new Date(apt.endTime), "h:mm a")}
                          </div>
                          {apt.client && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <User className="w-3 h-3" />
                              {apt.client.firstName} {apt.client.lastName}
                            </div>
                          )}
                          {apt.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {apt.location}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditAppointment(apt)}>
                              <Pencil className="w-3 h-3 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteConfirm(apt.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[apt.status || "scheduled"]}`}>
                          {(apt.status || "scheduled").replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No appointments today</p>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded p-1" onClick={() => openEditAppointment(apt)}>
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[apt.status || "scheduled"]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-xs">{apt.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(apt.startTime), "h:mm a")}
                          {apt.client ? ` · ${apt.client.firstName} ${apt.client.lastName}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No upcoming appointments</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded p-1" onClick={() => openEditAppointment(apt)}>
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[apt.status || "scheduled"]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-xs">{apt.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(apt.startTime), "MMM d, h:mm a")}
                          {apt.client ? ` · ${apt.client.firstName} ${apt.client.lastName}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="apt-title">Title *</Label>
              <Input
                id="apt-title"
                placeholder="e.g. Tax Consultation"
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div>
              <Label>Client</Label>
              {!showNewClientFields ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                  <Select value={formData.clientId || "none"} onValueChange={v => setFormData(p => ({ ...p, clientId: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {filteredClients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowNewClientFields(true)}>
                    <UserPlus className="w-3 h-3" /> Create New Client
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                  <p className="text-xs font-medium">New Client</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First name" value={newClientData.firstName} onChange={e => setNewClientData(p => ({ ...p, firstName: e.target.value }))} />
                    <Input placeholder="Last name" value={newClientData.lastName} onChange={e => setNewClientData(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                  <Input placeholder="Email *" type="email" value={newClientData.email} onChange={e => setNewClientData(p => ({ ...p, email: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleCreateNewClient} disabled={createClientMutation.isPending}>
                      {createClientMutation.isPending ? "Creating..." : "Create & Select"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewClientFields(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="apt-start-date">Start Date *</Label>
                <Input id="apt-start-date" type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value, endDate: p.endDate || e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="apt-start-time">Start Time *</Label>
                <Input id="apt-start-time" type="time" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="apt-end-date">End Date</Label>
                <Input id="apt-end-date" type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="apt-end-time">End Time</Label>
                <Input id="apt-end-time" type="time" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label htmlFor="apt-status">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger id="apt-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="apt-location">Location</Label>
              <Input id="apt-location" placeholder="e.g. Office, Zoom, Phone" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
            </div>

            <div>
              <Label htmlFor="apt-description">Description</Label>
              <Textarea id="apt-description" placeholder="Brief description..." rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <Label htmlFor="apt-notes">Notes</Label>
              <Textarea id="apt-notes" placeholder="Internal notes..." rows={2} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingAppointment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

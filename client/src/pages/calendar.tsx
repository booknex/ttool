import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CalendarDays,
  CheckCircle2,
  Calendar as CalendarIcon,
  Plus,
  Send,
  MoreVertical,
  Pencil,
  Trash2,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import type { Appointment, PersonalEvent } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-purple-100 text-purple-800 border-purple-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-orange-100 text-orange-800 border-orange-200",
};

const STATUS_DOT: Record<string, string> = {
  requested: "bg-purple-500",
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
  no_show: "bg-orange-500",
};

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
];

type CalendarItem = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: "appointment" | "personal";
  status?: string | null;
  location?: string | null;
  description?: string | null;
  color?: string | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ClientCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    preferredDate: "",
    preferredTime: "09:00",
    notes: "",
  });

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    location: "",
    color: "#3b82f6",
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: personalEvents = [] } = useQuery<PersonalEvent[]>({
    queryKey: ["/api/personal-events"],
  });

  const requestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/appointments/request", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Meeting request sent! Your tax preparer will confirm the time." });
      setShowRequestDialog(false);
      setRequestForm({ title: "", description: "", preferredDate: "", preferredTime: "09:00", notes: "" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/personal-events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-events"] });
      toast({ title: "Event added to your calendar" });
      closeEventDialog();
    },
    onError: () => {
      toast({ title: "Failed to add event", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/personal-events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-events"] });
      toast({ title: "Event updated" });
      closeEventDialog();
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/personal-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-events"] });
      toast({ title: "Event deleted" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const allItems = useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];
    appointments.forEach(a => {
      if (a.status !== "cancelled") {
        items.push({
          id: a.id,
          title: a.title,
          startTime: a.startTime as unknown as string,
          endTime: a.endTime as unknown as string,
          type: "appointment",
          status: a.status,
          location: a.location,
          description: a.description,
        });
      }
    });
    personalEvents.forEach(e => {
      items.push({
        id: e.id,
        title: e.title,
        startTime: e.startTime as unknown as string,
        endTime: e.endTime as unknown as string,
        type: "personal",
        location: e.location,
        description: e.description,
        color: e.color,
      });
    });
    return items;
  }, [appointments, personalEvents]);

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

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    allItems.forEach((item) => {
      const dateKey = format(new Date(item.startTime), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(item);
    });
    map.forEach((items) => items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    return map;
  }, [allItems]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => new Date(a.startTime!) > now && a.status !== "cancelled")
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
      .slice(0, 5);
  }, [appointments]);

  const openRequestDialog = (date?: Date) => {
    const d = date || selectedDate || new Date();
    setRequestForm({
      title: "",
      description: "",
      preferredDate: format(d, "yyyy-MM-dd"),
      preferredTime: "09:00",
      notes: "",
    });
    setShowRequestDialog(true);
  };

  const openNewEventDialog = (date?: Date) => {
    const d = date || selectedDate || new Date();
    const dateStr = format(d, "yyyy-MM-dd");
    setEventForm({
      title: "",
      description: "",
      startDate: dateStr,
      startTime: "09:00",
      endDate: dateStr,
      endTime: "10:00",
      location: "",
      color: "#3b82f6",
    });
    setEditingEvent(null);
    setShowEventDialog(true);
  };

  const openEditEventDialog = (event: PersonalEvent) => {
    const startDt = new Date(event.startTime!);
    const endDt = new Date(event.endTime!);
    setEventForm({
      title: event.title,
      description: event.description || "",
      startDate: format(startDt, "yyyy-MM-dd"),
      startTime: format(startDt, "HH:mm"),
      endDate: format(endDt, "yyyy-MM-dd"),
      endTime: format(endDt, "HH:mm"),
      location: event.location || "",
      color: event.color || "#3b82f6",
    });
    setEditingEvent(event);
    setShowEventDialog(true);
  };

  const closeEventDialog = () => {
    setShowEventDialog(false);
    setEditingEvent(null);
  };

  const handleRequestSubmit = () => {
    if (!requestForm.title.trim()) {
      toast({ title: "Please enter a reason for the meeting", variant: "destructive" });
      return;
    }
    requestMutation.mutate(requestForm);
  };

  const handleEventSubmit = () => {
    if (!eventForm.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const selectedDateItems = selectedDate
    ? itemsByDate.get(format(selectedDate, "yyyy-MM-dd")) || []
    : [];

  const getItemStyle = (item: CalendarItem) => {
    if (item.type === "appointment") {
      return STATUS_COLORS[item.status || "scheduled"];
    }
    return "border-l-2 bg-white";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Calendar</h1>
          <p className="text-muted-foreground">Your meetings and personal events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNewEventDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
          <Button onClick={() => openRequestDialog()} className="gap-2">
            <Send className="w-4 h-4" />
            Request Meeting
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                  const dayItems = itemsByDate.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const hasItems = dayItems.length > 0;

                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] border border-gray-100 p-1 cursor-pointer transition-colors
                        ${!isCurrentMonth ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50/50"}
                        ${isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""}
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="text-right text-sm mb-1 flex items-center justify-end gap-1">
                        {hasItems && isCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                        <span className={isTodayDate ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold" : ""}>
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 2).map(item => (
                          <div
                            key={item.id}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate border ${
                              item.type === "appointment"
                                ? STATUS_COLORS[item.status || "scheduled"]
                                : "bg-white"
                            }`}
                            style={item.type === "personal" ? { borderLeftColor: item.color || "#3b82f6", borderLeftWidth: 3 } : undefined}
                          >
                            {item.type === "personal" ? (
                              <span style={{ color: item.color || "#3b82f6" }}>{item.title}</span>
                            ) : (
                              <>{format(new Date(item.startTime), "h:mm a")} {item.title}</>
                            )}
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayItems.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-3 px-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm bg-blue-100 border border-blue-200" />
                  Meeting
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm bg-purple-100 border border-purple-200" />
                  Requested
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm bg-green-100 border border-green-200" />
                  Confirmed
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-500 rounded" />
                  Personal
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {format(selectedDate, "EEEE, MMM d")}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNewEventDialog(selectedDate)} title="Add event">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateItems.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Nothing scheduled</p>
                    <div className="flex gap-2 justify-center mt-3">
                      <Button variant="outline" size="sm" onClick={() => openNewEventDialog(selectedDate)}>
                        <Plus className="w-3 h-3 mr-1" /> Event
                      </Button>
                      <Button size="sm" onClick={() => openRequestDialog(selectedDate)}>
                        <Send className="w-3 h-3 mr-1" /> Meeting
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateItems.map(item => (
                      <div key={item.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {item.type === "personal" && (
                                <Star className="w-3 h-3 shrink-0" style={{ color: item.color || "#3b82f6" }} />
                              )}
                              <p className="font-medium text-sm truncate">{item.title}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                              <Clock className="w-3 h-3" />
                              {format(new Date(item.startTime), "h:mm a")} – {format(new Date(item.endTime), "h:mm a")}
                            </div>
                            {item.location && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3" />
                                {item.location}
                              </div>
                            )}
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{item.description}</p>
                            )}
                          </div>
                          {item.type === "personal" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  const pe = personalEvents.find(e => e.id === item.id);
                                  if (pe) openEditEventDialog(pe);
                                }}>
                                  <Pencil className="w-3 h-3 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm(item.id)}>
                                  <Trash2 className="w-3 h-3 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="mt-2">
                          {item.type === "appointment" ? (
                            <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[item.status || "scheduled"]}`}>
                              {(item.status || "scheduled").replace("_", " ")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]" style={{ borderColor: item.color || "#3b82f6", color: item.color || "#3b82f6" }}>
                              Personal
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                  <Button size="sm" className="mt-2" onClick={() => openRequestDialog()}>
                    <Send className="w-3 h-3 mr-1" /> Request One
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.map(apt => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        const d = new Date(apt.startTime!);
                        setSelectedDate(d);
                        setCurrentMonth(startOfMonth(d));
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[apt.status || "scheduled"]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{apt.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(apt.startTime!), "EEE, MMM d 'at' h:mm a")}
                        </p>
                      </div>
                      {apt.status === "requested" && (
                        <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                          Pending
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Meeting</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Send a meeting request to your tax preparer. They'll confirm the time and details.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="req-title">What do you need to discuss? *</Label>
              <Input
                id="req-title"
                placeholder="e.g. Review my tax return, Ask about deductions"
                value={requestForm.title}
                onChange={e => setRequestForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="req-date">Preferred Date *</Label>
                <Input id="req-date" type="date" value={requestForm.preferredDate} onChange={e => setRequestForm(p => ({ ...p, preferredDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="req-time">Preferred Time *</Label>
                <Input id="req-time" type="time" value={requestForm.preferredTime} onChange={e => setRequestForm(p => ({ ...p, preferredTime: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="req-desc">Additional Details</Label>
              <Textarea id="req-desc" placeholder="Any other details or preferences..." rows={3} value={requestForm.description} onChange={e => setRequestForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestSubmit} disabled={requestMutation.isPending} className="gap-2">
              <Send className="w-4 h-4" />
              {requestMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEventDialog} onOpenChange={(open) => { if (!open) closeEventDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Personal Event"}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editingEvent ? "Update your personal calendar event." : "Add a personal reminder or event to your calendar. Only you can see these."}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="evt-title">Title *</Label>
              <Input id="evt-title" placeholder="e.g. Gather receipts, Call accountant" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="evt-start-date">Date *</Label>
                <Input id="evt-start-date" type="date" value={eventForm.startDate} onChange={e => setEventForm(p => ({ ...p, startDate: e.target.value, endDate: p.endDate || e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="evt-start-time">Time *</Label>
                <Input id="evt-start-time" type="time" value={eventForm.startTime} onChange={e => setEventForm(p => ({ ...p, startTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="evt-end-date">End Date</Label>
                <Input id="evt-end-date" type="date" value={eventForm.endDate} onChange={e => setEventForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="evt-end-time">End Time</Label>
                <Input id="evt-end-time" type="time" value={eventForm.endTime} onChange={e => setEventForm(p => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="evt-location">Location</Label>
              <Input id="evt-location" placeholder="Optional" value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all ${eventForm.color === c.value ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setEventForm(p => ({ ...p, color: c.value }))}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="evt-desc">Notes</Label>
              <Textarea id="evt-desc" placeholder="Optional notes..." rows={2} value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEventDialog}>Cancel</Button>
            <Button onClick={handleEventSubmit} disabled={createEventMutation.isPending || updateEventMutation.isPending}>
              {createEventMutation.isPending || updateEventMutation.isPending ? "Saving..." : editingEvent ? "Update" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event from your calendar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirm && deleteEventMutation.mutate(deleteConfirm)}
            >
              {deleteEventMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

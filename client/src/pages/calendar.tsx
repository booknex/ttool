import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CalendarDays,
  CheckCircle2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import type { Appointment } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-orange-100 text-orange-800 border-orange-200",
};

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
  no_show: "bg-orange-500",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ClientCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
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
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.startTime!), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(apt);
    });
    map.forEach((apts) => apts.sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()));
    return map;
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => new Date(a.startTime!) > now && a.status !== "cancelled")
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
      .slice(0, 5);
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => new Date(a.startTime!) <= now || a.status === "completed")
      .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())
      .slice(0, 5);
  }, [appointments]);

  const selectedDateAppointments = selectedDate
    ? appointmentsByDate.get(format(selectedDate, "yyyy-MM-dd")) || []
    : [];

  const daysWithAppointments = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach(a => {
      if (a.status !== "cancelled") {
        set.add(format(new Date(a.startTime!), "yyyy-MM-dd"));
      }
    });
    return set;
  }, [appointments]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <p className="text-muted-foreground">View your scheduled meetings and appointments</p>
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
                  const dayAppointments = appointmentsByDate.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const hasAppointments = daysWithAppointments.has(dateKey);

                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] border border-gray-100 p-1 cursor-pointer transition-colors
                        ${!isCurrentMonth ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50/50"}
                        ${isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""}
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className={`text-right text-sm mb-1 flex items-center justify-end gap-1`}>
                        {hasAppointments && isCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                        <span className={isTodayDate ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold" : ""}>
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayAppointments.filter(a => a.status !== "cancelled").slice(0, 2).map(apt => (
                          <div
                            key={apt.id}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate border ${STATUS_COLORS[apt.status || "scheduled"]}`}
                          >
                            {format(new Date(apt.startTime!), "h:mm a")} {apt.title}
                          </div>
                        ))}
                        {dayAppointments.filter(a => a.status !== "cancelled").length > 2 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayAppointments.filter(a => a.status !== "cancelled").length - 2} more
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
          {selectedDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {format(selectedDate, "EEEE, MMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateAppointments.filter(a => a.status !== "cancelled").length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No appointments this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateAppointments.filter(a => a.status !== "cancelled").map(apt => (
                      <div key={apt.id} className="p-3 rounded-lg border bg-card">
                        <p className="font-medium text-sm">{apt.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                          <Clock className="w-3 h-3" />
                          {format(new Date(apt.startTime!), "h:mm a")} – {format(new Date(apt.endTime!), "h:mm a")}
                        </div>
                        {apt.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            {apt.location}
                          </div>
                        )}
                        {apt.description && (
                          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{apt.description}</p>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[apt.status || "scheduled"]}`}>
                            {(apt.status || "scheduled").replace("_", " ")}
                          </Badge>
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
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="text-sm text-muted-foreground">No upcoming appointments</p>
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {pastAppointments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Past
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pastAppointments.map(apt => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg opacity-70"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{apt.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(apt.startTime!), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

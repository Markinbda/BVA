import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarDays, MapPin, ChevronLeft, ChevronRight, DollarSign, FileText } from "lucide-react";
import placeholderEvent from "@/assets/placeholder-event.jpg";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface EventLocation {
  name: string;
  address: string | null;
  city: string | null;
}

interface BvaEvent {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  cost: string | null;
  description: string | null;
  image_url: string | null;
  notes: string | null;
  category_id: string | null;
  event_categories: Category | null;
  event_locations: EventLocation | null;
}

// Format a date string (YYYY-MM-DD) for display
const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
};

// Format time string (HH:MM) to 12-hour
const formatTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Events = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<BvaEvent | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Fetch events
  const { data: events = [], isLoading } = useQuery<BvaEvent[]>({
    queryKey: ["events-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*, event_categories(name, color), event_locations(name, address, city)")
        .eq("published", true)
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as any[]) ?? [];
    },
  });

  // Auto-open event if navigated here with an openEventId
  useEffect(() => {
    const openId = (location.state as any)?.openEventId;
    if (!openId || !events.length) return;
    const match = events.find((e) => e.id === openId);
    if (match) setSelectedEvent(match);
  }, [location.state, events]);

  // Fetch categories for filter
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["event-categories-public"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("event_categories").select("*").order("name");
      return (data as any[]) ?? [];
    },
  });

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        !searchQuery ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || ev.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [events, searchQuery, categoryFilter]);

  // Calendar helpers
  const monthStart = currentMonth;
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const startOffset = monthStart.getDay(); // 0=Sun
  const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Get events that fall on a given calendar day (handles multi-day spans)
  const getEventsForDay = (dayStr: string): BvaEvent[] => {
    return filteredEvents.filter((ev) => {
      const start = ev.date;
      const end = ev.end_date || ev.date;
      return dayStr >= start && dayStr <= end;
    });
  };

  const navigateMonth = (dir: -1 | 1) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const displayedMonthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const locationDisplay = (ev: BvaEvent) => {
    if (ev.event_locations) {
      const loc = ev.event_locations;
      return [loc.name, loc.city].filter(Boolean).join(", ");
    }
    return ev.location ?? null;
  };

  return (
    <Layout>
      <PageHeader title="Events & Calendar" subtitle="Tournaments, leagues, and programs" />

      <div className="container mx-auto px-4 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList className="mb-6">
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-2" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          {/* ---- CALENDAR TAB ---- */}
          <TabsContent value="calendar">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToToday} className="text-sm">
                  Today
                </Button>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{displayedMonthLabel}</h2>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
              {Array.from({ length: totalCells }).map((_, idx) => {
                const dayOffset = idx - startOffset;
                const isCurrentMonth = dayOffset >= 0 && dayOffset < monthEnd.getDate();
                const dayNum = dayOffset + 1;
                const year = monthStart.getFullYear();
                const month = monthStart.getMonth();
                const dayStr = isCurrentMonth
                  ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                  : "";
                const isToday = dayStr === todayStr;
                const dayEvents = dayStr ? getEventsForDay(dayStr) : [];
                const extraCount = dayEvents.length > 3 ? dayEvents.length - 3 : 0;

                return (
                  <div
                    key={idx}
                    className={`
                      min-h-[90px] border-r border-b border-border p-1 text-sm
                      ${isCurrentMonth ? "bg-card" : "bg-muted/30"}
                    `}
                  >
                    {isCurrentMonth && (
                      <>
                        <div
                          className={`
                            w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1
                            ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}
                          `}
                        >
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const catColor = ev.event_categories?.color ?? "#6b7280";
                            return (
                              <button
                                key={ev.id + dayStr}
                                onClick={() => setSelectedEvent(ev)}
                                className="w-full text-left rounded px-1 py-0.5 text-xs truncate font-medium hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: `${catColor}25`, color: catColor }}
                                title={ev.title}
                              >
                                {ev.start_time ? `${formatTime(ev.start_time)} ` : ""}{ev.title}
                              </button>
                            );
                          })}
                          {extraCount > 0 && (
                            <p className="text-xs text-muted-foreground pl-1">+{extraCount} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ---- LIST TAB ---- */}
          <TabsContent value="list">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No events found.</div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((ev, i) => {
                  const cat = ev.event_categories;
                  const locText = locationDisplay(ev);
                  return (
                    <Card
                      key={ev.id}
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer opacity-0 animate-slide-up"
                      style={{ animationDelay: `${i * 60}ms` }}
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <CardContent className="flex flex-col gap-4 p-0 md:flex-row">
                        {ev.image_url ? (
                          <img
                            src={ev.image_url}
                            alt={ev.title}
                            className="w-full md:w-40 h-36 md:h-auto object-cover shrink-0"
                          />
                        ) : (
                          <img
                            src={placeholderEvent}
                            alt=""
                            className="w-full md:w-40 h-36 md:h-auto object-cover shrink-0 opacity-50"
                          />
                        )}
                        <div className="flex-1 p-4">
                          <div className="flex items-start gap-2 flex-wrap mb-1">
                            {cat && (
                              <Badge
                                className="text-xs shrink-0"
                                style={{
                                  backgroundColor: `${cat.color}20`,
                                  color: cat.color,
                                  borderColor: `${cat.color}40`,
                                }}
                                variant="secondary"
                              >
                                {cat.name}
                              </Badge>
                            )}
                            <h3 className="font-heading text-lg font-semibold leading-tight">{ev.title}</h3>
                          </div>
                          {ev.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(ev.date)}
                              {ev.start_time ? ` at ${formatTime(ev.start_time)}` : ""}
                            </span>
                            {locText && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {locText}
                              </span>
                            )}
                            {ev.cost && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> {ev.cost}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              {selectedEvent.image_url && (
                <div className="w-full h-48 overflow-hidden rounded-lg mb-2 -mt-1 cursor-zoom-in" onClick={() => setLightboxUrl(selectedEvent.image_url)}>
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              )}
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {selectedEvent.event_categories && (
                    <Badge
                      style={{
                        backgroundColor: `${selectedEvent.event_categories.color}20`,
                        color: selectedEvent.event_categories.color,
                        borderColor: `${selectedEvent.event_categories.color}40`,
                      }}
                      variant="secondary"
                      className="text-xs"
                    >
                      {selectedEvent.event_categories.name}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl leading-tight">{selectedEvent.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2 text-sm">
                {/* Date & Time */}
                <div className="flex items-start gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p>{formatDate(selectedEvent.date)}{selectedEvent.start_time ? ` at ${formatTime(selectedEvent.start_time)}` : ""}</p>
                    {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.date && (
                      <p>
                        to {formatDate(selectedEvent.end_date)}
                        {selectedEvent.end_time ? ` at ${formatTime(selectedEvent.end_time)}` : ""}
                      </p>
                    )}
                    {!selectedEvent.end_date && selectedEvent.end_time && (
                      <p>Ends at {formatTime(selectedEvent.end_time)}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                {(selectedEvent.event_locations || selectedEvent.location) && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      {selectedEvent.event_locations ? (
                        <>
                          <p className="font-medium text-foreground">{selectedEvent.event_locations.name}</p>
                          {selectedEvent.event_locations.address && (
                            <p>{selectedEvent.event_locations.address}</p>
                          )}
                          {selectedEvent.event_locations.city && (
                            <p>{selectedEvent.event_locations.city}</p>
                          )}
                        </>
                      ) : (
                        <p>{selectedEvent.location}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Cost */}
                {selectedEvent.cost && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span>{selectedEvent.cost}</span>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.description && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-foreground whitespace-pre-line leading-relaxed">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedEvent.notes && (
                  <div className="flex items-start gap-2 text-muted-foreground border-t border-border pt-3">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="italic">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl w-full p-2 bg-black/90 border-0" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Full size"
              className="w-full h-auto max-h-[85vh] object-contain rounded cursor-zoom-out"
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Events;

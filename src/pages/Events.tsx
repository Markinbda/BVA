import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, MapPin, Download } from "lucide-react";
import placeholderEvent from "@/assets/placeholder-event.jpg";

const fallbackEvents = [
  { id: "1", title: "Summer Beach League Opens", date: "2025-05-05", location: "Horseshoe Bay Beach", cost: "$100-200/team", description: "Summer beach volleyball league kicks off" },
  { id: "2", title: "Indoor League Night", date: "2025-03-05", location: "CedarBridge Gym", cost: "Free for members", description: "Weekly indoor league play" },
  { id: "3", title: "March Break Youth Camp", date: "2025-03-17", location: "CedarBridge Academy", cost: "$300", description: "Week-long youth volleyball camp for ages 8-16" },
];

const Events = () => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("published", true)
        .order("date", { ascending: true });
      return (data as any[]) ?? [];
    },
  });

  const displayEvents = events?.length ? events : fallbackEvents;

  return (
    <Layout>
      <PageHeader title="Events" subtitle="Upcoming tournaments, leagues, and programs" />
      <div className="container mx-auto px-4 py-12">
        {/* Schedule Download */}
        <Card className="mb-8 opacity-0 animate-fade-in">
          <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <CalendarIcon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="font-heading font-semibold uppercase">BVA Schedule</p>
                <p className="text-sm text-muted-foreground">Download the full BVA schedule for the current season</p>
              </div>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Download className="mr-2 h-4 w-4" /> Download Schedule
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {displayEvents.map((event: any, i: number) => (
              <Card key={event.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg overflow-hidden">
                    <img src={event.image_url || placeholderEvent} alt={event.title} className="h-14 w-14 object-cover rounded-lg" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {event.date}</span>
                      {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>}
                    </div>
                  </div>
                  {event.cost && (
                    <div className="text-right">
                      <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">{event.cost}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Events;

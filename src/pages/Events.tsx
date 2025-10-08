import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ExternalLink, Calendar as CalendarIcon, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { EventDialog } from "@/components/admin/EventDialog";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  registration_url: string;
  created_at: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventDialog, setEventDialog] = useState<{ open: boolean; event?: Event }>({ open: false });
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchEvents();
  }, []);

  const checkAdminAndFetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "administrator")
        .single();
      setIsAdmin(!!roleData);
    }
    fetchEvents();
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const isPastEvent = (eventDate: string) => {
    return new Date(eventDate) < new Date();
  };

  const isUpcoming = (eventDate: string) => {
    const days = Math.ceil((new Date(eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days <= 7 && days >= 0;
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted successfully" });
      fetchEvents();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Events Calendar</h2>
            <p className="text-muted-foreground">
              View and register for upcoming training sessions and events
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setEventDialog({ open: true })}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No upcoming events</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for new training sessions and events
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-medium transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        {isUpcoming(event.event_date) && (
                          <Badge variant="default">Upcoming</Badge>
                        )}
                        {isPastEvent(event.event_date) && (
                          <Badge variant="secondary">Past Event</Badge>
                        )}
                      </div>
                      {event.description && (
                        <CardDescription className="text-base mt-2">
                          {event.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.event_date), "MMMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.event_date), "h:mm a")}
                        </div>
                      </div>
                    </div>
                    {event.registration_url && !isPastEvent(event.event_date) && (
                      <Button asChild>
                        <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Register
                        </a>
                      </Button>
                    )}
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEventDialog({ open: true, event })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
      <EventDialog
        open={eventDialog.open}
        onOpenChange={(open) => setEventDialog({ open })}
        event={eventDialog.event}
        onSuccess={fetchEvents}
      />
    </DashboardLayout>
  );
};

export default Events;

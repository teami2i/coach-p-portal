import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, FileText, BookOpen, Calendar, TrendingUp, Award } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [stats, setStats] = useState({
    documents: 0,
    courses: 0,
    events: 0,
  });
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Fetch counts
      const [docsRes, coursesRes, eventsRes] = await Promise.all([
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        documents: docsRes.count || 0,
        courses: coursesRes.count || 0,
        events: eventsRes.count || 0,
      });
    };

    fetchData();
  }, []);

  const quickActions = [
    {
      title: "Classroom",
      description: "Continue learning",
      icon: BookOpen,
      count: stats.courses,
      link: "/courses",
      color: "text-accent",
      featured: true,
    },
    {
      title: "Documents",
      description: "Access resources",
      icon: FileText,
      count: stats.documents,
      link: "/documents",
      color: "text-primary",
      featured: false,
    },
    {
      title: "Events",
      description: "Upcoming sessions",
      icon: Calendar,
      count: stats.events,
      link: "/events",
      color: "text-primary",
      featured: false,
    },
    {
      title: "Leaderboard",
      description: "View rankings",
      icon: TrendingUp,
      count: 0,
      link: "/leaderboard",
      color: "text-accent",
      featured: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="border-l-4 border-accent pl-4">
          <h2 className="text-3xl font-serif font-bold text-primary">
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ""}!
          </h2>
          <p className="text-muted-foreground text-lg">
            Continue your journey to success.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.link} to={action.link}>
              <Card className={`hover:shadow-medium transition-all cursor-pointer group ${
                action.featured ? 'border-2 border-accent shadow-gold' : ''
              }`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {action.title}
                  </CardTitle>
                  <action.icon className={`h-4 w-4 ${action.color} group-hover:scale-110 transition-transform`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${action.featured ? 'text-accent' : ''}`}>
                    {action.count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Continue Learning
              </CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No courses in progress yet. Start a course to see your progress here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Upcoming Events
              </CardTitle>
              <CardDescription>Don't miss important sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No upcoming events scheduled. Check back later for new training sessions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card className="bg-gradient-to-br from-primary to-primary-glow text-white shadow-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="h-5 w-5" />
              Performance Overview
            </CardTitle>
            <CardDescription className="text-white/80">Track your monthly performance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/90">
              Add your sales metrics to compete on the leaderboard and track your progress.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

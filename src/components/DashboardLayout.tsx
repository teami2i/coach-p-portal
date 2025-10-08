import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Video, 
  FileText, 
  Calendar, 
  TrendingUp, 
  BookOpen,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import coachPLogo from "@/assets/coach-p-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAgencyOwner, setIsAgencyOwner] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["administrator", "agency_owner"]);
      
      setIsAdmin(roleData?.some(r => r.role === "administrator") || false);
      setIsAgencyOwner(roleData?.some(r => r.role === "agency_owner") || false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        navigate("/auth");
        setIsAdmin(false);
        setIsAgencyOwner(false);
      } else {
        setUser(session.user);
        
        // Check if user is admin or agency owner
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .in("role", ["administrator", "agency_owner"]);
        
        setIsAdmin(roleData?.some(r => r.role === "administrator") || false);
        setIsAgencyOwner(roleData?.some(r => r.role === "agency_owner") || false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    navigate("/");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "Classroom", path: "/courses" },
    { icon: FileText, label: "Downloads", path: "/documents" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Users, label: "Team", path: "/team" },
    { icon: TrendingUp, label: "Leaderboard", path: "/leaderboard" },
  ];

  const adminNavItems = [
    { icon: Shield, label: "Admin", path: "/admin" },
  ];

  const agencyOwnerNavItems = [
    { icon: Building2, label: "My Agency", path: "/agency" },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar - Skool Style */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft">
        <div className="flex h-16 items-center gap-6 px-6">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={coachPLogo} alt="Coach P Portal" className="h-10 w-10" />
            <div className="flex flex-col leading-none">
              <span className="text-lg font-serif font-bold text-primary tracking-[0.2em]">COACH P</span>
              <span className="text-xs font-serif font-semibold text-accent tracking-[0.15em]">PORTAL</span>
            </div>
          </Link>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            
            {isAdmin && adminNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}

            {isAgencyOwner && agencyOwnerNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden ml-auto"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Mobile Menu */}
        {sidebarOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="flex flex-col p-2">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              
              {isAdmin && adminNavItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}

              {isAgencyOwner && agencyOwnerNavItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}

              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start mt-2">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

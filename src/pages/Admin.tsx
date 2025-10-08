import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Shield, BookOpen, Calendar, FileText, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { CourseDialog } from "@/components/admin/CourseDialog";
import { EventDialog } from "@/components/admin/EventDialog";
import { DocumentDialog } from "@/components/admin/DocumentDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditableCell } from "@/components/admin/EditableCell";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface UserWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  agency_city: string | null;
  agency_state: string | null;
  agency_name: string | null;
  created_at: string;
  agencyOwners: string[];
  roles: string[];
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [agencyOwners, setAgencyOwners] = useState<Array<{ id: string; name: string; city?: string; state?: string }>>([]);
  const [agencyOwnerName, setAgencyOwnerName] = useState("");
  const [agencyOwnerEmail, setAgencyOwnerEmail] = useState("");
  const [creatingAgencyOwner, setCreatingAgencyOwner] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterAgency, setFilterAgency] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [agencySearchOpen, setAgencySearchOpen] = useState(false);
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
    role: string;
    action: "add" | "remove";
  } | null>(null);
  
  // Content management states
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [courseDialog, setCourseDialog] = useState<{ open: boolean; course?: any }>({ open: false });
  const [eventDialog, setEventDialog] = useState<{ open: boolean; event?: any }>({ open: false });
  const [documentDialog, setDocumentDialog] = useState<{ open: boolean; document?: any }>({ open: false });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAccessAndFetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (filterRole !== "all") {
      filtered = filtered.filter((user) => user.roles.includes(filterRole));
    }

    if (filterAgency !== "all") {
      const selectedOwner = agencyOwners.find((o) => o.id === filterAgency);
      if (selectedOwner) {
        filtered = filtered.filter((user) => 
          user.agencyOwners.includes(selectedOwner.name) || user.id === filterAgency
        );
      }
    }

    if (filterCity !== "all") {
      filtered = filtered.filter((user) => user.agency_city === filterCity);
    }

    if (filterState !== "all") {
      filtered = filtered.filter((user) => user.agency_state === filterState);
    }

    if (searchQuery) {
      filtered = filtered.filter((user) => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case "name":
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case "phone":
            aValue = a.phone_number || "";
            bValue = b.phone_number || "";
            break;
          case "city":
            aValue = a.agency_city || "";
            bValue = b.agency_city || "";
            break;
          case "state":
            aValue = a.agency_state || "";
            bValue = b.agency_state || "";
            break;
          case "roles":
            aValue = a.roles.length;
            bValue = b.roles.length;
            break;
          case "agencies":
            aValue = a.agencyOwners.length;
            bValue = b.agencyOwners.length;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredUsers(filtered);
  }, [users, filterRole, filterAgency, filterCity, filterState, searchQuery, agencyOwners, sortField, sortDirection]);

  // Get unique cities and states from users
  const uniqueCities = useMemo(() => {
    const cities = users
      .map(u => u.agency_city)
      .filter((city): city is string => !!city);
    return Array.from(new Set(cities)).sort();
  }, [users]);

  const uniqueStates = useMemo(() => {
    const states = users
      .map(u => u.agency_state)
      .filter((state): state is string => !!state);
    return Array.from(new Set(states)).sort();
  }, [users]);

  const filteredAgencyOwners = useMemo(() => {
    if (!agencySearchQuery) return agencyOwners;
    const query = agencySearchQuery.toLowerCase();
    return agencyOwners.filter(owner => 
      owner.name.toLowerCase().includes(query) ||
      owner.city?.toLowerCase().includes(query) ||
      owner.state?.toLowerCase().includes(query)
    );
  }, [agencyOwners, agencySearchQuery]);

  const checkAccessAndFetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is administrator
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "administrator")
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Parallelize initial data fetching for faster load
      await Promise.all([
        fetchUsers(),
        fetchAgencyOwners()
      ]);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Course deleted" });
      fetchContent();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted" });
      fetchContent();
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document deleted" });
      fetchContent();
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profiles) return;

    // Fetch roles for all users
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Fetch team-agency relationships
    const { data: teamRelations } = await supabase
      .from("team_agency_owners")
      .select(`
        user_id,
        agency_owner:profiles!team_agency_owners_agency_owner_id_fkey(first_name, last_name, email)
      `);

    const usersWithRoles = profiles.map((profile: any) => {
      const userRelations = teamRelations?.filter((r: any) => r.user_id === profile.id) || [];
      const agencyOwners = userRelations.map((r: any) => 
        `${r.agency_owner?.first_name || ""} ${r.agency_owner?.last_name || ""}`.trim() || r.agency_owner?.email || ""
      ).filter(name => name);

      return {
        id: profile.id,
        email: profile.email || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone_number: profile.phone_number || null,
        agency_city: profile.agency_city || null,
        agency_state: profile.agency_state || null,
        agency_name: profile.agency_name || null,
        created_at: profile.created_at,
        agencyOwners,
        roles: rolesData?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
      };
    });

    setUsers(usersWithRoles);
    setFilteredUsers(usersWithRoles);
  };

  const fetchAgencyOwners = async () => {
    // Get all users with agency_owner role
    const { data: ownerRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "agency_owner");

    if (!ownerRoles || ownerRoles.length === 0) {
      setAgencyOwners([]);
      return;
    }

    const ownerIds = ownerRoles.map(r => r.user_id);
    
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, agency_name, agency_city, agency_state")
      .in("id", ownerIds)
      .order("first_name");

    if (owners) {
      setAgencyOwners(
        owners.map(owner => ({
          id: owner.id,
          name: owner.agency_name || `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || owner.email,
          city: owner.agency_city,
          state: owner.agency_state,
        }))
      );
    }
  };

  const fetchContent = async () => {
    if (contentLoaded) return; // Don't fetch if already loaded
    
    setContentLoading(true);
    try {
      const [coursesData, eventsData, documentsData] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("events").select("*").order("event_date", { ascending: false }),
        supabase.from("documents").select("*").order("created_at", { ascending: false }),
      ]);

      if (coursesData.data) setCourses(coursesData.data);
      if (eventsData.data) setEvents(eventsData.data);
      if (documentsData.data) setDocuments(documentsData.data);
      setContentLoaded(true);
    } finally {
      setContentLoading(false);
    }
  };

  const handleCreateAgencyOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAgencyOwner(true);

    try {
      // Check if user already exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", agencyOwnerEmail)
        .maybeSingle();

      let userId: string;

      if (profile) {
        // User exists, just assign agency_owner role
        userId = profile.id;
        
        // Update their name
        await supabase
          .from("profiles")
          .update({ 
            first_name: agencyOwnerName.split(' ')[0] || agencyOwnerName,
            last_name: agencyOwnerName.split(' ').slice(1).join(' ') || ''
          })
          .eq("id", userId);
      } else {
        // Create new user
        const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";
        
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: agencyOwnerEmail,
          password: tempPassword,
          options: {
            data: {
              first_name: agencyOwnerName.split(' ')[0] || agencyOwnerName,
              last_name: agencyOwnerName.split(' ').slice(1).join(' ') || '',
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create user");
        
        userId = authData.user.id;
      }

      // Assign agency_owner role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "agency_owner",
        });

      if (roleError && !roleError.message.includes('duplicate key')) {
        throw roleError;
      }

      toast({
        title: "Agency Owner Created",
        description: `${agencyOwnerName} has been created as an agency owner.`,
      });

      setAgencyOwnerName("");
      setAgencyOwnerEmail("");
      await Promise.all([fetchUsers(), fetchAgencyOwners()]);
    } catch (error: any) {
      console.error("Error creating agency owner:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create agency owner.",
        variant: "destructive",
      });
    } finally {
      setCreatingAgencyOwner(false);
    }
  };


  const confirmRoleChange = async () => {
    if (!roleChangeDialog) return;

    try {
      if (roleChangeDialog.action === "add") {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: roleChangeDialog.userId,
            role: roleChangeDialog.role as "team_member" | "team_manager" | "administrator" | "agency_owner",
          });

        if (error) throw error;

        toast({
          title: "Role Assigned",
          description: `${roleChangeDialog.role} role has been assigned to ${roleChangeDialog.email}.`,
        });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", roleChangeDialog.userId)
          .eq("role", roleChangeDialog.role as "team_member" | "team_manager" | "administrator" | "agency_owner");

        if (error) throw error;

        toast({
          title: "Role Removed",
          description: `${roleChangeDialog.role} role has been removed from ${roleChangeDialog.email}.`,
        });
      }

      await fetchUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast({
        title: "Error",
        description: "Failed to change role.",
        variant: "destructive",
      });
    } finally {
      setRoleChangeDialog(null);
    }
  };

  const handleAddRole = (userId: string, email: string, role: string) => {
    setRoleChangeDialog({
      open: true,
      userId,
      email,
      role,
      action: "add",
    });
  };

  const handleRemoveRole = (userId: string, email: string, role: string) => {
    setRoleChangeDialog({
      open: true,
      userId,
      email,
      role,
      action: "remove",
    });
  };

  const handleUpdateUserField = async (userId: string, field: string, value: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "User information has been updated.",
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, agencies, and platform content</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6" onValueChange={(value) => {
          if (value === "content" && !contentLoaded) {
            fetchContent();
          }
        }}>
          <TabsList>
            <TabsTrigger value="users">Users & Agencies</TabsTrigger>
            <TabsTrigger value="content">Content Management</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">

            {/* Create User Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create New User
                </CardTitle>
                <CardDescription>
                  Directly create a new user account with a role and optional agency assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCreateUserOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </CardContent>
            </Card>

            {/* Create Agency Owner Section */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Create Agency Owner
            </CardTitle>
            <CardDescription>
              Create a new insurance agency owner who can manage their own team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAgencyOwner} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agencyOwnerName">Agency Owner Name</Label>
                  <Input
                    id="agencyOwnerName"
                    type="text"
                    placeholder="John Doe"
                    value={agencyOwnerName}
                    onChange={(e) => setAgencyOwnerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencyOwnerEmail">Owner Email</Label>
                  <Input
                    id="agencyOwnerEmail"
                    type="email"
                    placeholder="owner@agency.com"
                    value={agencyOwnerEmail}
                    onChange={(e) => setAgencyOwnerEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={creatingAgencyOwner}>
                {creatingAgencyOwner ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Create Agency Owner
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              View all users and manage their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="agency_owner">Agency Owner</SelectItem>
                      <SelectItem value="team_manager">Team Manager</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Popover open={agencySearchOpen} onOpenChange={setAgencySearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={agencySearchOpen}
                        className="w-[240px] justify-between"
                      >
                        {filterAgency !== "all"
                          ? agencyOwners.find(o => o.id === filterAgency)?.name || "Select agency..."
                          : "Filter by agency"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0 bg-background z-50">
                      <Command className="bg-background">
                        <CommandInput 
                          placeholder="Search agencies..." 
                          value={agencySearchQuery}
                          onValueChange={setAgencySearchQuery}
                        />
                        <CommandEmpty>No agency found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          <CommandItem
                            onSelect={() => {
                              setFilterAgency("all");
                              setAgencySearchOpen(false);
                              setAgencySearchQuery("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterAgency === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            All Agencies
                          </CommandItem>
                          {filteredAgencyOwners.map((owner) => (
                            <CommandItem
                              key={owner.id}
                              onSelect={() => {
                                setFilterAgency(owner.id);
                                setAgencySearchOpen(false);
                                setAgencySearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterAgency === owner.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{owner.name}</span>
                                {(owner.city || owner.state) && (
                                  <span className="text-xs text-muted-foreground">
                                    {[owner.city, owner.state].filter(Boolean).join(", ")}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {filterAgency !== "all" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        setFilterAgency("all");
                        setAgencySearchQuery("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterState} onValueChange={setFilterState}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by state" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center">
                        Email
                        <SortIcon field="email" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("phone")}
                    >
                      <div className="flex items-center">
                        Phone
                        <SortIcon field="phone" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("city")}
                    >
                      <div className="flex items-center">
                        Agency City
                        <SortIcon field="city" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("state")}
                    >
                      <div className="flex items-center">
                        Agency State
                        <SortIcon field="state" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("roles")}
                    >
                      <div className="flex items-center">
                        Roles
                        <SortIcon field="roles" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("agencies")}
                    >
                      <div className="flex items-center">
                        Agency Owners
                        <SortIcon field="agencies" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <EditableCell
                              value={user.first_name}
                              onSave={(value) => handleUpdateUserField(user.id, "first_name", value)}
                              placeholder="First name"
                            />
                            <EditableCell
                              value={user.last_name}
                              onSave={(value) => handleUpdateUserField(user.id, "last_name", value)}
                              placeholder="Last name"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={user.email}
                            onSave={(value) => handleUpdateUserField(user.id, "email", value)}
                            placeholder="Email"
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={user.phone_number}
                            onSave={(value) => handleUpdateUserField(user.id, "phone_number", value)}
                            placeholder="No phone"
                            type="phone"
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={user.agency_city}
                            onSave={(value) => handleUpdateUserField(user.id, "agency_city", value)}
                            placeholder="No city"
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={user.agency_state}
                            onSave={(value) => handleUpdateUserField(user.id, "agency_state", value)}
                            placeholder="No state"
                            maxLength={2}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge 
                                  key={role} 
                                  variant="secondary" 
                                  className="cursor-pointer" 
                                  onClick={() => handleRemoveRole(user.id, user.email, role)}
                                >
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.agencyOwners.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {user.agencyOwners.map((owner, idx) => (
                                <Badge key={idx} variant="outline">
                                  {owner}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select onValueChange={(role) => handleAddRole(user.id, user.email, role)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Add role" />
                            </SelectTrigger>
                            <SelectContent>
                              {!user.roles.includes("team_member") && (
                                <SelectItem value="team_member">Team Member</SelectItem>
                              )}
                              {!user.roles.includes("team_manager") && (
                                <SelectItem value="team_manager">Team Manager</SelectItem>
                              )}
                              {!user.roles.includes("agency_owner") && (
                                <SelectItem value="agency_owner">Agency Owner</SelectItem>
                              )}
                              {!user.roles.includes("administrator") && (
                                <SelectItem value="administrator">Administrator</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {contentLoading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
            {/* Courses Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Courses
                    </CardTitle>
                    <CardDescription>Manage course content</CardDescription>
                  </div>
                  <Button onClick={() => setCourseDialog({ open: true })}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Create Course
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No courses yet</p>
                  ) : (
                    courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">{course.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                            Manage Content
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCourseDialog({ open: true, course })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Events Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Events
                    </CardTitle>
                    <CardDescription>Manage upcoming events</CardDescription>
                  </div>
                  <Button onClick={() => setEventDialog({ open: true })}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events yet</p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.event_date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEventDialog({ open: true, event })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documents
                    </CardTitle>
                    <CardDescription>Manage document library</CardDescription>
                  </div>
                  <Button onClick={() => setDocumentDialog({ open: true })}>
                    <FileText className="mr-2 h-4 w-4" />
                    Add Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents yet</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">{doc.category}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setDocumentDialog({ open: true, document: doc })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteDocument(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onSuccess={() => {
          fetchUsers();
          fetchAgencyOwners();
        }}
        agencyOwners={agencyOwners}
      />
      
      <CourseDialog
        open={courseDialog.open}
        onOpenChange={(open) => setCourseDialog({ open })}
        course={courseDialog.course}
        onSuccess={fetchContent}
      />

      <EventDialog
        open={eventDialog.open}
        onOpenChange={(open) => setEventDialog({ open })}
        event={eventDialog.event}
        onSuccess={fetchContent}
      />

      <DocumentDialog
        open={documentDialog.open}
        onOpenChange={(open) => setDocumentDialog({ open })}
        document={documentDialog.document}
        onSuccess={fetchContent}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={roleChangeDialog?.open || false} onOpenChange={(open) => !open && setRoleChangeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleChangeDialog?.action === "add" ? "Assign Role" : "Remove Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangeDialog?.action === "add"
                ? `Are you sure you want to assign the "${roleChangeDialog?.role}" role to ${roleChangeDialog?.email}?`
                : `Are you sure you want to remove the "${roleChangeDialog?.role}" role from ${roleChangeDialog?.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Admin;

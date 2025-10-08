import { useEffect, useState } from "react";
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
import { Loader2, UserPlus, Mail } from "lucide-react";
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

interface TeamMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: string[];
}

const AgencyManagement = () => {
  const [loading, setLoading] = useState(true);
  const [agencyOwnerName, setAgencyOwnerName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"team_member" | "team_manager">("team_member");
  const [inviting, setInviting] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
    role: string;
    action: "add" | "remove";
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is agency owner
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_owner")
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

      // Get agency owner profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      if (profile) {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
        setAgencyOwnerName(name);
      }

      await fetchTeamMembers(user.id);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (ownerId: string) => {
    // Get team members who have this user as their agency_owner_id
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, created_at")
      .eq("agency_owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (!profiles) return;

    // Fetch roles for all team members
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const membersWithRoles = profiles.map((profile: any) => ({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      created_at: profile.created_at,
      roles: rolesData?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
    }));

    setTeamMembers(membersWithRoles);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, agency_owner_id")
        .eq("email", inviteEmail)
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.agency_owner_id) {
          toast({
            title: "User Already in Team",
            description: "This user is already part of a team.",
            variant: "destructive",
          });
          setInviting(false);
          return;
        }

        // User exists but not in a team, add them to this agency owner's team
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ agency_owner_id: user.id })
          .eq("id", existingProfile.id);

        if (updateError) throw updateError;

        // Assign role
        await supabase
          .from("user_roles")
          .insert({
            user_id: existingProfile.id,
            role: inviteRole,
          });

        toast({
          title: "Team Member Added",
          description: `${inviteEmail} has been added to your team.`,
        });

        await fetchTeamMembers(user.id);
      } else {
        // User doesn't exist, create invitation
        toast({
          title: "Invitation Ready",
          description: `Send this link to ${inviteEmail}: ${window.location.origin}/auth with role: ${inviteRole}`,
        });
      }

      setInviteEmail("");
      setInviteRole("team_member");
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleChangeDialog) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (roleChangeDialog.action === "add") {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: roleChangeDialog.userId,
            role: roleChangeDialog.role as "team_member" | "team_manager",
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
          .eq("role", roleChangeDialog.role as "team_member" | "team_manager");

        if (error) throw error;

        toast({
          title: "Role Removed",
          description: `${roleChangeDialog.role} role has been removed from ${roleChangeDialog.email}.`,
        });
      }

      await fetchTeamMembers(user.id);
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
          <h1 className="text-3xl font-bold text-foreground">{agencyOwnerName}'s Team</h1>
          <p className="text-muted-foreground">Manage your team members and their roles</p>
        </div>

        {/* Invite Team Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Add new members to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value: "team_member" | "team_manager") => setInviteRole(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="team_manager">Team Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({teamMembers.length})</CardTitle>
            <CardDescription>Manage roles and permissions for your team</CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No team members yet. Invite your first member above.
              </p>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        {member.first_name && member.last_name
                          ? `${member.first_name} ${member.last_name}`
                          : member.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.email}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {member.roles.length === 0 ? (
                          <Badge variant="outline">No roles assigned</Badge>
                        ) : (
                          member.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => handleRemoveRole(member.id, member.email, role)}
                            >
                              {role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!member.roles.includes("team_member") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRole(member.id, member.email, "team_member")}
                        >
                          Add Team Member
                        </Button>
                      )}
                      {!member.roles.includes("team_manager") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRole(member.id, member.email, "team_manager")}
                        >
                          Add Team Manager
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

export default AgencyManagement;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  progress: number;
  completed: boolean;
  enrolled_at: string;
}

interface TeamMemberWithProgress extends TeamMember {
  enrollments: CourseProgress[];
}

const Team = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccessAndFetchTeam();
  }, []);

  const checkAccessAndFetchTeam = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "administrator");
    const isAgencyOwner = roles?.some((r) => r.role === "agency_owner");
    const isTeamManager = roles?.some((r) => r.role === "team_manager");

    const hasManagerAccess = isAdmin || isAgencyOwner || isTeamManager;

    setHasAccess(!!hasManagerAccess);

    if (!hasManagerAccess) {
      setLoading(false);
      return;
    }

    let teamMemberIds: string[] = [];

    if (isAdmin) {
      // Admins see all users
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id");
      teamMemberIds = allProfiles?.map(p => p.id) || [];
    } else if (isAgencyOwner) {
      // Agency owners see only their assigned team members
      const { data: teamRelations } = await supabase
        .from("team_agency_owners")
        .select("user_id")
        .eq("agency_owner_id", user.id);
      teamMemberIds = teamRelations?.map(r => r.user_id) || [];
    } else if (isTeamManager) {
      // Team managers see team members from the same agency
      // First find which agency owner(s) this team manager belongs to
      const { data: managerRelations } = await supabase
        .from("team_agency_owners")
        .select("agency_owner_id")
        .eq("user_id", user.id);
      
      if (managerRelations && managerRelations.length > 0) {
        const agencyOwnerIds = managerRelations.map(r => r.agency_owner_id);
        
        // Now get all team members under these agency owners
        const { data: teamRelations } = await supabase
          .from("team_agency_owners")
          .select("user_id")
          .in("agency_owner_id", agencyOwnerIds);
        
        teamMemberIds = teamRelations?.map(r => r.user_id) || [];
      }
    }

    if (teamMemberIds.length === 0) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for team members
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", teamMemberIds);

    if (profiles) {
      // Fetch course enrollments for each team member
      const membersWithProgress = await Promise.all(
        profiles.map(async (profile) => {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select(`
              course_id,
              progress,
              completed,
              enrolled_at,
              courses(title)
            `)
            .eq("user_id", profile.id);

          return {
            ...profile,
            enrollments: enrollments?.map((e: any) => ({
              course_id: e.course_id,
              course_title: e.courses?.title || "Unknown Course",
              progress: e.progress,
              completed: e.completed,
              enrolled_at: e.enrolled_at,
            })) || [],
          };
        })
      );

      setTeamMembers(membersWithProgress);
    }

    setLoading(false);
  };

  if (!hasAccess && !loading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Access Restricted</p>
            <p className="text-sm text-muted-foreground mt-2">
              You need team manager or administrator privileges to view this page
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            Monitor team member progress and course completion
          </p>
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
        ) : teamMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No team members found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Team members will appear here once they join
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-medium transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {member.first_name} {member.last_name}
                      </CardTitle>
                      <CardDescription>{member.email}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {member.enrollments.length} course{member.enrollments.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {member.enrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No courses enrolled yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {member.enrollments.map((enrollment) => (
                        <div
                          key={enrollment.course_id}
                          className="p-4 rounded-lg bg-secondary/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              <span className="font-medium">{enrollment.course_title}</span>
                            </div>
                            {enrollment.completed ? (
                              <Badge variant="default">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{enrollment.progress}%</span>
                            </div>
                            <Progress value={enrollment.progress} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Team;

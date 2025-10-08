import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  agencyOwners: Array<{ id: string; name: string; city?: string; state?: string }>;
}

export const CreateUserDialog = ({ open, onOpenChange, onSuccess, agencyOwners }: CreateUserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agencySearchOpen, setAgencySearchOpen] = useState(false);
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "team_member" as "team_member" | "team_manager" | "agency_owner" | "administrator",
    agencyOwnerIds: [] as string[],
    agencyName: "",
    agencyCity: "",
    agencyState: "",
  });

  const filteredAgencyOwners = useMemo(() => {
    if (!agencySearchQuery) return agencyOwners;
    const query = agencySearchQuery.toLowerCase();
    return agencyOwners.filter(owner => 
      owner.name.toLowerCase().includes(query) ||
      owner.city?.toLowerCase().includes(query) ||
      owner.state?.toLowerCase().includes(query)
    );
  }, [agencyOwners, agencySearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate agency owner selection for team roles
    if ((formData.role === "team_member" || formData.role === "team_manager") && formData.agencyOwnerIds.length === 0) {
      toast({
        title: "Agency Owner Required",
        description: "Please select at least one agency owner for team members and managers.",
        variant: "destructive",
      });
      return;
    }

    // Validate agency address for agency owners
    if (formData.role === "agency_owner" && (!formData.agencyName || !formData.agencyCity || !formData.agencyState)) {
      toast({
        title: "Agency Information Required",
        description: "Please provide agency name, city, and state for agency owners.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the user using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Update profile with additional data
      const profileUpdates: any = {};
      if (formData.phoneNumber) profileUpdates.phone_number = formData.phoneNumber;
      if (formData.role === "agency_owner") {
        profileUpdates.agency_name = formData.agencyName;
        profileUpdates.agency_city = formData.agencyCity;
        profileUpdates.agency_state = formData.agencyState;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", authData.user.id);

        if (profileError) throw profileError;
      }

      // Create team-agency relationships if agency owners are selected
      if (formData.agencyOwnerIds.length > 0) {
        const relationships = formData.agencyOwnerIds.map(agencyOwnerId => ({
          user_id: authData.user.id,
          agency_owner_id: agencyOwnerId,
        }));

        const { error: relationshipError } = await supabase
          .from("team_agency_owners")
          .insert(relationships);

        if (relationshipError) throw relationshipError;
      }

      // Assign the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: formData.role,
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error(`Failed to assign role: ${roleError.message}`);
      }

      toast({
        title: "User created",
        description: `${formData.email} has been created successfully.`,
      });

      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        role: "team_member",
        agencyOwnerIds: [],
        agencyName: "",
        agencyCity: "",
        agencyState: "",
      });
      setAgencySearchQuery("");

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="team_manager">Team Manager</SelectItem>
                <SelectItem value="agency_owner">Agency Owner</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
              </SelectContent>
          </Select>
          </div>
          
          {formData.role === "agency_owner" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name *</Label>
                <Input
                  id="agencyName"
                  value={formData.agencyName}
                  onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                  placeholder="e.g., ABC Insurance Agency"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agencyCity">City *</Label>
                  <Input
                    id="agencyCity"
                    value={formData.agencyCity}
                    onChange={(e) => setFormData({ ...formData, agencyCity: e.target.value })}
                    placeholder="e.g., Los Angeles"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencyState">State *</Label>
                  <Input
                    id="agencyState"
                    value={formData.agencyState}
                    onChange={(e) => setFormData({ ...formData, agencyState: e.target.value })}
                    placeholder="e.g., CA"
                    required
                    maxLength={2}
                  />
                </div>
              </div>
            </>
          )}

          {(formData.role === "team_member" || formData.role === "team_manager") && agencyOwners.length > 0 && (
            <div className="space-y-2">
              <Label>Agency Owners * (required, can select multiple)</Label>
              <Popover open={agencySearchOpen} onOpenChange={setAgencySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={agencySearchOpen}
                    className="w-full justify-between"
                  >
                    {formData.agencyOwnerIds.length > 0
                      ? `${formData.agencyOwnerIds.length} agency owner(s) selected`
                      : "Select agency owners..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search agency owners..." 
                      value={agencySearchQuery}
                      onValueChange={setAgencySearchQuery}
                    />
                    <CommandEmpty>No agency owner found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {filteredAgencyOwners.map((owner) => (
                        <CommandItem
                          key={owner.id}
                          onSelect={() => {
                            if (formData.agencyOwnerIds.includes(owner.id)) {
                              setFormData({
                                ...formData,
                                agencyOwnerIds: formData.agencyOwnerIds.filter((id) => id !== owner.id),
                              });
                            } else {
                              setFormData({
                                ...formData,
                                agencyOwnerIds: [...formData.agencyOwnerIds, owner.id],
                              });
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.agencyOwnerIds.includes(owner.id) ? "opacity-100" : "opacity-0"
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
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

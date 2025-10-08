-- Ensure RLS policies on user_roles allow administrators to manage all roles
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Agency owners can assign member and team_manager roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency owners can remove member and team_manager roles" ON public.user_roles;
DROP POLICY IF EXISTS "Administrators can manage all roles" ON public.user_roles;

-- Create clear policies for user_roles
-- Administrators can insert any role
CREATE POLICY "Administrators can insert all roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Agency owners can insert team_member and team_manager roles for their team
CREATE POLICY "Agency owners can insert team roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'agency_owner') 
  AND role IN ('team_member', 'team_manager')
  AND EXISTS (
    SELECT 1 FROM public.team_agency_owners 
    WHERE agency_owner_id = auth.uid() 
    AND team_agency_owners.user_id = user_roles.user_id
  )
);

-- Administrators can delete any role
CREATE POLICY "Administrators can delete all roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- Agency owners can delete team_member and team_manager roles for their team
CREATE POLICY "Agency owners can delete team roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'agency_owner')
  AND role IN ('team_member', 'team_manager')
  AND EXISTS (
    SELECT 1 FROM public.team_agency_owners 
    WHERE agency_owner_id = auth.uid() 
    AND team_agency_owners.user_id = user_roles.user_id
  )
);
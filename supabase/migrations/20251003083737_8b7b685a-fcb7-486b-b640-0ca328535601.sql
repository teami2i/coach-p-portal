-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their agency" ON public.profiles;
DROP POLICY IF EXISTS "Agency owners can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can update all profiles" ON public.profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Agency owners can view their team members"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_agency_owners 
    WHERE team_agency_owners.agency_owner_id = auth.uid()
    AND team_agency_owners.user_id = profiles.id
  )
);

CREATE POLICY "Administrators can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'administrator'));
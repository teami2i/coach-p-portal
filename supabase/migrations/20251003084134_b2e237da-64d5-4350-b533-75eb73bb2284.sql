-- First, drop ALL policies on profiles to start fresh
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- Change enum value from "member" to "team_member"
ALTER TYPE public.app_role RENAME VALUE 'member' TO 'team_member';

-- Create simple, non-recursive policies
-- 1. Users can always view and update their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 2. Administrators can view and update all profiles (using security definer function)
CREATE POLICY "Administrators can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- 3. Agency owners can view their team members (non-recursive query)
CREATE POLICY "Agency owners can view team members"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT user_id 
    FROM public.team_agency_owners 
    WHERE agency_owner_id = auth.uid()
  )
);
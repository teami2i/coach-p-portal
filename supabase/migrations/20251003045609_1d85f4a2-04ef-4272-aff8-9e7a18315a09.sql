-- Create agencies table to represent each insurance agency
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(owner_id)
);

-- Enable RLS on agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Add agency_id to profiles to link users to agencies
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

-- RLS Policies for agencies table
CREATE POLICY "Agency owners can view their own agency"
  ON public.agencies FOR SELECT
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Agency owners can update their own agency"
  ON public.agencies FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can create agencies"
  ON public.agencies FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can delete agencies"
  ON public.agencies FOR DELETE
  USING (public.has_role(auth.uid(), 'administrator'));

-- RLS Policy for profiles - agency owners can view their agency's members
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() 
    OR public.has_role(auth.uid(), 'administrator')
    OR public.has_role(auth.uid(), 'agency_owner')
  );

-- Function to check if user is agency owner of a specific user
CREATE OR REPLACE FUNCTION public.is_agency_owner_of(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.agency_id = p2.agency_id
    JOIN public.agencies a ON a.id = p1.agency_id
    WHERE p1.id = auth.uid()
      AND p2.id = target_user_id
      AND a.owner_id = auth.uid()
  )
$$;

-- Update user_roles RLS to allow agency owners to manage their team's roles
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
CREATE POLICY "Users can view roles"
  ON public.user_roles FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'administrator')
    OR public.is_agency_owner_of(user_id)
  );

CREATE POLICY "Agency owners can assign member and team_manager roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'administrator')
    OR (public.is_agency_owner_of(user_id) AND role IN ('member', 'team_manager'))
  );

CREATE POLICY "Agency owners can remove member and team_manager roles"
  ON public.user_roles FOR DELETE
  USING (
    public.has_role(auth.uid(), 'administrator')
    OR (public.is_agency_owner_of(user_id) AND role IN ('member', 'team_manager'))
  );

-- Trigger to update agencies updated_at
CREATE OR REPLACE FUNCTION public.update_agencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agencies_updated_at();
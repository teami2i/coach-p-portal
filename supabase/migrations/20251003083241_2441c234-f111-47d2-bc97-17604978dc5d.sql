-- Add phone_number to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number text;

-- Create junction table for team members and agency owners (many-to-many)
CREATE TABLE IF NOT EXISTS public.team_agency_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agency_owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, agency_owner_id)
);

-- Enable RLS on team_agency_owners
ALTER TABLE public.team_agency_owners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own agency relationships" ON public.team_agency_owners;
DROP POLICY IF EXISTS "Agency owners can view their team relationships" ON public.team_agency_owners;
DROP POLICY IF EXISTS "Admins can manage all team-agency relationships" ON public.team_agency_owners;

-- RLS policies for team_agency_owners
CREATE POLICY "Users can view their own agency relationships"
ON public.team_agency_owners
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Agency owners can view their team relationships"
ON public.team_agency_owners
FOR SELECT
TO authenticated
USING (
  auth.uid() = agency_owner_id OR
  public.has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Admins can manage all team-agency relationships"
ON public.team_agency_owners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_agency_owners_user_id ON public.team_agency_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_team_agency_owners_agency_owner_id ON public.team_agency_owners(agency_owner_id);
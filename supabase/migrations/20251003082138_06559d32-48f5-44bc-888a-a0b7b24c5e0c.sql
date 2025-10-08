-- Drop the agencies table as it's redundant
-- Agency owners will represent their own agency
DROP TABLE IF EXISTS public.agencies CASCADE;

-- Update profiles table to link directly to agency owner
-- Remove agency_id and add agency_owner_id
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS agency_id;

ALTER TABLE public.profiles 
ADD COLUMN agency_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for agency_owner_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_agency_owner_id ON public.profiles(agency_owner_id);

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Agency owners can view their team" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Agency owners can view their team members
CREATE POLICY "Agency owners can view their team" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE agency_owner_id = auth.uid()
  )
  OR auth.uid() = agency_owner_id
);

-- Administrators can view all profiles
CREATE POLICY "Administrators can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'administrator'));

-- Administrators can update all profiles
CREATE POLICY "Administrators can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'administrator'));

-- Administrators can insert profiles
CREATE POLICY "Administrators can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Administrators can delete profiles
CREATE POLICY "Administrators can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'administrator'));
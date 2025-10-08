-- Fix any triggers or functions still using old "member" role
-- First, let's check if there's a trigger on auth.users that might be causing issues

-- Add address fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agency_name TEXT,
ADD COLUMN IF NOT EXISTS agency_city TEXT,
ADD COLUMN IF NOT EXISTS agency_state TEXT;

-- Create index for better search performance on agency fields
CREATE INDEX IF NOT EXISTS idx_profiles_agency_city ON public.profiles(agency_city);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_state ON public.profiles(agency_state);

-- Update the handle_new_user function if it exists to not set any default role
-- This prevents the "member" enum error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
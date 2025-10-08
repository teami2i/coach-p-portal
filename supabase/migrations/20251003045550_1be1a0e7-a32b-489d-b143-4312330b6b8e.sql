-- Add agency_owner to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agency_owner';
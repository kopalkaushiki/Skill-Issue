-- Run this in Supabase SQL Editor to enable GitHub integration per user profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_username text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_profile_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_synced_at timestamptz;

notify pgrst, 'reload schema';


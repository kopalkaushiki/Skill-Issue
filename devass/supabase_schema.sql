-- ============================================
-- DevAssemble — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Stores onboarding data for each user
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  full_name TEXT NOT NULL,
  phone_number TEXT,
  
  -- Developer profile
  developer_role TEXT NOT NULL CHECK (
    developer_role IN (
      'Frontend Developer',
      'Backend Developer',
      'Fullstack Developer',
      'Mobile Developer',
      'DevOps Engineer',
      'Data Engineer',
      'ML/AI Engineer',
      'Other'
    )
  ),
  
  -- Skills stored as array of text
  skills TEXT[] DEFAULT '{}',
  
  -- Bio
  bio TEXT CHECK (char_length(bio) <= 500),
  
  -- Collaboration availability
  availability TEXT NOT NULL CHECK (
    availability IN (
      'Available now',
      'Available part-time',
      'Available on weekends',
      'Not available'
    )
  ),
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- OPTIONAL: AUTO-CREATE PROFILE AFTER SIGNUP
-- This trigger creates a bare profile row when a
-- new user signs up so the profile always exists
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, developer_role, availability)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Fullstack Developer',
    'Available now'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

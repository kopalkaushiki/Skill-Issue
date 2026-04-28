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

-- ============================================================
-- DEVASSE PROJECTS + POSTS
-- Supports two post types:
--  - Hackathon Team Building
--  - Project Building
-- Plus role-based applications + notifications
-- ============================================================

-- UUID generation (already used by the app in other migrations)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------
-- PROJECTS
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  overview text NOT NULL DEFAULT '',
  tech_stack text[] NOT NULL DEFAULT '{}',
  project_lead_name text NOT NULL DEFAULT '',
  project_lead_role text NOT NULL DEFAULT '',
  project_lead_contact text NOT NULL DEFAULT '',
  help_needed text[] NOT NULL DEFAULT '{}',
  engineer_needed text NOT NULL DEFAULT '',
  progress_stage text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_tech_stack_gin ON public.projects USING gin(tech_stack);
CREATE INDEX IF NOT EXISTS projects_help_needed_gin ON public.projects USING gin(help_needed);

-- ----------------------------
-- PROJECT MEMBERS
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'collaborator',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);

-- ----------------------------
-- PROJECT POSTS (EXTENDED)
-- ----------------------------
-- Existing code expects:
--  - project_id, author_id, title, description, tags, urgency, deadline, created_at
-- New requirements add:
--  - post_type
--  - hackathon_name, hackathon_timeline, team_name
CREATE TABLE IF NOT EXISTS public.project_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  urgency text NOT NULL DEFAULT 'Medium',
  deadline date,

  post_type text NOT NULL DEFAULT 'project_building',
  hackathon_name text,
  hackathon_timeline text,
  team_name text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_posts_project_id_idx ON public.project_posts(project_id);
CREATE INDEX IF NOT EXISTS project_posts_tags_gin ON public.project_posts USING gin(tags);
CREATE INDEX IF NOT EXISTS project_posts_type_idx ON public.project_posts(post_type);

-- If `project_posts` already existed from an older schema, ensure new columns exist.
ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'project_building';

ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS hackathon_name text;

ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS hackathon_timeline text;

ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS team_name text;

-- ----------------------------
-- POST ROLES (requested roles/skills)
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.post_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_post_id uuid NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  skill text NOT NULL,
  proficiency_level text NOT NULL,
  soft_skills text[] NOT NULL DEFAULT '{}',
  number_teammates_required integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_roles_project_post_id_idx ON public.post_roles(project_post_id);

-- ----------------------------
-- POST APPLICATIONS
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.post_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_role_id uuid NOT NULL REFERENCES public.post_roles(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS post_applications_unique_role_applicant
  ON public.post_applications(post_role_id, applicant_id);

CREATE INDEX IF NOT EXISTS post_applications_applicant_id_idx ON public.post_applications(applicant_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_applications_updated_at ON public.post_applications;
CREATE TRIGGER trg_post_applications_updated_at
  BEFORE UPDATE ON public.post_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_now();

-- ----------------------------
-- NOTIFICATIONS
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  post_application_id uuid REFERENCES public.post_applications(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id, is_read);

-- ----------------------------
-- RLS
-- ----------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROJECTS: authenticated can read, only owner can write
DROP POLICY IF EXISTS projects_select_authenticated ON public.projects;
CREATE POLICY projects_select_authenticated
  ON public.projects FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS projects_write_owner ON public.projects;
CREATE POLICY projects_write_owner
  ON public.projects FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- PROJECT_MEMBERS: authenticated can read, only owner can manage
DROP POLICY IF EXISTS project_members_select_authenticated ON public.project_members;
CREATE POLICY project_members_select_authenticated
  ON public.project_members FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS project_members_write_owner ON public.project_members;
CREATE POLICY project_members_write_owner
  ON public.project_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- PROJECT_POSTS: authenticated can read, only author can write
DROP POLICY IF EXISTS project_posts_select_authenticated ON public.project_posts;
CREATE POLICY project_posts_select_authenticated
  ON public.project_posts FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS project_posts_write_author ON public.project_posts;
CREATE POLICY project_posts_write_author
  ON public.project_posts FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- POST_ROLES: authenticated can read, only creator (project author) can write
DROP POLICY IF EXISTS post_roles_select_authenticated ON public.post_roles;
CREATE POLICY post_roles_select_authenticated
  ON public.post_roles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS post_roles_write_creator ON public.post_roles;
CREATE POLICY post_roles_write_creator
  ON public.post_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_posts pp
      WHERE pp.id = project_post_id
        AND pp.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_posts pp
      WHERE pp.id = project_post_id
        AND pp.author_id = auth.uid()
    )
  );

-- POST_APPLICATIONS: applicant can read own, post author can read/update decisions
DROP POLICY IF EXISTS post_applications_select_authenticated ON public.post_applications;
CREATE POLICY post_applications_select_authenticated
  ON public.post_applications FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.post_roles pr
      JOIN public.project_posts pp ON pp.id = pr.project_post_id
      WHERE pr.id = post_role_id
        AND pp.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS post_applications_insert_applicant ON public.post_applications;
CREATE POLICY post_applications_insert_applicant
  ON public.post_applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS post_applications_update_author ON public.post_applications;
CREATE POLICY post_applications_update_author
  ON public.post_applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.post_roles pr
      JOIN public.project_posts pp ON pp.id = pr.project_post_id
      WHERE pr.id = post_role_id
        AND pp.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.post_roles pr
      JOIN public.project_posts pp ON pp.id = pr.project_post_id
      WHERE pr.id = post_role_id
        AND pp.author_id = auth.uid()
    )
  );

-- NOTIFICATIONS: recipient can read; post author can insert notifications for applicants
DROP POLICY IF EXISTS notifications_select_recipient ON public.notifications;
CREATE POLICY notifications_select_recipient
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_author ON public.notifications;
CREATE POLICY notifications_insert_author
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND post_application_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.post_applications pa
      JOIN public.post_roles pr ON pr.id = pa.post_role_id
      JOIN public.project_posts pp ON pp.id = pr.project_post_id
      WHERE pa.id = post_application_id
        AND pa.applicant_id = user_id
        AND pp.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS notifications_update_recipient ON public.notifications;
CREATE POLICY notifications_update_recipient
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------
-- PROFILE DISCOVERY (for dashboard search + messaging)
-- ----------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- ----------------------------
-- DIRECT MESSAGES
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS direct_messages_sender_idx ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_idx ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON public.direct_messages(created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS direct_messages_select_participant ON public.direct_messages;
CREATE POLICY direct_messages_select_participant
  ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS direct_messages_insert_sender ON public.direct_messages;
CREATE POLICY direct_messages_insert_sender
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS direct_messages_update_recipient ON public.direct_messages;
CREATE POLICY direct_messages_update_recipient
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Notifications for direct messages (sender -> recipient)
DROP POLICY IF EXISTS notifications_insert_message_sender ON public.notifications;
CREATE POLICY notifications_insert_message_sender
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND type = 'message_received'
    AND post_application_id IS NULL
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS notifications_insert_applicant_to_author ON public.notifications;
CREATE POLICY notifications_insert_applicant_to_author
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND type = 'new_application'
    AND user_id <> auth.uid()
  );

-- ----------------------------
-- GITHUB FIELDS ON PROFILES
-- ----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_username text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_profile_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_synced_at timestamptz;


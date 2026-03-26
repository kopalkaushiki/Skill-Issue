-- DevAssemble Supabase schema (projects + posts)
-- Run this in Supabase SQL editor for your project.

-- Enable required extension(s)
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Projects
-- Two "types" of projects for a user are derived by relationship:
-- - "My Projects": projects.owner_id = auth.uid()
-- - "Working On": user is in project_members but not the owner
-- ─────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  overview text not null default '',
  tech_stack text[] not null default '{}',
  project_lead_name text not null default '',
  project_lead_role text not null default '',
  project_lead_contact text not null default '',
  help_needed text[] not null default '{}',
  engineer_needed text not null default '',
  progress_stage text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists projects_tech_stack_gin on public.projects using gin(tech_stack);
create index if not exists projects_help_needed_gin on public.projects using gin(help_needed);

-- ─────────────────────────────────────────────
-- Project members (collaborators)
-- ─────────────────────────────────────────────
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'collaborator',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_id_idx on public.project_members(user_id);

-- ─────────────────────────────────────────────
-- Project posts (what help is needed)
-- ─────────────────────────────────────────────
create table if not exists public.project_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  urgency text not null default 'Medium',
  deadline date,
  created_at timestamptz not null default now()
);

create index if not exists project_posts_project_id_idx on public.project_posts(project_id);
create index if not exists project_posts_tags_gin on public.project_posts using gin(tags);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_posts enable row level security;

-- Projects: readable by authenticated users (for "All Projects")
drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated"
on public.projects for select
to authenticated
using (true);

-- Projects: only owner can insert/update/delete
drop policy if exists "projects_insert_owner" on public.projects;
create policy "projects_insert_owner"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner"
on public.projects for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "projects_delete_owner" on public.projects;
create policy "projects_delete_owner"
on public.projects for delete
to authenticated
using (owner_id = auth.uid());

-- Members: any authenticated can read (to compute "working on")
drop policy if exists "project_members_select_authenticated" on public.project_members;
create policy "project_members_select_authenticated"
on public.project_members for select
to authenticated
using (true);

-- Members: only project owner can manage membership
drop policy if exists "project_members_insert_owner" on public.project_members;
create policy "project_members_insert_owner"
on public.project_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_members_delete_owner" on public.project_members;
create policy "project_members_delete_owner"
on public.project_members for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

-- Posts: readable by authenticated users
drop policy if exists "project_posts_select_authenticated" on public.project_posts;
create policy "project_posts_select_authenticated"
on public.project_posts for select
to authenticated
using (true);

-- Posts: author can insert; owner can insert too (as author_id=auth.uid())
drop policy if exists "project_posts_insert_author" on public.project_posts;
create policy "project_posts_insert_author"
on public.project_posts for insert
to authenticated
with check (author_id = auth.uid());

-- Posts: author or project owner can delete
drop policy if exists "project_posts_delete_author_or_owner" on public.project_posts;
create policy "project_posts_delete_author_or_owner"
on public.project_posts for delete
to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);


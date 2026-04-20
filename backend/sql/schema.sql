-- Internal PM — PostgreSQL schema (Supabase-compatible)
-- Run in Supabase SQL editor or psql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('team_leader', 'designer', 'manager');
CREATE TYPE project_status AS ENUM (
  'new',
  'active',
  'demo',
  'ozalit_onay',
  'uretim',
  'satis',
  'completed'
);
CREATE TYPE ozalit_approval_kind AS ENUM ('team_leader', 'designer_approver', 'printer');
CREATE TYPE ozalit_approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'designer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  can_approve_ozalit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  print_house TEXT NOT NULL DEFAULT '',
  start_date DATE,
  total_page_count INT NOT NULL CHECK (total_page_count >= 0),
  has_kapak BOOLEAN NOT NULL DEFAULT FALSE,
  has_kutu BOOLEAN NOT NULL DEFAULT FALSE,
  has_medya BOOLEAN NOT NULL DEFAULT FALSE,
  status project_status NOT NULL DEFAULT 'new',
  team_leader_id UUID NOT NULL REFERENCES users (id),
  designer_approver_id UUID REFERENCES users (id),
  printer_user_id UUID REFERENCES users (id),
  completed_page_count INT NOT NULL DEFAULT 0 CHECK (completed_page_count >= 0),
  kapak_complete BOOLEAN NOT NULL DEFAULT FALSE,
  kutu_complete BOOLEAN NOT NULL DEFAULT FALSE,
  medya_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pages_cap CHECK (completed_page_count <= total_page_count)
);

CREATE TABLE project_designers (
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  from_status project_status,
  to_status project_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users (id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ozalit_approval_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number >= 1),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX one_current_round_per_project ON ozalit_approval_rounds (project_id)
WHERE is_current;

CREATE TABLE ozalit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES ozalit_approval_rounds (id) ON DELETE CASCADE,
  kind ozalit_approval_kind NOT NULL,
  target_user_id UUID NOT NULL REFERENCES users (id),
  status ozalit_approval_status NOT NULL DEFAULT 'pending',
  acted_by UUID REFERENCES users (id),
  acted_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, kind)
);

CREATE TABLE daily_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  worked_on_something_else BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE project_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_pd_project ON project_designers (project_id);
CREATE INDEX idx_oar_project ON ozalit_approval_rounds (project_id);
CREATE INDEX idx_oa_round ON ozalit_approvals (round_id);
CREATE INDEX idx_pph_project ON project_progress_logs (project_id);
CREATE INDEX idx_dwl_user_date ON daily_work_logs (user_id, log_date DESC);

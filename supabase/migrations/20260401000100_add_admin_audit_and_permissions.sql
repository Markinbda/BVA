create extension if not exists "pgcrypto";

create table if not exists user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_permissions_user_permission_idx
  on user_permissions (user_id, permission);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(user_id),
  action text not null,
  target_path text,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on admin_audit_logs (created_at);

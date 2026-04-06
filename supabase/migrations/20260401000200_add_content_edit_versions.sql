create table if not exists content_edit_versions (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  editor_id uuid not null references profiles(user_id),
  status text not null,
  changes jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists content_edit_versions_page_path_idx on content_edit_versions (page_path);
create index if not exists content_edit_versions_created_at_idx on content_edit_versions (created_at);

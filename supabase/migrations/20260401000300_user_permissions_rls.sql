alter table public.user_permissions enable row level security;

-- Users can read their own permissions (needed for the Edit Mode button to show)
create policy "Users can read own permissions"
  on public.user_permissions for select
  using (auth.uid() = user_id);

-- Admins can read all permissions
create policy "Admins can read all permissions"
  on public.user_permissions for select
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can grant permissions
create policy "Admins can insert permissions"
  on public.user_permissions for insert
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can revoke permissions
create policy "Admins can delete permissions"
  on public.user_permissions for delete
  using (public.has_role(auth.uid(), 'admin'::app_role));

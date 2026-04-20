export interface AdminPermissionOption {
  permission: string;
  label: string;
  description: string;
}

export const ADMIN_PERMISSION_OPTIONS: AdminPermissionOption[] = [
  {
    permission: "admin_access",
    label: "Admin dashboard",
    description: "Sign in and view the admin dashboard",
  },
  {
    permission: "manage_users",
    label: "System users",
    description: "Manage registered users, roles, and access",
  },
  {
    permission: "manage_pages",
    label: "Page content",
    description: "Edit page content and homepage copy",
  },
  {
    permission: "manage_news",
    label: "News",
    description: "Create and update news articles",
  },
  {
    permission: "manage_events",
    label: "Events",
    description: "Manage events, categories, and locations",
  },
  {
    permission: "manage_gallery",
    label: "Gallery",
    description: "Manage gallery photos and categories",
  },
  {
    permission: "manage_images",
    label: "Image manager",
    description: "Replace and organize site images",
  },
  {
    permission: "manage_sponsors",
    label: "Sponsors",
    description: "Update sponsors and partner logos",
  },
  {
    permission: "manage_leagues",
    label: "Leagues & seasons",
    description: "Manage leagues, standings, and season history",
  },
  {
    permission: "manage_settings",
    label: "Settings",
    description: "Access site-wide settings",
  },
  {
    permission: "manage_import",
    label: "WP import",
    description: "Run import and migration tools",
  },
  {
    permission: "content_editor",
    label: "Inline editor",
    description: "Use edit mode on public-facing pages",
  },
  {
    permission: "manage_coaches",
    label: "Coach portal",
    description: "Access the coach portal to manage players, teams, and email lists",
  },
  {
    permission: "manage_coach_documents",
    label: "Coach documents",
    description: "Upload, remove, and share coach repository documents across players and coaches",
  },
];

export const ADMIN_SECTION_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.map((option) => option.permission).filter(
  (permission) => !["admin_access", "content_editor"].includes(permission)
);

export const hasSystemAccess = (permissions: string[]) =>
  permissions.some((permission) => ["admin_access", "super_admin", ...ADMIN_SECTION_PERMISSIONS].includes(permission));

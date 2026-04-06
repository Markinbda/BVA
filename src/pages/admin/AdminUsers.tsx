import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldCheck, UserCog, UserPlus, UserX, Users } from "lucide-react";
import { ADMIN_PERMISSION_OPTIONS, hasSystemAccess } from "@/lib/adminPermissions";

type AppRole = "admin" | "user";

interface ProfileRecord {
  user_id: string;
  display_name: string | null;
  created_at: string;
  date_of_birth: string | null;
  roles: string[] | null;
  volleyball_formats: string[] | null;
  team_formats: string[] | null;
  experience_level: string | null;
}

interface UserRow {
  userId: string;
  displayName: string;
  createdAt: string;
  dateOfBirth: string | null;
  memberRoles: string[];
  formats: string[];
  experienceLevel: string | null;
  role: AppRole;
  permissions: string[];
  isSystemUser: boolean;
  savingRole: boolean;
  savingAccess: boolean;
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "—");
const formatList = (values: string[]) => (values.length ? values.join(", ") : "—");

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const setUserState = (userId: string, update: (user: UserRow) => UserRow) => {
    setUsers((previous) => previous.map((user) => (user.userId === userId ? update(user) : user)));
  };

  const fetchUsers = async () => {
    setLoading(true);

    const { data: profiles, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load users", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: perms } = await (supabase as any).from("user_permissions").select("user_id, permission");

    const roleMap = new Map<string, AppRole>();
    roles?.forEach((row) => roleMap.set(row.user_id, row.role as AppRole));

    const permissionMap = new Map<string, string[]>();
    (perms as Array<{ user_id: string; permission: string }> | null)?.forEach((row) => {
      const existing = permissionMap.get(row.user_id) ?? [];
      permissionMap.set(row.user_id, [...existing, row.permission]);
    });

    const mappedUsers = ((profiles ?? []) as ProfileRecord[]).map((profile) => {
      const permissions = permissionMap.get(profile.user_id) ?? [];
      const role = roleMap.get(profile.user_id) ?? "user";
      const formats = Array.from(new Set([...(profile.volleyball_formats ?? []), ...(profile.team_formats ?? [])]));

      return {
        userId: profile.user_id,
        displayName: profile.display_name?.trim() || "Unnamed member",
        createdAt: profile.created_at,
        dateOfBirth: profile.date_of_birth,
        memberRoles: profile.roles ?? [],
        formats,
        experienceLevel: profile.experience_level,
        role,
        permissions,
        isSystemUser: role === "admin" || hasSystemAccess(permissions),
        savingRole: false,
        savingAccess: false,
      } satisfies UserRow;
    });

    setUsers(mappedUsers);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const haystack = [
        user.displayName,
        ...user.memberRoles,
        ...user.formats,
        user.role,
        user.experienceLevel ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchQuery, users]);

  const systemUsers = filteredUsers.filter((user) => user.isSystemUser);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUserState(userId, (user) => ({ ...user, savingRole: true }));

    let error: { message: string } | null = null;
    if (newRole === "admin") {
      const result = await supabase.from("user_roles").upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });
      error = result.error;
    } else {
      const result = await supabase.from("user_roles").delete().eq("user_id", userId);
      error = result.error;
    }

    if (error) {
      setUserState(userId, (user) => ({ ...user, savingRole: false }));
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
      return;
    }

    setUserState(userId, (user) => ({
      ...user,
      role: newRole,
      isSystemUser: newRole === "admin" || hasSystemAccess(user.permissions),
      savingRole: false,
    }));
    toast({ title: "System role updated" });
  };

  const handleSystemUserToggle = async (user: UserRow, enable: boolean) => {
    setUserState(user.userId, (current) => ({ ...current, savingAccess: true }));

    let error: { message: string } | null = null;

    if (enable) {
      const result = await (supabase as any)
        .from("user_permissions")
        .upsert([{ user_id: user.userId, permission: "admin_access" }] as any, {
          onConflict: "user_id,permission",
          ignoreDuplicates: true,
        } as any);
      error = result.error;
    } else {
      const [permissionsResult, rolesResult] = await Promise.all([
        (supabase as any).from("user_permissions").delete().eq("user_id", user.userId),
        supabase.from("user_roles").delete().eq("user_id", user.userId),
      ]);
      error = permissionsResult.error ?? rolesResult.error;
    }

    if (error) {
      setUserState(user.userId, (current) => ({ ...current, savingAccess: false }));
      toast({ title: enable ? "Failed to add system access" : "Failed to remove system access", description: error.message, variant: "destructive" });
      return;
    }

    setUserState(user.userId, (current) => {
      const nextPermissions = enable
        ? Array.from(new Set([...current.permissions, "admin_access"]))
        : [];

      return {
        ...current,
        role: enable ? current.role : "user",
        permissions: nextPermissions,
        isSystemUser: enable ? true : false,
        savingAccess: false,
      };
    });

    toast({ title: enable ? "Added to System Users" : "Removed from System Users" });
  };

  const handlePermissionToggle = async (user: UserRow, permission: string, grant: boolean) => {
    setUserState(user.userId, (current) => ({ ...current, savingAccess: true }));

    let error: { message: string } | null = null;
    if (grant) {
      const result = await (supabase as any)
        .from("user_permissions")
        .upsert([{ user_id: user.userId, permission }] as any, {
          onConflict: "user_id,permission",
          ignoreDuplicates: true,
        } as any);
      error = result.error;
    } else {
      const result = await (supabase as any)
        .from("user_permissions")
        .delete()
        .eq("user_id", user.userId)
        .eq("permission", permission);
      error = result.error;
    }

    if (error) {
      setUserState(user.userId, (current) => ({ ...current, savingAccess: false }));
      toast({ title: "Failed to update access", description: error.message, variant: "destructive" });
      return;
    }

    setUserState(user.userId, (current) => {
      const nextPermissions = grant
        ? Array.from(new Set([...current.permissions, permission]))
        : current.permissions.filter((value) => value !== permission);

      return {
        ...current,
        permissions: nextPermissions,
        isSystemUser: current.role === "admin" || hasSystemAccess(nextPermissions),
        savingAccess: false,
      };
    });

    toast({ title: grant ? "Access granted" : "Access removed" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Separate registered members from system users and assign only the admin areas they should access.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Registered users</p>
              <p className="text-3xl font-bold text-foreground">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">System users</p>
              <p className="text-3xl font-bold text-foreground">{users.filter((user) => user.isSystemUser).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-3xl font-bold text-foreground">{users.filter((user) => user.role === "admin").length}</p>
            </CardContent>
          </Card>
        </div>

        <Card id="system-users">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              System Users{!loading && ` (${users.filter((user) => user.isSystemUser).length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : systemUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No system users yet. Use the registered users list below to add one.</p>
            ) : (
              <div className="space-y-4">
                {systemUsers.map((user) => (
                  <div key={user.userId} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{user.displayName}</h3>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role === "admin" ? "Admin" : "System user"}</Badge>
                          {user.permissions.includes("content_editor") && <Badge variant="outline">Inline editor</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">Joined {formatDate(user.createdAt)} • DOB {formatDate(user.dateOfBirth)}</p>
                        <p className="text-sm text-muted-foreground">Member roles: {formatList(user.memberRoles)}</p>
                        <p className="text-sm text-muted-foreground">Formats: {formatList(user.formats)} • Level of play: {user.experienceLevel || "—"}</p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={user.role} onValueChange={(value) => handleRoleChange(user.userId, value as AppRole)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Choose role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => handleSystemUserToggle(user, false)}
                          disabled={user.savingAccess || user.savingRole}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {user.savingAccess ? "Saving…" : "Remove Access"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access boxes</p>
                      {user.role === "admin" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Admin role already unlocks all admin sections. Keep <strong>Inline editor</strong> enabled if this user should edit public page content.
                        </p>
                      )}
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {ADMIN_PERMISSION_OPTIONS.map((option) => {
                          const controlledByAdmin = user.role === "admin" && !["content_editor"].includes(option.permission);
                          const checked = controlledByAdmin || user.permissions.includes(option.permission) || (option.permission !== "content_editor" && user.permissions.includes("super_admin"));

                          return (
                            <label
                              key={`${user.userId}-${option.permission}`}
                              className={`flex items-start gap-3 rounded-lg border p-3 ${checked ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
                                checked={checked}
                                disabled={user.savingAccess || controlledByAdmin}
                                onChange={(event) => handlePermissionToggle(user, option.permission, event.target.checked)}
                              />
                              <span>
                                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                                <span className="block text-xs text-muted-foreground">{option.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <UserCog className="h-4 w-4 text-primary" />
                  Registered Users{!loading && ` (${filteredUsers.length})`}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Search members and promote them to system users without showing internal IDs.</p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, role, format, or level"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registered users match that search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Full Name</th>
                      <th className="pb-2 pr-4 font-medium">Joined</th>
                      <th className="pb-2 pr-4 font-medium">Role</th>
                      <th className="pb-2 pr-4 font-medium">Date of Birth</th>
                      <th className="pb-2 pr-4 font-medium">Format</th>
                      <th className="pb-2 pr-4 font-medium">Level of Play</th>
                      <th className="pb-2 font-medium">System Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.userId} className="border-b last:border-0 align-top">
                        <td className="py-3 pr-4 font-medium text-foreground">{user.displayName}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatList(user.memberRoles)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDate(user.dateOfBirth)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatList(user.formats)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{user.experienceLevel || "—"}</td>
                        <td className="py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Badge variant={user.isSystemUser ? "default" : "secondary"}>
                              {user.isSystemUser ? (user.role === "admin" ? "Admin" : "System user") : "Registered only"}
                            </Badge>
                            <Button
                              size="sm"
                              variant={user.isSystemUser ? "outline" : "default"}
                              onClick={() => handleSystemUserToggle(user, !user.isSystemUser)}
                              disabled={user.savingAccess}
                            >
                              {user.isSystemUser ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" /> Remove
                                </>
                              ) : (
                                <>
                                  <UserPlus className="mr-2 h-4 w-4" /> Make System User
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;

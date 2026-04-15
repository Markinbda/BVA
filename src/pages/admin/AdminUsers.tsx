import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Eye, EyeOff, KeyRound, Pencil, Search, ShieldCheck, UserCog, UserPlus, UserX, Users } from "lucide-react";
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
  phone: string | null;
}

interface UserRow {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
  dateOfBirth: string | null;
  phone: string | null;
  memberRoles: string[];
  formats: string[];
  experienceLevel: string | null;
  role: AppRole;
  permissions: string[];
  isSystemUser: boolean;
  savingRole: boolean;
  savingAccess: boolean;
}

// ── Helper to call the admin-user-management edge function ─────────────────────
async function callAdminFn(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-user-management`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "—");
const formatList = (values: string[]) => (values.length ? values.join(", ") : "—");

// ── Add User Dialog ────────────────────────────────────────────────────────────
const AddUserDialog = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ displayName: "", email: "", password: "", phone: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const result = await callAdminFn("create_user", {
      email: form.email,
      password: form.password,
      display_name: form.displayName,
      phone: form.phone || undefined,
    });
    setSaving(false);
    if (result.error) {
      toast({ title: "Failed to create user", description: result.error as string, variant: "destructive" });
    } else {
      toast({ title: "User created successfully" });
      setForm({ displayName: "", email: "", password: "", phone: "" });
      onCreated();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Full Name *</Label>
            <Input id="add-name" value={form.displayName} onChange={set("displayName")} placeholder="Jane Smith" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-email">Email *</Label>
            <Input id="add-email" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-phone">Phone</Label>
            <Input id="add-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 441 000 0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-password">Password *</Label>
            <div className="relative">
              <Input
                id="add-password"
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 8 characters"
                minLength={8}
                required
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw((p) => !p)}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create User"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Edit User Dialog ───────────────────────────────────────────────────────────
const EditUserDialog = ({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: (userId: string, updates: Partial<UserRow>) => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ displayName: "", email: "", dateOfBirth: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName === "Unnamed member" ? "" : user.displayName,
        email: user.email,
        dateOfBirth: user.dateOfBirth ?? "",
        phone: user.phone ?? "",
      });
    }
  }, [user]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const profileUpdates: Record<string, unknown> = {
      display_name: form.displayName || null,
      date_of_birth: form.dateOfBirth || null,
      phone: form.phone || null,
    };

    const { error: profileErr } = await (supabase as any)
      .from("profiles")
      .update(profileUpdates)
      .eq("user_id", user.userId);

    if (profileErr) {
      setSaving(false);
      toast({ title: "Failed to update profile", description: profileErr.message, variant: "destructive" });
      return;
    }

    // Update email if changed
    if (form.email && form.email !== user.email) {
      const result = await callAdminFn("update_email", { user_id: user.userId, email: form.email });
      if (result.error) {
        setSaving(false);
        toast({ title: "Profile saved but email update failed", description: result.error as string, variant: "destructive" });
        return;
      }
    }

    setSaving(false);
    toast({ title: "User updated" });
    onSaved(user.userId, {
      displayName: form.displayName || "Unnamed member",
      email: form.email,
      dateOfBirth: form.dateOfBirth || null,
      phone: form.phone || null,
    });
    onClose();
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User — {user?.displayName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input id="edit-name" value={form.displayName} onChange={set("displayName")} placeholder="Unnamed member" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={form.email} onChange={set("email")} placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 441 000 0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-dob">Date of Birth</Label>
            <Input id="edit-dob" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Reset Password Dialog ──────────────────────────────────────────────────────
const ResetPasswordDialog = ({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"email" | "manual">("email");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) { setMode("email"); setPassword(""); }
  }, [user]);

  const handleSendEmail = async () => {
    if (!user) return;
    setSaving(true);
    const result = await callAdminFn("reset_password_email", { email: user.email });
    setSaving(false);
    if (result.error) {
      toast({ title: "Failed to send reset email", description: result.error as string, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: `Sent to ${user.email}` });
      onClose();
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || password.length < 8) return;
    setSaving(true);
    const result = await callAdminFn("set_password", { user_id: user.userId, password });
    setSaving(false);
    if (result.error) {
      toast({ title: "Failed to set password", description: result.error as string, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      onClose();
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password — {user?.displayName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "email" ? "default" : "outline"} onClick={() => setMode("email")}>
              Send Reset Email
            </Button>
            <Button size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
              Set New Password
            </Button>
          </div>

          {mode === "email" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A password reset link will be sent to <strong>{user?.email}</strong>.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSendEmail} disabled={saving}>{saving ? "Sending…" : "Send Email"}</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-pw">New Password</Label>
                <div className="relative">
                  <Input
                    id="reset-pw"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw((p) => !p)}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={saving || password.length < 8}>{saving ? "Saving…" : "Set Password"}</Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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
        email: "",
        createdAt: profile.created_at,
        dateOfBirth: profile.date_of_birth,
        phone: profile.phone ?? null,
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

    // Fetch emails asynchronously (requires edge function)
    if (mappedUsers.length > 0) {
      const emailResult = await callAdminFn("list_emails", {
        user_ids: mappedUsers.map((u) => u.userId),
      });
      const emailMap = (emailResult.emails ?? {}) as Record<string, string>;
      setUsers((prev) =>
        prev.map((u) => ({ ...u, email: emailMap[u.userId] ?? "" }))
      );
    }
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
        user.email,
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
      const permissionsResult = await (supabase as any)
        .from("user_permissions")
        .delete()
        .eq("user_id", user.userId);
      error = permissionsResult.error;
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

  const handleEditSaved = (userId: string, updates: Partial<UserRow>) => {
    setUserState(userId, (user) => ({ ...user, ...updates }));
  };

  const toggleExpanded = (userId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Users</h1>
              <p className="text-sm text-muted-foreground">Manage members and assign system access.</p>
            </div>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <AddUserDialog open={showAddUser} onClose={() => setShowAddUser(false)} onCreated={fetchUsers} />
        <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={handleEditSaved} />
        <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Registered</p>
              <p className="text-3xl font-bold text-foreground mt-1">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">System Users</p>
              <p className="text-3xl font-bold text-foreground mt-1">{users.filter(u => u.isSystemUser).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Admins</p>
              <p className="text-3xl font-bold text-foreground mt-1">{users.filter(u => u.role === "admin").length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + list */}
        <div className="rounded-xl border bg-card shadow-sm">
          {/* Search bar */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, role, format, or level…"
              className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm h-7"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-xs text-muted-foreground hover:text-foreground shrink-0">Clear</button>
            )}
            <span className="text-xs text-muted-foreground shrink-0">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</span>
          </div>

          {/* User rows */}
          {loading ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">Loading…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">No users found.</div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map(user => {
                const isOpen = expandedIds.has(user.userId);
                return (
                  <div key={user.userId}>
                    {/* Collapsed row — single line */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                      onClick={() => toggleExpanded(user.userId)}
                    >
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <span className="font-medium text-sm text-foreground min-w-[140px]">{user.displayName}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1 hidden sm:block">
                        {user.email || <span className="italic opacity-50">loading…</span>}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {user.role === "admin" && (
                          <Badge className="text-xs gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Admin</Badge>
                        )}
                        {user.isSystemUser && user.role !== "admin" && (
                          <Badge variant="secondary" className="text-xs gap-1"><UserCog className="h-2.5 w-2.5" /> System</Badge>
                        )}
                        <span className="text-xs text-muted-foreground hidden md:block">{formatDate(user.createdAt)}</span>
                      </div>
                    </button>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div className="bg-muted/30 border-t px-5 py-4 space-y-4">
                        {/* Detail grid */}
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{user.email || "—"}</span></div>
                          <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{user.phone || "—"}</span></div>
                          <div><span className="text-muted-foreground">Joined:</span> <span className="font-medium">{formatDate(user.createdAt)}</span></div>
                          <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{formatDate(user.dateOfBirth)}</span></div>
                          <div><span className="text-muted-foreground">Roles:</span> <span className="font-medium">{formatList(user.memberRoles)}</span></div>
                          <div><span className="text-muted-foreground">Formats:</span> <span className="font-medium">{formatList(user.formats)}</span></div>
                          <div><span className="text-muted-foreground">Level:</span> <span className="font-medium">{user.experienceLevel || "—"}</span></div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button size="sm" variant="outline" onClick={() => setEditUser(user)}>
                            <Pencil className="mr-1.5 h-3 w-3" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setResetUser(user)}>
                            <KeyRound className="mr-1.5 h-3 w-3" /> Password
                          </Button>

                          {user.isSystemUser ? (
                            <>
                              <Select
                                value={user.role}
                                onValueChange={v => handleRoleChange(user.userId, v as AppRole)}
                              >
                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">user</SelectItem>
                                  <SelectItem value="admin">admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                                onClick={() => handleSystemUserToggle(user, false)}
                                disabled={user.savingAccess}
                              >
                                <UserX className="mr-1.5 h-3 w-3" />
                                {user.savingAccess ? "Saving…" : "Remove System Access"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSystemUserToggle(user, true)}
                              disabled={user.savingAccess}
                            >
                              <UserPlus className="mr-1.5 h-3 w-3" />
                              {user.savingAccess ? "Saving…" : "Make System User"}
                            </Button>
                          )}
                        </div>

                        {/* Permission checkboxes — system users only */}
                        {user.isSystemUser && (
                          <div className="space-y-2 border-t pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access Areas</p>
                            {user.role === "admin" && (
                              <p className="text-xs text-muted-foreground">Admin role already unlocks all admin sections. Keep <strong>Inline editor</strong> enabled if this user should edit public page content.</p>
                            )}
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {ADMIN_PERMISSION_OPTIONS.map(option => {
                                const controlledByAdmin = user.role === "admin" && !["content_editor"].includes(option.permission);
                                const checked = controlledByAdmin || user.permissions.includes(option.permission) || (option.permission !== "content_editor" && user.permissions.includes("super_admin"));
                                return (
                                  <label
                                    key={`${user.userId}-${option.permission}`}
                                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${checked ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
                                      checked={checked}
                                      disabled={user.savingAccess || controlledByAdmin}
                                      onChange={e => handlePermissionToggle(user, option.permission, e.target.checked)}
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;

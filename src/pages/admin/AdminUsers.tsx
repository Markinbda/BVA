import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

type AppRole = "admin" | "user";

interface UserRow {
  userId: string;
  displayName: string | null;
  createdAt: string;
  role: AppRole;
  isContentEditor: boolean;
  savingPermission: boolean;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load users", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const { data: perms } = await supabase
      .from<any, any>("user_permissions" as any)
      .select("user_id, permission");

    const roleMap = new Map<string, AppRole>();
    roles?.forEach((r) => roleMap.set(r.user_id, r.role as AppRole));

    const contentEditorSet = new Set<string>();
    (perms as Array<{ user_id: string; permission: string }> | null)?.forEach((p) => {
      if (p.permission === "content_editor") contentEditorSet.add(p.user_id);
    });

    setUsers(
      (profiles ?? []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        createdAt: p.created_at,
        role: roleMap.get(p.user_id) ?? "user",
        isContentEditor: contentEditorSet.has(p.user_id),
        savingPermission: false,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, role: newRole } : u))
      );
      toast({ title: "Role updated" });
    }
  };

  const handleContentEditorChange = async (userId: string, grant: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, savingPermission: true } : u))
    );

    let error: { message: string } | null = null;

    if (grant) {
      const result = await supabase
        .from<any, any>("user_permissions" as any)
        .upsert([{ user_id: userId, permission: "content_editor" }] as any, { onConflict: "user_id,permission" } as any);
      error = result.error;
    } else {
      const result = await supabase
        .from<any, any>("user_permissions" as any)
        .delete()
        .eq("user_id" as any, userId)
        .eq("permission" as any, "content_editor");
      error = result.error;
    }

    if (error) {
      toast({ title: "Failed to update permission", description: error.message, variant: "destructive" });
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, savingPermission: false } : u))
      );
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, isContentEditor: grant, savingPermission: false } : u
        )
      );
      toast({ title: grant ? "Content Editor permission granted" : "Content Editor permission removed" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Manage registered users and their roles</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Registered Users{!loading && ` (${users.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registered users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Display Name</th>
                      <th className="pb-2 pr-4 font-medium">User ID</th>
                      <th className="pb-2 pr-4 font-medium">Joined</th>
                      <th className="pb-2 pr-4 font-medium">Role</th>
                      <th className="pb-2 pr-4 font-medium">Content Editor</th>
                      <th className="pb-2 font-medium">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.userId} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">
                          {u.displayName || <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                          {u.userId.slice(0, 8)}…
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                              checked={u.isContentEditor}
                              disabled={u.savingPermission}
                              onChange={(e) => handleContentEditorChange(u.userId, e.target.checked)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {u.savingPermission ? "Saving…" : u.isContentEditor ? "Enabled" : "Disabled"}
                            </span>
                          </label>
                        </td>
                        <td className="py-3">
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.userId, val as AppRole)}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Roles:</strong> <code>user</code> — standard access (all public pages).{" "}
              <code>admin</code> — full access including this admin panel.{" "}
              <strong>Content Editor:</strong> grants the user the ability to enter Edit Mode on public pages and make inline text/image edits. Requires <code>admin</code> role to take effect.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;

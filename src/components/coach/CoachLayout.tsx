import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Mail,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Video,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BASE_NAV = [
  { path: "/coach", label: "Dashboard", icon: LayoutDashboard },
  { path: "/coach/players", label: "Players", icon: Users },
  { path: "/coach/videos", label: "Video Library", icon: Video },
  { path: "/coach/live", label: "Live Streaming", icon: Radio },
  { path: "/coach/email", label: "Send Email", icon: Mail },
  { path: "/coach/email-history", label: "Email History", icon: ClipboardList },
];

const TEAMS_ITEM = { path: "/coach/teams", label: "Teams & Mailing Lists", icon: ClipboardList };

const CoachLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTeams, setShowTeams] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) { setShowTeams(true); return; }
    (supabase as any)
      .from("coach_teams")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .then(({ count }: { count: number | null }) => setShowTeams((count ?? 0) > 0));
  }, [user, isAdmin]);

  const navItems = showTeams
    ? [BASE_NAV[0], BASE_NAV[1], TEAMS_ITEM, ...BASE_NAV.slice(2)]
    : BASE_NAV;

  return (
    <div className="min-h-screen flex bg-muted/30">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64
        bg-card border-r border-border text-foreground
        transform transition-transform lg:transform-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Link to="/coach" className="text-lg font-bold text-foreground">
                Coach Portal
              </Link>
              <button
                className="lg:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {user?.email}
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active =
                path === "/coach"
                  ? location.pathname === "/coach"
                  : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-card">
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">Coach Portal</span>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default CoachLayout;

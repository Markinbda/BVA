import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Newspaper, CalendarDays, Image, FileText,
  Heart, LogOut, Menu, X, Settings, Upload, Trophy, Users, Medal, ImagePlus,
  Tag, MapPin, ClipboardList, SlidersHorizontal, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/users", label: "System Users", icon: Users, permission: "manage_users" },
  { path: "/admin/seasons", label: "Season History", icon: Medal, permission: "manage_leagues" },
  { path: "/admin/news", label: "News", icon: Newspaper, permission: "manage_news" },
  { path: "/admin/events", label: "Events", icon: CalendarDays, permission: "manage_events" },
  { path: "/admin/event-categories", label: "Event Categories", icon: Tag, permission: "manage_events" },
  { path: "/admin/event-locations", label: "Event Locations", icon: MapPin, permission: "manage_events" },
  { path: "/admin/gallery", label: "Gallery", icon: Image, permission: "manage_gallery" },
  { path: "/admin/gallery-categories", label: "Gallery Categories", icon: Tag, permission: "manage_gallery" },
  { path: "/admin/images", label: "Image Manager", icon: ImagePlus, permission: "manage_images" },
  { path: "/admin/pages", label: "Page Content", icon: FileText, permission: "manage_pages" },
  { path: "/admin/hero-slides", label: "Homepage Slider", icon: SlidersHorizontal, permission: "manage_pages" },
  { path: "/admin/sponsors", label: "Sponsors", icon: Heart, permission: "manage_sponsors" },
  { path: "/admin/leagues", label: "Leagues", icon: Trophy, permission: "manage_leagues" },
  { path: "/admin/videos", label: "Videos", icon: Video, permission: "manage_gallery" },
  { path: "/admin/settings", label: "Settings", icon: Settings, permission: "manage_settings" },
  { path: "/admin/import", label: "WP Import", icon: Upload, permission: "manage_import" },
  { path: "/coach", label: "Coach Portal", icon: ClipboardList, permission: "manage_coaches" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user, isAdmin, isSystemUser, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNavItems = navItems.filter((item) => {
    if (isAdmin) return true;
    if (!item.permission) return isSystemUser;
    return hasPermission(item.permission);
  });

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        bg-card border-r border-border text-foreground
        transform transition-transform lg:transform-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Link to="/admin" className="text-lg font-bold text-foreground">BVA Admin</Link>
              <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNavItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border space-y-1">
            <Link 
              to="/" 
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              ← Back to Site
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 w-full"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">BVA Admin</span>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

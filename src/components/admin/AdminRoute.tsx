import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface AdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "league_director">;
  requiredPermissions?: string[];
}

const AdminRoute = ({ children, allowedRoles = ["admin"], requiredPermissions = [] }: AdminRouteProps) => {
  const { user, isAdmin, isLeagueDirector, isSystemUser, loading, signOut, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const hasRoleAccess = isAdmin || (allowedRoles.includes("league_director") && isLeagueDirector);
  const hasPermissionAccess = requiredPermissions.length > 0 ? hasPermission(requiredPermissions) : isSystemUser;
  const hasAccess = hasRoleAccess || hasPermissionAccess;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this area. Ask an administrator to enable the right access boxes for your account.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={async () => { await signOut(); window.location.href = "/admin/login"; }}>
              Sign in with a different account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;

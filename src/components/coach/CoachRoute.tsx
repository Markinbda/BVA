import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface CoachRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

const CoachRoute = ({ children, requiredPermissions = ["manage_coaches"] }: CoachRouteProps) => {
  const { user, isAdmin, loading, hasPermission } = useAuth();

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

  const hasAccess = isAdmin || hasPermission(requiredPermissions);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You need Coach Portal access. Ask an administrator to enable the{" "}
            <strong>Coach portal</strong> permission for your account.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default CoachRoute;

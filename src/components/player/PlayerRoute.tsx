import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PlayerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isPlayer, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!isPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-2xl font-bold text-foreground">Player Access Required</h1>
          <p className="text-muted-foreground">
            This area is available for accounts linked to a player email address.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PlayerRoute;

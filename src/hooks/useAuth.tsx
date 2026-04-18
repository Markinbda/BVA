import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hasSystemAccess } from "@/lib/adminPermissions";

const OWNER_FALLBACK_EMAILS = ["markinbda@outlook.com"];
const isOwnerFallbackEmail = (email?: string | null) =>
  !!email && OWNER_FALLBACK_EMAILS.includes(email.toLowerCase());

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLeagueDirector: boolean;
  isPlayer: boolean;
  isSystemUser: boolean;
  permissions: string[];
  canEditContent: boolean;
  loading: boolean;
  hasPermission: (permission: string | string[]) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isLeagueDirector: false,
  isPlayer: false,
  isSystemUser: false,
  permissions: [],
  canEditContent: false,
  loading: true,
  hasPermission: () => false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLeagueDirector, setIsLeagueDirector] = useState(false);
  const [isPlayer, setIsPlayer] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [canEditContent, setCanEditContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
  };

  const applyOwnerFallback = (email?: string | null) => {
    if (!isOwnerFallbackEmail(email) || !isMountedRef.current) return;
    setIsAdmin(true);
    setCanEditContent(true);
    setPermissions((prev) =>
      Array.from(new Set([...prev, "admin_access", "super_admin", "manage_users", "manage_pages", "content_editor"]))
    );
  };

  const hasPermission = (required: string | string[]) => {
    const requiredList = Array.isArray(required) ? required : [required];
    if (isAdmin) return true;
    return requiredList.some((permission) => permissions.includes(permission));
  };

  const isSystemUser = isAdmin || isLeagueDirector || hasSystemAccess(permissions);

  const checkAdminRole = async (userId: string, email?: string | null) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    } as any);
    if (isMountedRef.current) setIsAdmin(!!data || isOwnerFallbackEmail(email));
  };

  const checkUserPermissions = async (userId: string, email?: string | null) => {
    const { data } = await supabase.from<any>("user_permissions").select("permission").eq("user_id", userId);
    const loadedPermissions = data?.map((item: any) => item.permission as string) ?? [];
    const effectivePermissions = isOwnerFallbackEmail(email)
      ? Array.from(new Set([...loadedPermissions, "admin_access", "super_admin", "manage_users", "manage_pages", "content_editor"]))
      : loadedPermissions;
    if (isMountedRef.current) {
      setPermissions(effectivePermissions);
      setCanEditContent(
        isOwnerFallbackEmail(email) ||
        effectivePermissions.some((permission) => ["content_editor", "super_admin", "manage_pages"].includes(permission))
      );
    }
  };

  const checkLeagueDirectorRole = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "league_director",
    } as any);
    if (isMountedRef.current) setIsLeagueDirector(!!data);
  };

  const checkPlayerRole = async (email?: string | null) => {
    if (!email) { if (isMountedRef.current) setIsPlayer(false); return; }
    const { data, error } = await (supabase as any)
      .rpc("get_players_by_email_normalized", { p_email: email });
    if (error) {
      if (isMountedRef.current) setIsPlayer(false);
      return;
    }
    if (isMountedRef.current) setIsPlayer((data?.length ?? 0) > 0);
  };

  useEffect(() => {
    isMountedRef.current = true;
    let lastSessionId: string | null = null;

    const runPermissionChecks = async (userId: string, email: string | undefined) => {
      // Keep role/permission checks timeout-bound, but always run player lookup to avoid false negatives.
      await Promise.allSettled([
        withTimeout(checkAdminRole(userId, email), 6000),
        withTimeout(checkLeagueDirectorRole(userId), 6000),
        withTimeout(checkUserPermissions(userId, email), 6000),
      ]);
      await checkPlayerRole(email);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMountedRef.current) return;
        
        const currentSessionId = session?.user?.id ?? null;
        // Only run checks if the session ID changed (prevent duplicate concurrent runs)
        const sessionChanged = currentSessionId !== lastSessionId;
        lastSessionId = currentSessionId;

        setSession(session);
        setUser(session?.user ?? null);
        applyOwnerFallback(session?.user?.email);
        
        if (session?.user && sessionChanged) {
          await runPermissionChecks(session.user.id, session.user.email);
        }

        if (isMountedRef.current) setLoading(false);
      }
    );

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        applyOwnerFallback(session?.user?.email);
        if (session?.user) {
          await runPermissionChecks(session.user.id, session.user.email);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        display_name: displayName,
      });
    }
    return { error: error as Error | null };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsLeagueDirector(false);
    setIsPlayer(false);
    setPermissions([]);
    setCanEditContent(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLeagueDirector, isPlayer, isSystemUser, permissions, canEditContent, loading, hasPermission, signIn, signUp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

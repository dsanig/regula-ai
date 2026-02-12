import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  is_admin: boolean;
  is_root_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isRootAdmin: boolean;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (userId: string) => {
      try {
        const [{ data }, { data: adminRole }, { data: rootAdmin }] = await Promise.all([
          supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single(),
          supabase.rpc("has_role", { _user_id: userId, _role: "Administrador" }),
          supabase.rpc("is_root_admin", { uid: userId }),
        ]);

        setProfile(data as Profile | null);
        setIsAdmin(Boolean(adminRole));
        setIsRootAdmin(Boolean(rootAdmin));
      } catch {
        setProfile(null);
        setIsAdmin(false);
        setIsRootAdmin(false);
      }
    };

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsRootAdmin(false);
      }
    };

    // Safety timeout: if auth never resolves, stop loading and show login
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        clearTimeout(safetyTimeout);
        applySession(nextSession);
      }
    );

    supabase.auth
      .getSession()
      .then(({ data: { session: nextSession } }) => {
        clearTimeout(safetyTimeout);
        applySession(nextSession);
      })
      .catch(() => {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsRootAdmin(false);
  };

  const refreshPermissions = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsRootAdmin(false);
      return;
    }

    const [{ data: adminRole }, { data: rootAdmin }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "Administrador" }),
      supabase.rpc("is_root_admin", { uid: user.id }),
    ]);

    setIsAdmin(Boolean(adminRole));
    setIsRootAdmin(Boolean(rootAdmin));
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, isRootAdmin, isLoading, refreshPermissions, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

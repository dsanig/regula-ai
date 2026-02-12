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
        const [{ data }, { data: adminRole }, { data: superadminRole }] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .or(`user_id.eq.${userId},id.eq.${userId}`)
            .maybeSingle(),
          (supabase as any).rpc("has_role", { uid: userId, r: "Administrador" }),
          (supabase as any).rpc("is_superadmin", { uid: userId }),
        ]);

        setProfile((data as Profile | null) ?? null);
        setIsAdmin(Boolean(adminRole) || Boolean(superadminRole));
        setIsRootAdmin(Boolean(superadminRole));
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

    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      clearTimeout(safetyTimeout);
      applySession(nextSession);
    });

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

    const [{ data: adminRole }, { data: superadminRole }] = await Promise.all([
      (supabase as any).rpc("has_role", { uid: user.id, r: "Administrador" }),
      (supabase as any).rpc("is_superadmin", { uid: user.id }),
    ]);

    setIsAdmin(Boolean(adminRole) || Boolean(superadminRole));
    setIsRootAdmin(Boolean(superadminRole));
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

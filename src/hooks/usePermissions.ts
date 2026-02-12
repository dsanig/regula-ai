import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

const rpcClient = supabase as unknown as RpcClient;

interface PermissionsState {
  isLoading: boolean;
  isSuperadmin: boolean;
  isAdministrador: boolean;
  isEditor: boolean;
  canManageCompany: boolean;
  canEditContent: boolean;
  isViewer: boolean;
  canManagePasswords: boolean;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(): PermissionsState {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isAdministrador, setIsAdministrador] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  const readRole = useCallback(async (userId: string, role: "Administrador" | "Editor") => {
    const candidates = [
      () => rpcClient.rpc("has_role", { uid: userId, r: role }),
      () => rpcClient.rpc("has_role", { _user_id: userId, _role: role }),
    ];

    for (const call of candidates) {
      const { data, error } = await call();
      if (!error) {
        return Boolean(data);
      }
    }

    return false;
  }, []);

  const readIsSuperadmin = useCallback(async (userId: string) => {
    const candidates = [
      () => rpcClient.rpc("is_superadmin", { uid: userId }),
      () => rpcClient.rpc("is_root_admin", { uid: userId }),
    ];

    for (const call of candidates) {
      const { data, error } = await call();
      if (!error) {
        return Boolean(data);
      }
    }

    return false;
  }, []);

  const readIsAdministrador = useCallback(async (userId: string) => {
    const candidates = [
      () => readRole(userId, "Administrador"),
      async () => {
        const { data, error } = await rpcClient.rpc("is_admin", { uid: userId });
        return !error && Boolean(data);
      },
    ];

    for (const call of candidates) {
      const result = await call();
      if (result) {
        return true;
      }
    }

    return false;
  }, [readRole]);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setIsSuperadmin(false);
      setIsAdministrador(false);
      setIsEditor(false);
      setIsLoading(false);
      return;
    }

    const userId = session.user.id;

    const [superadminResult, adminResult, editorResult] = await Promise.all([
      readIsSuperadmin(userId),
      readIsAdministrador(userId),
      readRole(userId, "Editor"),
    ]);

    setIsSuperadmin(superadminResult);
    setIsAdministrador(adminResult);
    setIsEditor(editorResult);
    setIsLoading(false);
  }, [readIsAdministrador, readIsSuperadmin, readRole]);

  useEffect(() => {
    void refreshPermissions();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshPermissions]);

  const canManageCompany = isSuperadmin || isAdministrador;
  const canEditContent = canManageCompany || isEditor;

  return {
    isLoading,
    isSuperadmin,
    isAdministrador,
    isEditor,
    canManageCompany,
    canEditContent,
    isViewer: !canEditContent,
    canManagePasswords: isSuperadmin,
    refreshPermissions,
  };
}

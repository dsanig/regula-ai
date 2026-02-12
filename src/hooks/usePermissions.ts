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
  canUpload: boolean;
  canAccessEmpresa: boolean;
  canManagePasswords: boolean;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(): PermissionsState {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isAdministrador, setIsAdministrador] = useState(false);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setIsSuperadmin(false);
      setIsAdministrador(false);
      setIsLoading(false);
      return;
    }

    const userId = session.user.id;

    const readIsSuperadmin = async () => {
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
    };

    const readIsAdministrador = async () => {
      const candidates = [
        () => rpcClient.rpc("has_role", { uid: userId, r: "Administrador" }),
        () => rpcClient.rpc("has_role", { _user_id: userId, _role: "Administrador" }),
        () => rpcClient.rpc("is_admin", { uid: userId }),
      ];

      for (const call of candidates) {
        const { data, error } = await call();
        if (!error) {
          return Boolean(data);
        }
      }

      return false;
    };

    const [superadmin, adminRole] = await Promise.all([readIsSuperadmin(), readIsAdministrador()]);

    const nextIsSuperadmin = Boolean(superadmin);
    const nextIsAdministrador = Boolean(adminRole);

    setIsSuperadmin(nextIsSuperadmin);
    setIsAdministrador(nextIsAdministrador);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  return {
    isLoading,
    isSuperadmin,
    isAdministrador,
    canUpload: isSuperadmin || isAdministrador,
    canAccessEmpresa: isSuperadmin || isAdministrador,
    canManagePasswords: isSuperadmin,
    refreshPermissions,
  };
}

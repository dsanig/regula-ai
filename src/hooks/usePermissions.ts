import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

    const [{ data: superadmin }, { data: adminRole }] = await Promise.all([
      (supabase as any).rpc("is_superadmin", { uid: userId }),
      (supabase as any).rpc("has_role", { uid: userId, r: "Administrador" }),
    ]);

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

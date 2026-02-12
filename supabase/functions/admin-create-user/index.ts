import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateUserPayload = {
  email: string;
  password: string;
  full_name?: string;
  roles?: string[];
  role?: string;
};

const normalizeRole = (role: string) => {
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin" || normalized === "administrador") {
    return "Administrador";
  }
  if (normalized === "viewer") {
    return "viewer";
  }
  return role.trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Variables de entorno de Supabase incompletas.");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user: caller },
      error: authError,
    } = await anonClient.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido o expirado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: callerProfile, error: callerProfileError } = await serviceClient
      .from("profiles")
      .select("is_root_admin, company_id")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || !callerProfile?.is_root_admin) {
      return new Response(JSON.stringify({ error: "Solo la cuenta root puede gestionar usuarios." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as CreateUserPayload;
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.trim();
    const fullName = payload.full_name?.trim() ?? null;
    const requestedRoles = payload.roles ?? (payload.role ? [payload.role] : ["viewer"]);

    if (!email || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: "Email y contraseña válida (mínimo 8 caracteres) son obligatorios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedRoles = [...new Set(requestedRoles.map((role) => normalizeRole(role)).filter(Boolean))];

    const { data: createdUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createUserError || !createdUserData.user) {
      return new Response(JSON.stringify({ error: createUserError?.message ?? "No se pudo crear el usuario." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = createdUserData.user.id;
    const companyId = callerProfile.company_id ?? null;
    const isAdminRole = normalizedRoles.some((role) => role === "Administrador");

    const { error: profileUpsertError } = await serviceClient.from("profiles").upsert(
      {
        id: newUserId,
        user_id: newUserId,
        email,
        full_name: fullName,
        company_id: companyId,
        is_admin: isAdminRole,
      },
      { onConflict: "user_id" }
    );

    if (profileUpsertError) {
      await serviceClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "No se pudo crear el perfil del usuario." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedRoles.length > 0) {
      const roleRows = normalizedRoles.map((role) => ({ user_id: newUserId, role }));
      const { error: rolesError } = await serviceClient.from("user_roles").upsert(roleRows, {
        onConflict: "user_id,role",
      });

      if (rolesError) {
        await serviceClient.auth.admin.deleteUser(newUserId);
        await serviceClient.from("profiles").delete().eq("user_id", newUserId);
        return new Response(JSON.stringify({ error: `No se pudieron asignar los roles: ${rolesError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        user_id: newUserId,
        email,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[admin-create-user] error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: "Código requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic validation - limit code length to prevent abuse
    if (code.length > 50) {
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Validating demo code");

    // Query demo_codes table with service role (bypasses RLS)
    const { data: codeData, error: codeError } = await supabase
      .from("demo_codes")
      .select("id, is_used, expires_at")
      .eq("code", code.trim())
      .eq("is_used", false)
      .single();

    if (codeError || !codeData) {
      console.log("Demo code not found or already used");
      return new Response(
        JSON.stringify({ valid: false, error: "Código no válido o ya utilizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      console.log("Demo code expired");
      return new Response(
        JSON.stringify({ valid: false, error: "Código expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Demo code is valid");

    // Return only a boolean - no sensitive data exposed
    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Validate demo code error:", e);
    return new Response(
      JSON.stringify({ valid: false, error: "Error al validar código" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

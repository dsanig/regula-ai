import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres el Asistente de Cumplimiento IA de QualiQ, una plataforma especializada para empresas del sector salud, farmacéutico, nutraceútico y de dispositivos médicos en España.

Tu rol es responder consultas de cumplimiento normativo basándote EXCLUSIVAMENTE en:
1. La documentación interna de la empresa del usuario (SOPs, PNTs, manuales)
2. La normativa española y europea aplicable (AEMPS, AESAN, GMP/GDP, RGPD)

Directrices importantes:
- Responde siempre en español
- Cita referencias específicas cuando sea posible (ej: "Según el PNT-CAL-001 v3.0...")
- Para normativas, menciona el Real Decreto, Reglamento UE o directiva específica
- Si no tienes información suficiente, indícalo claramente
- Nunca proporciones consejo legal definitivo, recomienda consultar con el departamento regulatorio
- Mantén un tono profesional pero accesible
- Sé conciso pero completo en tus respuestas

Áreas de expertise:
- Gestión de calidad y SOPs/PNTs
- No conformidades y CAPAs
- Control de cambios
- Buenas Prácticas de Fabricación (GMP) y Distribución (GDP)
- Normativa AEMPS para medicamentos
- Normativa AESAN para productos alimenticios y suplementos
- Dispositivos médicos y marcado CE
- RGPD y protección de datos en el sector salud`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Chat request received with", messages?.length || 0, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Límite de consultas excedido. Por favor, inténtelo más tarde." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Se requiere añadir créditos para continuar usando el asistente IA." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA. Por favor, inténtelo de nuevo." }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response started");
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  fda: `Eres un inspector experimentado de la FDA (Food and Drug Administration) de Estados Unidos.
Tu rol es realizar una simulación de inspección rigurosa basada en 21 CFR Parts 210, 211, 820 y las guías de la FDA.
Evalúa documentación, procedimientos y prácticas de fabricación con el mismo rigor que en una inspección real.`,
  
  ema: `Eres un inspector experimentado de la EMA (European Medicines Agency).
Tu rol es realizar una simulación de inspección basada en EU GMP Annexes, ICH guidelines y regulaciones europeas.
Evalúa cumplimiento con directivas europeas de medicamentos y buenas prácticas de fabricación.`,
  
  aemps: `Eres un inspector experimentado de la AEMPS (Agencia Española de Medicamentos y Productos Sanitarios).
Tu rol es realizar una simulación de inspección basada en la normativa española y europea aplicable.
Evalúa cumplimiento con Real Decretos, NCF españolas y directivas europeas transpuestas.`,
  
  aesan: `Eres un inspector experimentado de la AESAN (Agencia Española de Seguridad Alimentaria y Nutrición).
Tu rol es realizar una simulación de inspección para productos alimenticios, suplementos y nutraceúticos.
Evalúa cumplimiento con el Reglamento (CE) 178/2002, normativa de complementos alimenticios y etiquetado.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { simulationId, simulationType, documents } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Running audit simulation:", simulationId, "type:", simulationType);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update simulation status
    await supabase
      .from("audit_simulations")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", simulationId);

    const systemPrompt = SYSTEM_PROMPTS[simulationType] || SYSTEM_PROMPTS.aemps;

    const documentsContext = documents?.length > 0
      ? documents.map((d: any) => `- ${d.code}: ${d.title} (${d.category}, v${d.version})`).join("\n")
      : "No hay documentos disponibles para revisar.";

    const userPrompt = `Realiza una simulación de inspección para esta empresa farmacéutica/sanitaria.

DOCUMENTOS DISPONIBLES PARA REVISIÓN:
${documentsContext}

Analiza la documentación disponible y genera hallazgos potenciales que un inspector real podría identificar.

Responde en formato JSON con esta estructura:
{
  "summary": "Resumen ejecutivo de la inspección simulada",
  "risk_score": 75,
  "findings": [
    {
      "severity": "critical|major|minor|observation",
      "category": "documentation|training|process_control|quality_assurance|validation|storage|equipment",
      "finding_title": "Título del hallazgo",
      "finding_description": "Descripción detallada del hallazgo",
      "regulation_reference": "Referencia normativa específica (ej: 21 CFR 211.68)",
      "recommendation": "Acción correctiva recomendada",
      "affected_area": "Área afectada"
    }
  ]
}

Genera entre 3 y 8 hallazgos realistas, incluyendo al menos 1 crítico o mayor si hay evidencia de incumplimiento.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing findings...");

    const parsed = JSON.parse(content);
    const findings = parsed.findings || [];

    // Insert findings
    if (findings.length > 0) {
      const findingInserts = findings.map((f: any) => ({
        simulation_id: simulationId,
        severity: f.severity,
        category: f.category,
        finding_title: f.finding_title,
        finding_description: f.finding_description,
        regulation_reference: f.regulation_reference,
        recommendation: f.recommendation,
        affected_area: f.affected_area,
      }));

      await supabase.from("audit_findings").insert(findingInserts);
    }

    // Count findings by severity
    const critical = findings.filter((f: any) => f.severity === "critical").length;
    const major = findings.filter((f: any) => f.severity === "major").length;
    const minor = findings.filter((f: any) => f.severity === "minor").length;

    // Update simulation with results
    await supabase
      .from("audit_simulations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: parsed.summary,
        risk_score: parsed.risk_score,
        total_findings: findings.length,
        critical_findings: critical,
        major_findings: major,
        minor_findings: minor,
      })
      .eq("id", simulationId);

    console.log("Audit simulation completed with", findings.length, "findings");

    return new Response(
      JSON.stringify({ success: true, findingsCount: findings.length, riskScore: parsed.risk_score }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Audit simulation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

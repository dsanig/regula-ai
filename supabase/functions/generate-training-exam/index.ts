import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un experto en formación y evaluación para empresas del sector salud, farmacéutico y de dispositivos médicos.

Tu tarea es generar un examen de 5 preguntas para validar la comprensión de un procedimiento normativo (PNT/SOP).

REGLAS:
1. Las preguntas deben evaluar comprensión real, no memorización
2. Cada pregunta debe tener 4 opciones de respuesta
3. Solo una opción es correcta
4. Las opciones incorrectas deben ser plausibles pero claramente erróneas
5. Incluye una explicación breve para cada respuesta correcta
6. Las preguntas deben cubrir aspectos críticos del procedimiento
7. Usa lenguaje claro y profesional en español

IMPORTANTE: Responde SOLO con el JSON estructurado, sin texto adicional.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, documentTitle, documentContent } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating training exam for session:", sessionId);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update session status
    await supabase
      .from("training_sessions")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", sessionId);

    const userPrompt = `Genera un examen de 5 preguntas para el siguiente procedimiento:

TÍTULO: ${documentTitle}

CONTENIDO:
${documentContent || "Procedimiento normalizado de trabajo para gestión de calidad en el sector farmacéutico. Incluye directrices sobre buenas prácticas de fabricación, control de documentación, gestión de no conformidades y trazabilidad."}

Responde en formato JSON con esta estructura exacta:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "¿Cuál es el objetivo principal del procedimiento?",
      "options": [
        {"id": "a", "text": "Opción A", "isCorrect": false},
        {"id": "b", "text": "Opción B", "isCorrect": true},
        {"id": "c", "text": "Opción C", "isCorrect": false},
        {"id": "d", "text": "Opción D", "isCorrect": false}
      ],
      "explanation": "La respuesta B es correcta porque..."
    }
  ]
}`;

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

    console.log("AI response received, parsing questions...");
    
    const parsed = JSON.parse(content);
    const questions = parsed.questions;

    if (!questions || !Array.isArray(questions)) {
      throw new Error("Invalid questions format");
    }

    // Insert questions into database
    const questionInserts = questions.map((q: any) => ({
      session_id: sessionId,
      question_number: q.question_number,
      question_text: q.question_text,
      options: q.options,
      explanation: q.explanation,
    }));

    const { error: insertError } = await supabase
      .from("training_questions")
      .insert(questionInserts);

    if (insertError) {
      console.error("Error inserting questions:", insertError);
      throw insertError;
    }

    console.log("Training exam generated successfully with", questions.length, "questions");

    return new Response(
      JSON.stringify({ success: true, questionCount: questions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Generate training exam error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

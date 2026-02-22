import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

type TranslateReq = {
    text: string;
    targetLang?: string; // default: "ko"
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders });
    }

    try {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) return json(500, { error: "Missing OPENAI_API_KEY" });

        const body = (await req.json()) as TranslateReq;

        const text = String(body?.text ?? "").trim();
        const targetLang = String(body?.targetLang ?? "ko").trim() || "ko";

        if (!text) return json(400, { error: "text is required" });

        // ✅ 번역 프롬프트 (짧고 안전하게)
        const system = `You are a translation engine. Translate the user's text into ${targetLang}.
Rules:
- Output ONLY the translated text.
- Keep punctuation and line breaks where reasonable.
- Do not add explanations.`;

        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.2,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: text },
                ],
            }),
        });

        if (!resp.ok) {
            const t = await resp.text();
            return json(500, { error: `OpenAI failed: ${resp.status} ${t.slice(0, 400)}` });
        }

        const j: any = await resp.json();
        const translated = String(j?.choices?.[0]?.message?.content ?? "").trim();

        return json(200, { translated });
    } catch (e: any) {
        return json(500, { error: String(e?.message ?? e), stack: String(e?.stack ?? "") });
    }
});
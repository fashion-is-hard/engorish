/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_BASE = "https://api.openai.com/v1";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function requireAuth(req: Request) {
  // 프론트에서 supabase.auth.getSession() 토큰을 Authorization: Bearer로 보냄
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing auth token");
  return auth; // 그대로 OpenAI에 쓰는 게 아니라, 여기서는 인증 존재만 확인 (DB 접근은 기존 supabase client로 이미 RLS 처리)
}

async function openaiTranscribe(audio: Blob) {
  const fd = new FormData();
  fd.append("file", audio, "audio.webm");
  fd.append("model", "gpt-4o-mini-transcribe");
  // 필요하면: fd.append("language","en");

  const r = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`STT failed: ${r.status} ${t}`);
  }
  const j = await r.json();
  return String(j.text ?? "");
}

async function openaiChat(params: {
  system: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}) {
  const body = {
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: params.system }, ...params.messages],
    temperature: 0.6,
  };

  const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Chat failed: ${r.status} ${t}`);
  }
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content ?? "");
}

async function openaiTts(text: string) {
  const body = {
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
    format: "mp3",
  };

  const r = await fetch(`${OPENAI_BASE}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`TTS failed: ${r.status} ${t}`);
  }

  const buf = new Uint8Array(await r.arrayBuffer());
  // base64 encode
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  const b64 = btoa(binary);

  return { mime: "audio/mpeg", b64 };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    await requireAuth(req);

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "multipart/form-data required" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();

    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return new Response(JSON.stringify({ error: "audio file required" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const variant = String(form.get("variant") ?? "A"); // "A" | "B"
    const scenarioTitle = String(form.get("scenario_title") ?? "");
    const opening = String(form.get("opening") ?? "");
    const goalsJson = String(form.get("goals_json") ?? "[]"); // B goals list
    const historyJson = String(form.get("history_json") ?? "[]"); // [{role,content}...]

    const userText = await openaiTranscribe(audio);

    // 아주 기본 시스템 프롬프트(너는 나중에 npc/persona로 확장)
    const system = [
      "You are an English conversation partner in a roleplay scenario.",
      "Keep responses concise, natural, and helpful.",
      variant === "B"
        ? `User must achieve these goals: ${goalsJson}. End naturally when goals are met.`
        : "This is A variant: keep the conversation flowing. User has a 20-turn limit.",
      scenarioTitle ? `Scenario: ${scenarioTitle}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const history = JSON.parse(historyJson) as {
      role: "user" | "assistant";
      content: string;
    }[];

    const messages = [
      ...(opening ? [{ role: "assistant" as const, content: opening }] : []),
      ...history,
      { role: "user" as const, content: userText },
    ];

    const aiText = await openaiChat({ system, messages });
    const tts = await openaiTts(aiText);

    return new Response(
      JSON.stringify({
        user_text: userText,
        ai_text: aiText,
        ai_audio_mime: tts.mime,
        ai_audio_b64: tts.b64,
      }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});

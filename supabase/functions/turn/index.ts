// supabase/functions/turn/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id, user_audio_path, mime } = await req.json();

    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1️⃣ 유저 음성 다운로드
    const audioRes = await fetch(
      `${supabaseUrl}/storage/v1/object/public/audio/${user_audio_path}`
    );

    const audioBlob = await audioRes.blob();

    // 2️⃣ STT (Whisper)
    const formData = new FormData();
    formData.append("file", audioBlob);
    formData.append("model", "whisper-1");

    const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    const sttData = await sttRes.json();
    const transcript = sttData.text ?? "";

    // 3️⃣ LLM 응답
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an English conversation partner." },
          { role: "user", content: transcript },
        ],
      }),
    });

    const chatData = await chatRes.json();
    const aiText = chatData.choices?.[0]?.message?.content ?? "OK";

    // 4️⃣ TTS
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: aiText,
      }),
    });

    const ttsBuffer = await ttsRes.arrayBuffer();
    const aiAudioPath = `ai/${session_id}_${Date.now()}.mp3`;

    await fetch(`${supabaseUrl}/storage/v1/object/audio/${aiAudioPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "audio/mpeg",
      },
      body: ttsBuffer,
    });

    const aiAudioUrl = `${supabaseUrl}/storage/v1/object/public/audio/${aiAudioPath}`;

    // 5️⃣ roleplay_turns 저장 (user + ai)
    await fetch(`${supabaseUrl}/rest/v1/roleplay_turns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          session_id,
          role: "user",
          text: "(음성 입력)",
          user_audio_path,
          user_audio_mime: mime,
          user_transcript: transcript,
          stt_model: "whisper-1",
        },
        {
          session_id,
          role: "ai",
          text: aiText,
          ai_audio_path: aiAudioPath,
          tts_model: "gpt-4o-mini-tts",
          tts_voice: "alloy",
        },
      ]),
    });

    return new Response(
      JSON.stringify({
        user: { text: transcript },
        ai: { text: aiText, audio_url: aiAudioUrl },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
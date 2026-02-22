// supabase/functions/turn/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TurnReq = {
  sessionId: string;
  userAudioPath?: string; // startOnly일 땐 없어도 됨
  userAudioMime?: string;
  clientTz?: string;
  clientUtcOffsetMin?: number;
  ttsVoice?: string;
  turnLimit?: number;
  startOnly?: boolean; // ✅ 추가
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function wordCount(s: string) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

Deno.serve(async (req) => {
  // ✅ preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const AUDIO_BUCKET = Deno.env.get("AUDIO_BUCKET") ?? "audio";

    if (!SUPABASE_URL) return json(500, { error: "Missing SUPABASE_URL" });
    if (!SERVICE_ROLE_KEY) return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    if (!OPENAI_API_KEY) return json(500, { error: "Missing OPENAI_API_KEY" });

    const body = (await req.json()) as TurnReq;

    const sessionId = (body.sessionId ?? "").trim();
    const startOnly = Boolean(body.startOnly);

    const userAudioPath = (body.userAudioPath ?? "").trim();
    const userAudioMime = body.userAudioMime ?? "audio/webm";
    const ttsVoice = body.ttsVoice ?? "alloy";
    const fallbackTurnLimit = body.turnLimit ?? 20;

    if (!sessionId) return json(400, { error: "sessionId is required" });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1) 세션 로드 (scenario_id까지 같이)
    const { data: sess, error: sessErr } = await supabase
      .from("roleplay_sessions")
      .select("session_id,status,turn_count,scenario_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (sessErr) throw sessErr;
    if (!sess) return json(404, { error: "session not found" });

    // ✅ startOnly: STT 없이 첫 AI 문장만 만들고 TTS까지 반환
    if (startOnly) {
      // scenarios.opening_ai_text 우선, 없으면 fallback
      let opening = "Hi! I'm glad to be with you.";

      if (sess.scenario_id != null) {
        const { data: sc, error: scErr } = await supabase
          .from("scenarios")
          .select("opening_ai_text")
          .eq("scenario_id", sess.scenario_id)
          .maybeSingle();
        if (scErr) throw scErr;

        const v = String(sc?.opening_ai_text ?? "").trim();
        if (v) opening = v;
      }

      // turn_no 계산(최신 + 1)
      const { data: maxRow, error: maxErr } = await supabase
        .from("roleplay_turns")
        .select("turn_no")
        .eq("session_id", sessionId)
        .order("turn_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;

      const aiTurnNo = Number(maxRow?.turn_no ?? 0) + 1;

      // TTS
      const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: ttsVoice,
          input: opening,
          format: "mp3",
        }),
      });

      if (!ttsResp.ok) {
        const t = await ttsResp.text();
        throw new Error(`TTS failed: ${ttsResp.status} ${t.slice(0, 400)}`);
      }

      const mp3Buf = await ttsResp.arrayBuffer();
      const aiAudioPath = `ai/${sessionId}_${Date.now()}.mp3`;

      const { error: upAiErr } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(aiAudioPath, new Blob([mp3Buf], { type: "audio/mpeg" }), {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (upAiErr) throw upAiErr;

      const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(aiAudioPath);
      const aiAudioUrl = pub?.publicUrl ?? null;

      // (선택) 첫 AI 턴 저장
      const baseMeta = {
        client_tz: body.clientTz ?? null,
        client_utc_offset_min: body.clientUtcOffsetMin ?? null,
      };

      const { error: insAiErr } = await supabase.from("roleplay_turns").insert({
        session_id: sessionId,
        role: "ai",
        text: opening,
        corrected_text: null,
        word_count: wordCount(opening),
        created_at: nowIso(),
        turn_no: aiTurnNo,
        ai_audio_path: aiAudioPath,
        ai_audio_mime: "audio/mpeg",
        tts_model: "gpt-4o-mini-tts",
        tts_voice: ttsVoice,
        audio_url: aiAudioUrl,
        ...baseMeta,
      });
      if (insAiErr) throw insAiErr;

      const newTurnCount = Number(sess.turn_count ?? 0) + 1;

      const { error: upSessErr } = await supabase
        .from("roleplay_sessions")
        .update({
          turn_count: newTurnCount,
          status: sess.status ?? "active",
        })
        .eq("session_id", sessionId);
      if (upSessErr) throw upSessErr;

      return json(200, {
        sessionId,
        startOnly: true,
        userTranscript: null,
        aiText: opening,
        aiAudioUrl,
        aiAudioPath,
        turnCount: newTurnCount,
        ended: false,
      });
    }

    // ✅ 일반 turn: userAudioPath 필수
    if (!userAudioPath) {
      return json(400, { error: "userAudioPath is required (unless startOnly=true)" });
    }

    // 2) 다음 turn_no (user + ai)
    const { data: maxRow, error: maxErr } = await supabase
      .from("roleplay_turns")
      .select("turn_no")
      .eq("session_id", sessionId)
      .order("turn_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw maxErr;

    const baseTurnNo = Number(maxRow?.turn_no ?? 0);
    const userTurnNo = baseTurnNo + 1;
    const aiTurnNo = baseTurnNo + 2;

    // 3) Storage에서 음성 다운로드
    const { data: dl, error: dlErr } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(userAudioPath);
    if (dlErr) throw dlErr;
    if (!dl) throw new Error("Storage download returned null");

    const audioBuf = await dl.arrayBuffer();

    // 4) STT
    const sttForm = new FormData();
    sttForm.append("file", new Blob([audioBuf], { type: userAudioMime }), "audio.webm");
    sttForm.append("model", "gpt-4o-mini-transcribe");

    const sttResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: sttForm,
    });

    if (!sttResp.ok) {
      const t = await sttResp.text();
      throw new Error(`STT failed: ${sttResp.status} ${t.slice(0, 400)}`);
    }

    const sttJson: any = await sttResp.json();
    const userTranscript = String(sttJson?.text ?? "").trim() || "(음성 입력)";

    // 5) 최근 대화 불러오기
    const { data: recentTurns, error: turnsErr } = await supabase
      .from("roleplay_turns")
      .select("role, text, corrected_text, turn_no")
      .eq("session_id", sessionId)
      .order("turn_no", { ascending: true })
      .limit(30);
    if (turnsErr) throw turnsErr;

    // 6) LLM
    const msgs = [
      {
        role: "system",
        content:
          "You are an English conversation partner. Reply in natural English, concise (1-2 sentences), and ask one follow-up question.",
      },
      ...(recentTurns ?? []).map((t: any) => ({
        role: t.role === "ai" ? "assistant" : "user",
        content: String(t.corrected_text ?? t.text ?? ""),
      })),
      { role: "user", content: userTranscript },
    ];

    const llmResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: msgs,
        temperature: 0.6,
      }),
    });

    if (!llmResp.ok) {
      const t = await llmResp.text();
      throw new Error(`LLM failed: ${llmResp.status} ${t.slice(0, 400)}`);
    }

    const llmJson: any = await llmResp.json();
    const aiText = String(llmJson?.choices?.[0]?.message?.content ?? "").trim() || "OK";

    // 7) TTS
    const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: ttsVoice,
        input: aiText,
        format: "mp3",
      }),
    });

    if (!ttsResp.ok) {
      const t = await ttsResp.text();
      throw new Error(`TTS failed: ${ttsResp.status} ${t.slice(0, 400)}`);
    }

    const mp3Buf = await ttsResp.arrayBuffer();
    const aiAudioPath = `ai/${sessionId}_${Date.now()}.mp3`;

    const { error: upAiErr } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(aiAudioPath, new Blob([mp3Buf], { type: "audio/mpeg" }), {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (upAiErr) throw upAiErr;

    const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(aiAudioPath);
    const aiAudioUrl = pub?.publicUrl ?? null;

    // 8) roleplay_turns 저장 (user + ai)
    const baseMeta = {
      client_tz: body.clientTz ?? null,
      client_utc_offset_min: body.clientUtcOffsetMin ?? null,
    };

    const { error: insErr } = await supabase.from("roleplay_turns").insert([
      {
        session_id: sessionId,
        role: "user",
        text: userTranscript,
        corrected_text: null,
        word_count: wordCount(userTranscript),
        created_at: nowIso(),
        turn_no: userTurnNo,
        user_audio_path: userAudioPath,
        user_audio_mime: userAudioMime,
        user_transcript: userTranscript,
        stt_model: "gpt-4o-mini-transcribe",
        ...baseMeta,
      },
      {
        session_id: sessionId,
        role: "ai",
        text: aiText,
        corrected_text: null,
        word_count: wordCount(aiText),
        created_at: nowIso(),
        turn_no: aiTurnNo,
        ai_audio_path: aiAudioPath,
        ai_audio_mime: "audio/mpeg",
        tts_model: "gpt-4o-mini-tts",
        tts_voice: ttsVoice,
        audio_url: aiAudioUrl,
        ...baseMeta,
      },
    ]);
    if (insErr) throw insErr;

    // 9) turn_count 증가 + 종료
    const newTurnCount = Number(sess.turn_count ?? 0) + 2;
    const shouldEnd = newTurnCount >= fallbackTurnLimit;

    const { error: upSessErr } = await supabase
      .from("roleplay_sessions")
      .update({
        turn_count: newTurnCount,
        status: shouldEnd ? "ended" : (sess.status ?? "active"),
        ended_at: shouldEnd ? nowIso() : null,
      })
      .eq("session_id", sessionId);
    if (upSessErr) throw upSessErr;

    return json(200, {
      sessionId,
      userTranscript,
      aiText,
      aiAudioUrl,
      aiAudioPath,
      turnCount: newTurnCount,
      ended: shouldEnd,
    });
  } catch (e: any) {
    return json(500, {
      error: String(e?.message ?? e),
      stack: String(e?.stack ?? ""),
    });
  }
});
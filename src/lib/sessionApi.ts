import { supabase } from "./supabaseClient";

export type SessionSettings = {
  correction_mode: boolean;
  difficulty: "basic" | "hard";
  speech_rate: 0.8 | 1.0 | 1.2 | 1.5;
};

export async function createSession(params: {
  variant: "A" | "B";
  scenarioId: number;
  settings: SessionSettings;
}) {
  const { variant, scenarioId, settings } = params;

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userRes.user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("roleplay_sessions")
    .insert({
      user_id: userRes.user.id,
      variant,
      scenario_id: scenarioId,
      settings,
    })
    .select("session_id")
    .single();

  if (error) throw error;
  return data.session_id as string;
}

export async function addTurn(params: {
  sessionId: string;
  role: "user" | "ai" | "system";
  text: string;
  corrected_text?: string | null;
}) {
  const wordCount = countWords(params.text);

  const { error } = await supabase.from("roleplay_turns").insert({
    session_id: params.sessionId,
    role: params.role,
    text: params.text,
    corrected_text: params.corrected_text ?? null,
    word_count: wordCount,
  });
  if (error) throw error;

  // 세션 카운터 업데이트(간단 버전)
  const { error: updErr } = await supabase.rpc("increment_session_counts", {
    p_session_id: params.sessionId,
    p_add_turn: params.role === "user" ? 1 : 0,
    p_add_words: params.role === "user" ? wordCount : 0,
  });
  // RPC 없으면 무시(아래에서 만들어줄게)
  if (updErr) {
    // fallback: 그냥 무시 (나중에 정교하게)
  }
}

export function countWords(text: string) {
  return (text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

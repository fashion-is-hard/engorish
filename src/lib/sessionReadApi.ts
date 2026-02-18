import { supabase } from "./supabaseClient";

export type SessionRow = {
  session_id: string;
  user_id: string;
  variant: "A" | "B";
  scenario_id: number;
  status: "in_progress" | "ended";
  started_at: string;
  ended_at: string | null;
  settings: any;
  turn_count: number;
  word_count: number;
};

export async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from("roleplay_sessions")
    .select("session_id,user_id,variant,scenario_id,status,started_at,ended_at,settings,turn_count,word_count")
    .eq("session_id", sessionId)
    .single();
  if (error) throw error;
  return data as SessionRow;
}

export async function getTurns(sessionId: string) {
  const { data, error } = await supabase
    .from("roleplay_turns")
    .select("turn_id,role,text,corrected_text,created_at")
    .eq("session_id", sessionId)
    .order("turn_id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

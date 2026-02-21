// src/lib/sessionReadApi.ts
import { supabase } from "@/lib/supabaseClient";

export type Variant = "A" | "B";

export type SessionRow = {
  session_id: string;
  user_id: string | null;
  variant: Variant;
  scenario_id: number;

  status: string | null;
  started_at: string | null;
  ended_at: string | null;

  settings: any | null; // jsonb
  turn_count: number | null;
  word_count: number | null;
  metrics: any | null; // jsonb
  result: any | null;  // jsonb
};

export type TurnRow = {
  turn_id: string;
  session_id: string;
  role: "user" | "ai" | "system";
  text: string;
  corrected_text: string | null;
  created_at: string;
};

function toVariant(v: unknown): Variant {
  return v === "B" ? "B" : "A";
}

export async function getSession(sessionId: string): Promise<SessionRow> {
  const { data, error } = await supabase
    .from("roleplay_sessions")
    .select(
      "session_id,user_id,variant,scenario_id,status,started_at,ended_at,settings,turn_count,word_count,metrics,result"
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("세션이 없습니다.");

  const row = data as Omit<SessionRow, "variant"> & { variant: any };
  return { ...row, variant: toVariant(row.variant) };
}

export async function getTurns(sessionId: string): Promise<TurnRow[]> {
  const { data, error } = await supabase
    .from("roleplay_turns")
    .select("turn_id,session_id,role,text,corrected_text,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TurnRow[];
}

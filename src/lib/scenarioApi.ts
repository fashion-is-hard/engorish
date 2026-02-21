import { supabase } from "./supabaseClient";

export type ScenarioDetail = {
  scenario_id: number;
  package_id: number;
  title: string;
  one_liner: string | null;
  example_phrases: any | null;
  opening_ai_text: string | null;
  thumbnail_key: string | null;
};

export type ScenarioGoalRow = {
  goal_id: number;
  scenario_id: number;
  goal_text: string;
  sort_order: number | null;
  goal_prompt_en: string | null;
};

export async function getScenarioById(scenarioId: number) {
  const { data, error } = await supabase
    .from("scenarios")
    .select("scenario_id,package_id,title,one_liner,example_phrases,opening_ai_text,thumbnail_key")
    .eq("scenario_id", scenarioId)
    .single();

  if (error) throw error;
  return data as ScenarioDetail;
}

export async function getGoalsByScenarioId(scenarioId: number) {
  const { data, error } = await supabase
    .from("scenario_goals")
    .select("goal_id,scenario_id,goal_text,sort_order")
    .eq("scenario_id", scenarioId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScenarioGoalRow[];
}

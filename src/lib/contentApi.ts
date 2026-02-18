import { supabase } from "./supabaseClient";

export type CategoryRow = {
  category_id: number;
  title: string;
  sort_order: number | null;
  is_active: boolean | null;
  thumbnail_key: string | null;
};

export type PackageRow = {
  package_id: number;
  category_id: number;
  title: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  thumbnail_key: string | null;
};

export type ScenarioRow = {
  scenario_id: number;
  package_id: number;
  title: string;
  one_liner: string | null;
  example_phrases: any | null; // jsonb
  opening_ai_text: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  thumbnail_key: string | null;
};

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("category_id,title,sort_order,is_active,thumbnail_key")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function getPackagesByCategory(categoryId: number) {
  const { data, error } = await supabase
    .from("packages")
    .select("package_id,category_id,title,description,sort_order,is_active,thumbnail_key")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PackageRow[];
}

export async function getScenariosByPackage(packageId: number) {
  const { data, error } = await supabase
    .from("scenarios")
    .select(
      "scenario_id,package_id,title,one_liner,example_phrases,opening_ai_text,sort_order,is_active,thumbnail_key"
    )
    .eq("package_id", packageId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScenarioRow[];
}

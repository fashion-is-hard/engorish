import { supabase } from "@/lib/supabaseClient";

export type HomeInProgressRow = {
    session_id: string;
    user_id: string | null;
    variant: "A" | "B" | string;
    scenario_id: number;
    scenario_title: string;
    status: string | null;
    started_at: string | null;
    turn_count: number | null;
    word_count: number | null;
};

export type HomeRecentRow = {
    session_id: string;
    user_id: string | null;
    variant: "A" | "B" | string;
    scenario_id: number;
    scenario_title: string;
    status: string | null;
    started_at: string | null;
    ended_at: string | null;
    turn_count: number | null;
    word_count: number | null;
    result: any; // jsonb
};

export async function getHomeInProgress(userId: string) {
    const { data, error } = await supabase
        .from("v_home_inprogress_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1);

    if (error) throw error;
    return (data ?? []) as HomeInProgressRow[];
}

export async function getHomeRecent(userId: string, limit = 5) {
    const { data, error } = await supabase
        .from("v_home_recent_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("ended_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data ?? []) as HomeRecentRow[];
}

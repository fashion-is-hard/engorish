// src/pages/home/HomePage.tsx
import { useEffect, useMemo, useState } from "react";
import InProgressCard, { SessionRow } from "./InProgressCard";
import { supabase } from "@/lib/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";

type HomeStats = {
  totalSessions: number;
  totalDurationSec: number;
  bTotal: number;
  bSuccess: number;
  bSuccessRate: number;
};

function toVariant(v: any): "A" | "B" {
  return v === "B" ? "B" : "A";
}

function secondsBetween(startedAt: string | null, endedAt: string | null) {
  if (!startedAt) return 0;
  const s = new Date(startedAt).getTime();
  const e = endedAt ? new Date(endedAt).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  return Number.isFinite(sec) && sec > 0 ? sec : 0;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  const [inProgress, setInProgress] = useState<SessionRow | null>(null);
  const [recent, setRecent] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<HomeStats>({
    totalSessions: 0,
    totalDurationSec: 0,
    bTotal: 0,
    bSuccess: 0,
    bSuccessRate: 0,
  });

  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        const selectCols =
          "session_id,user_id,variant,scenario_id,status,started_at,ended_at,turn_count,word_count,result"; // ✅ word_count

        const { data: inprog, error: e1 } = await supabase
          .from("roleplay_sessions")
          .select(selectCols)
          .eq("user_id", user.id)
          .in("status", ["active", "in_progress", "started"])
          .order("started_at", { ascending: false })
          .limit(1);
        if (e1) throw e1;

        const { data: rec, error: e2 } = await supabase
          .from("roleplay_sessions")
          .select(selectCols)
          .eq("user_id", user.id)
          .eq("status", "ended")
          .order("ended_at", { ascending: false })
          .limit(3);
        if (e2) throw e2;

        const { data: all, error: e3 } = await supabase
          .from("roleplay_sessions")
          .select("variant,started_at,ended_at,result,status")
          .eq("user_id", user.id)
          .eq("status", "ended")
          .order("ended_at", { ascending: false })
          .limit(200);
        if (e3) throw e3;

        const totalSessions = (all ?? []).length;
        const totalDurationSec = (all ?? []).reduce(
          (acc: number, s: any) => acc + secondsBetween(s.started_at ?? null, s.ended_at ?? null),
          0
        );

        const bSessions = (all ?? []).filter((s: any) => toVariant(s.variant) === "B");
        const bTotal = bSessions.length;
        const bSuccess = bSessions.filter((s: any) => Boolean(s.result?.success)).length;
        const bSuccessRate = bTotal > 0 ? Math.round((bSuccess / bTotal) * 100) : 0;

        if (!mounted) return;

        setInProgress(((inprog ?? [])[0] as SessionRow) ?? null);
        setRecent((rec ?? []) as SessionRow[]);
        setStats({ totalSessions, totalDurationSec, bTotal, bSuccess, bSuccessRate });
      } catch (e: any) {
        alert(e?.message ?? "홈 데이터 로드 실패");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totalMinutes = useMemo(() => Math.floor(stats.totalDurationSec / 60), [stats.totalDurationSec]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>Engorish</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => nav(`${base}/category`)}
            style={{
              border: "1px solid #CBD5E1",
              background: "#fff",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            다른 목록
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              nav(`${base}/login`, { replace: true });
            }}
            style={{
              border: "none",
              background: "transparent",
              fontWeight: 800,
              cursor: "pointer",
              opacity: 0.8,
            }}
          >
            → 로그아웃
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>총 플레이</div>
          <div style={valueStyle}>{stats.totalSessions}회</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>총 학습시간</div>
          <div style={valueStyle}>{totalMinutes}분</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>B 성공률</div>
          <div style={valueStyle}>{stats.bSuccessRate}%</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            ({stats.bSuccess}/{stats.bTotal})
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      <InProgressCard loading={loading} inProgress={inProgress} recent={recent} />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.65,
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
};
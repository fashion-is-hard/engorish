// src/pages/home/HomePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getBasePath } from "@/lib/abVariant";

type SessionRow = {
  session_id: string;
  user_id: string;
  variant: "A" | "B" | string | null;
  scenario_id: number | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  turn_count: number | null;
  word_count: number | null;
  result: any | null;
};

type ScenarioRow = {
  scenario_id: number;
  package_id: number;
  title: string;
  one_liner: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  thumbnail_key: string | null;
};

type PackageRow = {
  package_id: number;
  category_id: number;
  title: string;
  is_active: boolean | null;
};

export default function HomePage() {
  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [inProgress, setInProgress] = useState<SessionRow | null>(null);

  const [pkgTitle, setPkgTitle] = useState<string>("");
  const [steps, setSteps] = useState<ScenarioRow[]>([]);
  const [currentScenarioId, setCurrentScenarioId] = useState<number | null>(null);

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
          "session_id,user_id,variant,scenario_id,status,started_at,ended_at,turn_count,word_count,result";

        const { data: inprog, error: e1 } = await supabase
          .from("roleplay_sessions")
          .select(selectCols)
          .eq("user_id", user.id)
          .in("status", ["active", "in_progress", "started"])
          .order("started_at", { ascending: false })
          .limit(1);

        if (e1) throw e1;

        const sess = ((inprog ?? [])[0] as SessionRow) ?? null;
        if (!mounted) return;

        setInProgress(sess);

        if (!sess?.scenario_id) {
          setPkgTitle("");
          setSteps([]);
          setCurrentScenarioId(null);
          return;
        }

        setCurrentScenarioId(sess.scenario_id);

        const { data: scen, error: e2 } = await supabase
          .from("scenarios")
          .select(
            "scenario_id,package_id,title,one_liner,sort_order,is_active,thumbnail_key"
          )
          .eq("scenario_id", sess.scenario_id)
          .maybeSingle();

        if (e2) throw e2;
        if (!scen?.package_id) return;

        const packageId = scen.package_id as number;

        const { data: pkg, error: e3 } = await supabase
          .from("packages")
          .select("package_id,category_id,title,is_active")
          .eq("package_id", packageId)
          .maybeSingle();

        if (e3) throw e3;
        setPkgTitle(String(pkg?.title ?? ""));

        const { data: scens, error: e4 } = await supabase
          .from("scenarios")
          .select(
            "scenario_id,package_id,title,one_liner,sort_order,is_active,thumbnail_key"
          )
          .eq("package_id", packageId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (e4) throw e4;

        setSteps((scens ?? []) as ScenarioRow[]);
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

  const totalSteps = steps.length || 0;

  const currentIndex = useMemo(() => {
    if (!currentScenarioId || steps.length === 0) return 0;
    const idx = steps.findIndex((s) => s.scenario_id === currentScenarioId);
    return idx >= 0 ? idx : 0;
  }, [steps, currentScenarioId]);

  const progressText = useMemo(() => {
    if (totalSteps <= 0) return "";
    return `${Math.min(totalSteps, currentIndex + 1)}/${totalSteps}`;
  }, [totalSteps, currentIndex]);

  const progressPct = useMemo(() => {
    if (totalSteps <= 0) return 0;
    return Math.round(((currentIndex + 1) / totalSteps) * 100);
  }, [totalSteps, currentIndex]);

  const headerHeight = 64;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Top App Bar */}
      <div
        style={{
          height: headerHeight,
          background: "#3E4245",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.3 }}>
          Engorish
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            nav(`/login`, { replace: true });
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "#fff",
            fontWeight: 700,
            opacity: 0.9,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          → 로그아웃
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 18 }}>
        {loading && (
          <div style={{ opacity: 0.7, padding: "14px 2px" }}>불러오는 중...</div>
        )}

        {/* 온보딩(진행중 세션 없음) */}
        {!loading && !inProgress && (
          <div style={{ marginTop: 18, display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                padding: 18,
                background: "#fff",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  opacity: 0.8,
                  marginBottom: 12,
                }}
              >
                다양한 시나리오로 체험해보는 영어 회화
              </div>

              {/* ✅ 홈 썸네일 이미지 */}
              <img
                src="/thumbnails/home.png"
                alt="Engorish home thumbnail"
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 8,
                  background: "#E2EAF1",
                  marginBottom: 14,
                  objectFit: "cover",
                  display: "block",
                }}
                loading="eager"
              />

              <button
                onClick={() => nav(`${base}/category`)}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 8,
                  border: "none",
                  background: "#3E4245",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                지금 시작하기
              </button>
            </div>
          </div>
        )}

        {/* 학습 이후(진행중 세션 있음) */}
        {!loading && inProgress && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                진행중인 롤플레잉
              </div>

              <button
                onClick={() => nav(`${base}/category`)}
                style={{
                  border: "1px solid rgba(62,66,69,0.9)",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                다른 목록
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <div
                style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.2 }}
              >
                {pkgTitle || "팀 프로젝트"}
              </div>

              <div style={{ marginTop: 10, position: "relative" }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: "#E2EAF1",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      background: "#AFC3D2",
                      borderRadius: 999,
                    }}
                  />
                </div>

                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: -18,
                    fontSize: 12,
                    opacity: 0.55,
                    fontWeight: 700,
                  }}
                >
                  {progressText}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
              {(steps.length ? steps : fallbackSteps()).map((s, idx) => {
                const isCurrent = currentScenarioId
                  ? s.scenario_id === currentScenarioId
                  : idx === 0;

                const checkBg = isCurrent ? "#3E4245" : "#E2EAF1";
                const checkIconColor = "#ffffff";
                const checkOpacity = isCurrent ? 1 : 0.75;

                return (
                  <div
                    key={s.scenario_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        paddingTop: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "999px",
                          background: checkBg,
                          display: "grid",
                          placeItems: "center",
                          opacity: checkOpacity,
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke={checkIconColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        nav(`${base}/scenario/${s.scenario_id}/prepare`)
                      }
                      style={{
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          borderRadius: 12,
                          background: "#fff",
                          boxShadow: "0 12px 28px rgba(0,0,0,0.10)",
                          border: "1px solid rgba(0,0,0,0.05)",
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 92,
                            height: 92,
                            borderRadius: 10,
                            background: "#E2EAF1",
                            marginBottom: 12,
                          }}
                          data-thumb-key={s.thumbnail_key ?? ""}
                        />

                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            letterSpacing: -0.2,
                          }}
                        >
                          {s.title}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 14,
                            opacity: 0.8,
                            lineHeight: 1.45,
                          }}
                        >
                          {s.one_liner ?? ""}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function fallbackSteps(): ScenarioRow[] {
  return [
    {
      scenario_id: 1,
      package_id: 1,
      title: "역할 분담하기",
      one_liner: "프로젝트를 함께할 팀원들과 첫 대화를 나누고 있습니다.",
      sort_order: 1,
      is_active: true,
      thumbnail_key: null,
    },
    {
      scenario_id: 2,
      package_id: 1,
      title: "회의 일정 정하기",
      one_liner: "다음 회의를 진행하기 위한 날짜와 장소를 논의하고 있습니다.",
      sort_order: 2,
      is_active: true,
      thumbnail_key: null,
    },
    {
      scenario_id: 3,
      package_id: 1,
      title: "회의 일정 변경 요청하기",
      one_liner: "부득이하게 사정이 생겨 기존 일정에 참여할 수 없게 되었습니다.",
      sort_order: 3,
      is_active: true,
      thumbnail_key: null,
    },
  ];
}
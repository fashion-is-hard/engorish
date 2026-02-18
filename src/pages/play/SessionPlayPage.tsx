// src/pages/play/SessionPlayPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getBasePath } from "@/lib/abVariant";
import { addTurn } from "@/lib/sessionApi";
import { getSession, getTurns } from "@/lib/sessionReadApi";
import { getScenarioById, getGoalsByScenarioId, ScenarioGoalRow } from "@/lib/scenarioApi";

type TurnRow = { role: "user" | "ai" | "system"; text: string };

type EndReason = "manual_exit" | "turn_limit" | "goals_completed";
type BGoalState = { goal_id: number; goal_text: string; achieved: boolean };

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(goalText: string) {
  const t = normalizeText(goalText);
  const tokens = t.split(" ").filter(Boolean);
  // 길이 2 이상만(너무 짧은 토큰 제외)
  return tokens.filter((w) => w.length >= 2);
}

function isGoalAchieved(goalText: string, userText: string) {
  const gKeys = extractKeywords(goalText);
  if (gKeys.length === 0) return false;
  const u = normalizeText(userText);
  return gKeys.some((k) => u.includes(k));
}

export default function SessionPlayPage() {
  const params = useParams();
  const sessionId = params.sessionId;

  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [userTurns, setUserTurns] = useState(0);

  const [variant, setVariant] = useState<"A" | "B">("A");
  const [scenarioId, setScenarioId] = useState<number | null>(null);

  // B 전용
  const [goalRows, setGoalRows] = useState<ScenarioGoalRow[]>([]);
  const [goalState, setGoalState] = useState<Record<number, boolean>>({});

  const mmss = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [seconds]);

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const s = await getSession(sessionId);
        if (!mounted) return;

        setVariant(s.variant);
        setScenarioId(s.scenario_id);

        const t = await getTurns(sessionId);
        if (!mounted) return;

        const mapped: TurnRow[] = (t ?? []).map((x: any) => ({
          role: x.role,
          text: x.corrected_text ?? x.text,
        }));
        setTurns(mapped);

        const userCount = mapped.filter((x) => x.role === "user").length;
        setUserTurns(userCount);

        // B면 goals 로드
        if (s.variant === "B") {
          const g = await getGoalsByScenarioId(s.scenario_id);
          if (!mounted) return;
          setGoalRows(g);

          // 기존 유저턴 기반으로 목표 달성 상태 초기 계산(간단)
          const initial: Record<number, boolean> = {};
          for (const gr of g) initial[gr.goal_id] = false;
          for (const tr of mapped) {
            if (tr.role !== "user") continue;
            for (const gr of g) {
              if (!initial[gr.goal_id] && isGoalAchieved(gr.goal_text, tr.text)) {
                initial[gr.goal_id] = true;
              }
            }
          }
          setGoalState(initial);
        }

        // 첫 진입인데 턴이 없으면 opening_ai_text를 첫 AI 턴으로 넣기
        if (mapped.length === 0) {
          const sc = await getScenarioById(s.scenario_id);
          const openText = sc.opening_ai_text || "Hi! Let’s start.";
          if (!mounted) return;

          setTurns([{ role: "ai", text: openText }]);
          await addTurn({ sessionId, role: "ai", text: openText });
        }
      } catch (e: any) {
        alert(e?.message ?? "세션 로드 실패");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  async function endSessionAndGoEnd(reason: EndReason, payload?: any) {
    if (!sessionId) return;

    await supabase
      .from("roleplay_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        result: {
          ...(payload ?? {}),
          reason,
        },
      })
      .eq("session_id", sessionId);

    nav(`${base}/session/${sessionId}/end`);
  }

  async function onClickEnd() {
    try {
      if (variant === "B") {
        const goalsSnapshot: BGoalState[] = goalRows.map((g) => ({
          goal_id: g.goal_id,
          goal_text: g.goal_text,
          achieved: Boolean(goalState[g.goal_id]),
        }));
        const success = goalsSnapshot.every((x) => x.achieved);

        await endSessionAndGoEnd("manual_exit", {
          success,
          goals: goalsSnapshot,
          feedback: success
            ? { good: "좋은 흐름으로 대화를 마무리했어요.", improve: "조금 더 자연스럽게 연결해보면 좋아요." }
            : { good: "시도 자체가 좋아요.", improve: "목표 문장을 더 직접적으로 말해보세요." },
        });
        return;
      }

      await endSessionAndGoEnd("manual_exit");
    } catch (e: any) {
      alert(e?.message ?? "종료 실패");
    }
  }

  async function handleBGoalUpdate(userText: string) {
    if (variant !== "B" || goalRows.length === 0) return;

    const next: Record<number, boolean> = { ...goalState };
    let changed = false;

    for (const g of goalRows) {
      if (next[g.goal_id]) continue;
      if (isGoalAchieved(g.goal_text, userText)) {
        next[g.goal_id] = true;
        changed = true;
      }
    }

    if (changed) setGoalState(next);

    const allDone = goalRows.length > 0 && goalRows.every((g) => Boolean(next[g.goal_id]));
    if (!allDone) return;

    // 목표 완료 -> 자연스러운 마무리 멘트 + 자동 종료
    const closing = "좋아요! 목표를 모두 달성했어요. 오늘 대화는 여기서 마무리할게요. 👍";
    setTurns((prev) => [...prev, { role: "ai", text: closing }]);
    await addTurn({ sessionId: sessionId!, role: "ai", text: closing });

    const goalsSnapshot: BGoalState[] = goalRows.map((g) => ({
      goal_id: g.goal_id,
      goal_text: g.goal_text,
      achieved: true,
    }));

    await endSessionAndGoEnd("goals_completed", {
      success: true,
      goals: goalsSnapshot,
      feedback: {
        good: "목표를 충실히 달성했고 표현이 자연스러웠어요.",
        improve: "다음엔 연결어(so, because 등)로 흐름을 더 매끄럽게 해보세요.",
      },
    });
  }

  async function sendUserText() {
    if (!sessionId) return;

    const text = input.trim();
    if (!text) return;

    // A: 20턴 제한 (user 턴 기준)
    if (variant === "A" && userTurns >= 20) {
      await endSessionAndGoEnd("turn_limit");
      return;
    }

    setInput("");

    setTurns((prev) => [...prev, { role: "user", text }]);
    const nextUserTurns = userTurns + 1;
    setUserTurns(nextUserTurns);

    try {
      await addTurn({ sessionId, role: "user", text });

      if (variant === "A") {
        if (nextUserTurns >= 20) {
          await endSessionAndGoEnd("turn_limit");
          return;
        }
      }

      if (variant === "B") {
        await handleBGoalUpdate(text);
        // goals_completed로 종료되면 아래 AI응답을 굳이 추가할 필요 없음.
        // (handleBGoalUpdate가 종료까지 진행)
        return;
      }

      // 임시 AI 응답(A 전용, 나중에 실제 AI 호출로 교체)
      const aiText = "좋아요. 계속 말해볼까요?";
      setTurns((prev) => [...prev, { role: "ai", text: aiText }]);
      await addTurn({ sessionId, role: "ai", text: aiText });
    } catch (e: any) {
      alert(e?.message ?? "턴 저장 실패");
    }
  }

  if (!sessionId) return <div style={{ padding: 24 }}>sessionId 없음</div>;

  const bDoneCount =
    variant === "B" ? goalRows.filter((g) => Boolean(goalState[g.goal_id])).length : 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <b>대화 시간</b> {mmss}{" "}
          {variant === "A" ? (
            <span style={{ marginLeft: 10, opacity: 0.7 }}>(A: {userTurns}/20)</span>
          ) : (
            <span style={{ marginLeft: 10, opacity: 0.7 }}>(B 목표: {bDoneCount}/{goalRows.length})</span>
          )}
        </div>
        <button onClick={onClickEnd}>종료</button>
      </div>

      {variant === "B" && goalRows.length > 0 && (
        <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>목표</div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {goalRows.slice(0, 3).map((g) => (
              <li key={g.goal_id} style={{ opacity: Boolean(goalState[g.goal_id]) ? 0.55 : 1 }}>
                {Boolean(goalState[g.goal_id]) ? "✅ " : "⬜️ "}
                {g.goal_text}
              </li>
            ))}
          </ol>
        </div>
      )}

      {loading && <div style={{ marginTop: 12 }}>불러오는 중...</div>}

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {turns.map((t, i) => (
          <div key={i} style={{ opacity: t.role === "ai" ? 0.85 : 1 }}>
            <b>{t.role === "ai" ? "AI" : t.role === "user" ? "ME" : "SYS"}:</b> {t.text}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="(임시) 텍스트 입력"
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendUserText();
          }}
        />
        <button onClick={sendUserText}>보내기</button>
      </div>
    </div>
  );
}

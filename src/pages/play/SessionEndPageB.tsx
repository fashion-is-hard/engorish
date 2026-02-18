// src/pages/play/SessionEndPageB.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getSession } from "@/lib/sessionReadApi";

type ResultPayload = {
  reason?: string;
  success?: boolean;
  goals?: { goal_id: number; goal_text: string; achieved: boolean }[];
  feedback?: { good?: string; improve?: string };
};

export default function SessionEndPageB() {
  const { sessionId } = useParams();
  if (!sessionId) return <div style={{ padding: 24 }}>sessionId 없음</div>;

  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [goals, setGoals] = useState<ResultPayload["goals"]>([]);
  const [feedback, setFeedback] = useState<ResultPayload["feedback"]>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await getSession(sessionId);
        setStartedAt(s.started_at);
        setEndedAt(s.ended_at);

        const r = (s as any).result as ResultPayload | null;
        setSuccess(Boolean(r?.success));
        setGoals(r?.goals ?? []);
        setFeedback(r?.feedback ?? {});
      } catch (e: any) {
        alert(e?.message ?? "세션 결과 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const durationText = useMemo(() => {
    if (!startedAt) return "-";
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const sec = Math.max(0, Math.floor((end - start) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  }, [startedAt, endedAt]);

  return (
    <div style={{ padding: 24 }}>
      <h2>{success ? "성공 🎉" : "종료"}</h2>

      {loading && <div>불러오는 중...</div>}

      {!loading && (
        <>
          <div style={{ marginTop: 10 }}>
            <b>대화 소요시간</b>: {durationText}
          </div>

          <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>목표 달성 여부</div>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {(goals ?? []).slice(0, 3).map((g) => (
                <li key={g.goal_id} style={{ opacity: g.achieved ? 0.6 : 1 }}>
                  {g.achieved ? "✅ " : "⬜️ "}
                  {g.goal_text}
                </li>
              ))}
            </ol>
          </div>

          <div style={{ marginTop: 16, lineHeight: 1.9 }}>
            {success ? (
              <>
                <div><b>칭찬</b>: {feedback?.good ?? "좋은 시도였어요!"}</div>
                <div><b>개선</b>: {feedback?.improve ?? "더 자연스럽게 이어서 말해보면 좋아요."}</div>
                <div style={{ marginTop: 10, opacity: 0.75 }}>
                  다음 시나리오도 도전해보세요!
                </div>
              </>
            ) : (
              <>
                <div><b>개선</b>: {feedback?.improve ?? "목표를 더 직접적으로 말해보세요."}</div>
                <div style={{ marginTop: 10, opacity: 0.75 }}>
                  목표를 달성한 뒤 종료하면 성공으로 처리돼요.
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button onClick={() => nav(`${base}/home`)}>홈으로</button>
            <button onClick={() => nav(-1)}>뒤로</button>
          </div>
        </>
      )}
    </div>
  );
}

// src/pages/play/SessionEndPageA.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getSession } from "@/lib/sessionReadApi";

export default function SessionEndPageA() {
  const { sessionId } = useParams();
  if (!sessionId) return <div style={{ padding: 24 }}>sessionId 없음</div>;

  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await getSession(sessionId);
        setStartedAt(s.started_at);
        setEndedAt(s.ended_at);
        setWordCount(s.word_count ?? 0);
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
      <h2>종료</h2>
      {loading && <div>불러오는 중...</div>}

      {!loading && (
        <>
          <div style={{ marginTop: 12, lineHeight: 1.9 }}>
            <div>
              <b>대화 소요시간</b>: {durationText}
            </div>
            <div>
              <b>말한 단어 수</b>: {wordCount}
            </div>
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

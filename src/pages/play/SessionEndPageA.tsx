// src/pages/play/SessionEndPageA.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getSession } from "@/lib/sessionReadApi";

function mmssFromMs(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
        setStartedAt(s.started_at ?? null);
        setEndedAt(s.ended_at ?? null);
        setWordCount(Number(s.word_count ?? 0));
      } catch (e: any) {
        alert(e?.message ?? "세션 결과 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const durationMmss = useMemo(() => {
    if (!startedAt) return "--:--";
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    return mmssFromMs(end - start);
  }, [startedAt, endedAt]);

  const primary = "#3E4245";
  const secondary = "#AFC3D2";
  const secondaryLight = "#E2EAF1";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        padding: 24,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, position: "relative" }}>
        {/* X 버튼 */}
        <button
          onClick={() => nav(`${base}/home`, { replace: true })}
          aria-label="닫기"
          style={{
            position: "absolute",
            right: 4,
            top: 4,
            width: 44,
            height: 44,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 26,
            lineHeight: "44px",
            color: primary,
            opacity: 0.7,
          }}
        >
          ×
        </button>

        {/* 본문 */}
        <div
          style={{
            minHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 120,
          }}
        >
          {/* 체크 아이콘 */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: primary,
              display: "grid",
              placeItems: "center",
              marginBottom: 22,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 7L9 18l-5-5"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: primary }}>
              대화를 모두 완료했어요!
            </div>
            <div style={{ marginTop: 10, fontSize: 15, color: primary, opacity: 0.6 }}>
              다른 대화도 시도해보세요.
            </div>
          </div>

          <div style={{ height: 30 }} />

          {/* 통계 카드 2개 */}
          {loading ? (
            <div style={{ opacity: 0.7 }}>불러오는 중...</div>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  width: 190,
                  background: secondaryLight,
                  borderRadius: 10,
                  padding: "14px 14px 12px",
                  textAlign: "center",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: secondary, marginBottom: 10 }}>
                  대화 소요 시간
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 120,
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 16 }}>⏱</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: secondary }}>
                    {durationMmss}
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: 190,
                  background: secondaryLight,
                  borderRadius: 10,
                  padding: "14px 14px 12px",
                  textAlign: "center",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: secondary, marginBottom: 10 }}>
                  지금까지 말한 단어 수
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 120,
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 16 }}>✏️</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: secondary }}>
                    {wordCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* 확인 버튼 */}
          <button
            onClick={() => nav(`${base}/home`, { replace: true })}
            style={{
              width: "100%",
              height: 58,
              borderRadius: 10,
              border: "none",
              background: primary,
              color: "#fff",
              fontSize: 18,
              fontWeight: 900,
              cursor: "pointer",
              marginBottom: 18,
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
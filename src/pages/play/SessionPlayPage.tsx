import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getBasePath } from "@/lib/abVariant";
import { addTurn } from "@/lib/sessionApi";

type Turn = { role: "user" | "ai"; text: string };

export default function SessionPlayPage() {
  const { sessionId } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  const [seconds, setSeconds] = useState(0);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const mmss = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [seconds]);

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  async function endSession() {
    if (!sessionId) return;
    await supabase
      .from("roleplay_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("session_id", sessionId);

    // 종료 화면은 다음 단계에서 분기(A/B)로 만들기
    nav(`${base}/home`);
  }

  async function sendUserText() {
    if (!sessionId) return;
    const text = input.trim();
    if (!text) return;

    setInput("");
    setTurns((prev) => [...prev, { role: "user", text }]);

    try {
      await addTurn({ sessionId, role: "user", text });

      // 임시 AI 응답(나중에 실제 AI 호출로 교체)
      const aiText = "좋아요. 계속 말해볼까요?";
      setTurns((prev) => [...prev, { role: "ai", text: aiText }]);
      await addTurn({ sessionId, role: "ai", text: aiText });
    } catch (e: any) {
      alert(e?.message ?? "턴 저장 실패");
    }
  }

  if (!sessionId) return <div style={{ padding: 24 }}>sessionId 없음</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><b>대화 시간</b> {mmss}</div>
        <button onClick={endSession}>종료</button>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {turns.map((t, i) => (
          <div key={i} style={{ opacity: t.role === "ai" ? 0.85 : 1 }}>
            <b>{t.role === "ai" ? "AI" : "ME"}:</b> {t.text}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="(임시) 텍스트 입력"
          style={{ flex: 1 }}
        />
        <button onClick={sendUserText}>보내기</button>
      </div>
    </div>
  );
}

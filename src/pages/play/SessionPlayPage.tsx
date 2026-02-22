// src/pages/play/SessionPlayPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getBasePath } from "@/lib/abVariant";
import styles from "./SessionPlayPage.module.css";

type ChatItem = {
  id: string;
  role: "ai" | "user";
  text: string;
  pending?: boolean;
  showTranslate?: boolean; // UI 토글만
  correctedText?: string | null; // 나중에 교정 결과 붙일 자리
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TURN_LIMIT = 20;

export default function SessionPlayPage() {
  const { sessionId = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname); // ✅ basePath 유지 (A/B 자동)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  // 상단 표시용(일단 더미)
  const [title] = useState("역할 분담하기");

  // 시나리오 요약(일단 더미)
  const [scenarioOneLiner] = useState(
    "프로젝트를 함께할 팀원들과 첫 대화를 나누고 있습니다."
  );

  // 타이머: 화면 진입 후 계속 흐름
  const [startedAtMs] = useState(() => Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  // 턴 카운트
  const [turnCount, setTurnCount] = useState(0);

  // 채팅: 바로 1문장 보여주기(“대화 시작” 버튼 없이)
  const [items, setItems] = useState<ChatItem[]>([
    { id: uid(), role: "ai", text: "Hi! I’m glad to be with you.", showTranslate: false },
  ]);

  const clientTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const clientUtcOffsetMin = useMemo(() => -new Date().getTimezoneOffset(), []);

  // cleanup
  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch { }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 타이머 tick
  useEffect(() => {
    const t = window.setInterval(() => {
      const sec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      setElapsedSec(sec);
    }, 250);
    return () => window.clearInterval(t);
  }, [startedAtMs]);

  async function startRecording() {
    if (busy) return;

    // 마이크 권한 요청
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("마이크 권한이 필요합니다.");
      return;
    }

    streamRef.current = stream;

    // MediaRecorder
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });

      // 유저 메시지 먼저 표시(실시간 느낌)
      const userMsgId = uid();
      setItems((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text: "(음성 입력 처리중...)", pending: true },
      ]);

      setBusy(true);
      try {
        // 1) Storage 업로드
        const filePath = `user/${sessionId}_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("audio")
          .upload(filePath, blob, { contentType: "audio/webm", upsert: true });

        if (uploadError) throw uploadError;

        // AI placeholder
        const aiMsgId = uid();
        setItems((prev) => [
          ...prev,
          { id: aiMsgId, role: "ai", text: "(응답 생성중...)", pending: true, showTranslate: false },
        ]);

        // 2) Edge Function 호출
        const { data, error } = await supabase.functions.invoke("turn", {
          body: {
            sessionId,
            userAudioPath: filePath,
            userAudioMime: "audio/webm",
            clientTz,
            clientUtcOffsetMin,
          },
        });

        if (error) {
          const raw =
            (error as any)?.context?.responseText ??
            JSON.stringify((error as any)?.context ?? {}, null, 2);
          throw new Error(`${error.message}\n${String(raw).slice(0, 800)}`);
        }

        const transcript = String(data?.userTranscript ?? "(음성 입력)");
        const aiText = String(data?.aiText ?? "(AI 응답 없음)");

        // UI 업데이트 확정
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === userMsgId) return { ...it, text: transcript, pending: false };
            if (it.id === aiMsgId) return { ...it, text: aiText, pending: false };
            return it;
          })
        );

        // 턴 증가(유저 발화 1회당 1턴)
        setTurnCount((c) => Math.min(TURN_LIMIT, c + 1));

        // 3) AI 음성 재생
        const aiAudioUrl = (data?.aiAudioUrl as string | null) ?? null;
        if (aiAudioUrl) {
          const audio = new Audio(aiAudioUrl);
          await audio.play().catch(() => { });
        }

        // (선택) turnLimit 도달 시 자동 종료로 이동하고 싶으면:
        // if (turnCount + 1 >= TURN_LIMIT || data?.ended) nav(`${base}/session/${sessionId}/end`);
      } catch (e: any) {
        const msg = String(e?.message ?? e);

        setItems((prev) => {
          const next = prev.map((it) => {
            if (it.id === userMsgId && it.pending) {
              return { ...it, text: "(음성 입력 실패)", pending: false };
            }
            return it;
          });

          return [
            ...next,
            {
              id: uid(),
              role: "ai",
              text:
                "대화 요청에 실패했어요.\n\n" +
                "가능한 원인:\n" +
                "• Edge Function(turn) 배포/이름 확인\n" +
                "• VITE_SUPABASE_URL / ANON_KEY 확인\n" +
                "• Network 탭에서 /functions/v1/turn 요청 확인\n\n" +
                `에러: ${msg}`,
            },
          ];
        });
      } finally {
        setBusy(false);
      }
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (busy) return;
    try {
      mediaRecorderRef.current?.stop();
    } catch { }
    setRecording(false);
  }

  const progressPct = Math.min(100, Math.round((turnCount / TURN_LIMIT) * 100));

  return (
    <div className={styles.root}>
      {/* Top */}
      <div className={styles.top}>
        <div className={styles.topRow}>
          <div className={styles.title}>{title}</div>

          {/* ✅ basePath 구조 유지해서 End로 이동 */}
          <button
            className={styles.endBtn}
            type="button"
            onClick={() => nav(`${base}/session/${sessionId}/end`)}
          >
            종료
          </button>
        </div>

        <div className={styles.time}>{mmss(elapsedSec)}</div>

        <div className={styles.progressRow}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.turnText}>
            {String(turnCount).padStart(2, "0")}/{TURN_LIMIT}
          </div>
        </div>
      </div>

      {/* Scenario box */}
      <div className={styles.scenarioBox}>
        <div className={styles.scenarioLabel}>시나리오</div>
        <div className={styles.scenarioText}>{scenarioOneLiner}</div>
      </div>

      {/* Chat */}
      <div className={styles.chat}>
        {items.map((m) => (
          <div key={m.id} className={m.role === "user" ? styles.rowRight : styles.rowLeft}>
            <div
              className={[
                styles.bubble,
                m.role === "user" ? styles.userBubble : styles.aiBubble,
                m.pending ? styles.pending : "",
              ].join(" ")}
            >
              <div className={styles.msgText}>{m.text}</div>

              {/* A버전 UI: AI 버블 아래 "번역보기" */}
              {m.role === "ai" && (
                <button
                  type="button"
                  className={styles.translateBtn}
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((it) => (it.id === m.id ? { ...it, showTranslate: !it.showTranslate } : it))
                    )
                  }
                >
                  번역보기
                </button>
              )}

              {/* 유저 버블에 "교정받기" 라벨만(기능은 나중에) */}
              {m.role === "user" && <div className={styles.correctHint}>교정받기</div>}

              {/* 번역 영역(더미) */}
              {m.role === "ai" && m.showTranslate && (
                <div className={styles.translationBox}>(번역은 나중에 연결)</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom mic area */}
      <div className={styles.bottom}>
        {recording && <div className={styles.recordingWave} />}

        <div className={styles.bottomGuide}>
          {recording ? "말을 끝낼 때 다시 버튼을 눌러주세요" : "말을 시작할 때 마이크를 눌러주세요"}
        </div>

        <button
          className={[styles.micBtn, recording ? styles.micBtnOn : ""].join(" ")}
          onClick={() => (recording ? stopRecording() : startRecording())}
          disabled={busy}
          aria-label="마이크"
          type="button"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
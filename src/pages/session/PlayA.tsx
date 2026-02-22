import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { supabase } from "@/lib/supabaseClient";
import styles from "./PlayA.module.css";

type Msg = {
    id: string;
    role: "assistant" | "user";
    text: string;
    createdAt: number;

    // 번역 관련
    translatedText?: string | null;
    translating?: boolean;
    showTranslation?: boolean;
};

type DbTurn = {
    turn_no: number;
    role: "ai" | "user";
    text: string | null;
    corrected_text: string | null;
};

function uid(prefix = "m") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function formatMMSS(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PlayA() {
    const { sessionId } = useParams();
    const sid = String(sessionId || "").trim();

    const nav = useNavigate();
    const loc = useLocation();
    const base = getBasePath(loc.pathname);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [title, setTitle] = useState("대화");
    const [scenarioDesc, setScenarioDesc] = useState("시나리오를 불러오는 중...");
    const [messages, setMessages] = useState<Msg[]>([]);

    const [elapsed, setElapsed] = useState(0);
    const [turnCount, setTurnCount] = useState(0);

    const maxTurns = 20;

    const progressLabel = useMemo(
        () => `${String(turnCount).padStart(2, "0")}/${String(maxTurns).padStart(2, "0")}`,
        [turnCount]
    );

    const progressPct = useMemo(
        () => Math.min(100, Math.round((turnCount / maxTurns) * 100)),
        [turnCount]
    );

    // recording state
    const [micState, setMicState] = useState<"idle" | "recording" | "sending">("idle");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // audio playback
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // scroll
    const listRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages, micState, busy]);

    // timer
    useEffect(() => {
        if (loading) return;
        const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => window.clearInterval(t);
    }, [loading]);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            try {
                mediaRecorderRef.current?.stop?.();
            } catch { }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                audioRef.current = null;
            }
        };
    }, []);

    async function playUrl(url: string | null | undefined) {
        if (!url) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            const a = new Audio(url);
            audioRef.current = a;
            await a.play();
        } catch {
            // autoplay 정책 등으로 실패할 수 있음
        }
    }

    // ✅ 번역: 클로저 이슈 제거 버전
    async function onTranslate(msgId: string) {
        // 1) 먼저 상태 업데이트(토글/로딩 표시) + 대상 텍스트를 안전하게 꺼내기
        let targetText = "";
        let alreadyTranslated = false;

        setMessages((prev) => {
            const next = prev.map((m) => {
                if (m.id !== msgId) return m;

                alreadyTranslated = !!m.translatedText;
                targetText = m.text;

                return {
                    ...m,
                    showTranslation: m.translatedText ? !m.showTranslation : true,
                    translating: m.translatedText ? false : true,
                };
            });
            return next;
        });

        // 이미 번역 있으면 토글만 한 거라 여기서 종료
        if (alreadyTranslated) return;

        // 2) 호출
        try {
            const { data, error } = await supabase.functions.invoke("translate", {
                body: { text: targetText, targetLang: "ko" },
            });
            if (error) throw error;

            const translated = String((data as any)?.translated ?? "").trim();

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === msgId
                        ? {
                            ...m,
                            translatedText: translated || "(번역 실패)",
                            translating: false,
                            showTranslation: true,
                        }
                        : m
                )
            );
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === msgId
                        ? { ...m, translatedText: "(번역 실패)", translating: false, showTranslation: true }
                        : m
                )
            );
        }
    }

    async function loadSessionAndStart() {
        if (!sid) {
            alert("세션이 없습니다.");
            return;
        }

        setLoading(true);
        try {
            // 1) 세션 + 시나리오 정보 로드
            const { data: sess, error: sessErr } = await supabase
                .from("roleplay_sessions")
                .select("session_id, scenario_id")
                .eq("session_id", sid)
                .maybeSingle();

            if (sessErr) throw sessErr;

            if (sess?.scenario_id != null) {
                const { data: sc, error: scErr } = await supabase
                    .from("scenarios")
                    .select("title, one_liner")
                    .eq("scenario_id", sess.scenario_id)
                    .maybeSingle();
                if (scErr) throw scErr;

                setTitle(sc?.title ?? "대화");
                setScenarioDesc(sc?.one_liner ?? "시나리오 설명이 없습니다.");
            } else {
                setTitle("대화");
                setScenarioDesc("시나리오 설명이 없습니다.");
            }

            // 2) 이미 턴이 있으면 복원 / 없으면 startOnly로 시작
            const { data: existingTurnsRaw, error: turnErr } = await supabase
                .from("roleplay_turns")
                .select("turn_no, role, text, corrected_text")
                .eq("session_id", sid)
                .order("turn_no", { ascending: true });

            if (turnErr) throw turnErr;

            const existingTurns = (existingTurnsRaw ?? []) as DbTurn[];

            if (existingTurns.length > 0) {
                const restored: Msg[] = existingTurns.map((t) => ({
                    id: `t_${t.turn_no}`,
                    role: t.role === "ai" ? "assistant" : "user",
                    text: String(t.corrected_text ?? t.text ?? ""),
                    createdAt: Date.now(),
                }));
                setMessages(restored);

                const lastNo = Number(existingTurns[existingTurns.length - 1]?.turn_no ?? 0);
                setTurnCount(lastNo);
                return;
            }

            // 첫 시작 → startOnly
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const utcOffsetMin = -new Date().getTimezoneOffset();

            const { data, error } = await supabase.functions.invoke("turn", {
                body: {
                    sessionId: sid,
                    startOnly: true,
                    clientTz: tz,
                    clientUtcOffsetMin: utcOffsetMin,
                    ttsVoice: "alloy",
                    turnLimit: maxTurns,
                },
            });
            if (error) throw error;

            const aiText = String((data as any)?.aiText ?? "").trim() || "Hi! I'm glad to be with you.";
            const aiAudioUrl = (data as any)?.aiAudioUrl as string | null;

            setMessages([{ id: uid("a"), role: "assistant", text: aiText, createdAt: Date.now() }]);
            setTurnCount(Number((data as any)?.turnCount ?? 0));

            await playUrl(aiAudioUrl);
        } catch (e: any) {
            alert(e?.message ?? "세션 시작 실패");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadSessionAndStart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sid]);

    async function ensureStream() {
        if (streamRef.current) return streamRef.current;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        return stream;
    }

    function pickMimeType() {
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
        for (const c of candidates) {
            if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
        }
        return ""; // let browser decide
    }

    async function startRecording() {
        if (busy || micState !== "idle") return;

        try {
            const stream = await ensureStream();
            chunksRef.current = [];

            const mimeType = pickMimeType();
            const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = mr;

            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            mr.start();
            setMicState("recording");
        } catch (e: any) {
            alert(e?.message ?? "마이크 권한이 필요해요.");
        }
    }

    async function stopRecordingAndSend() {
        if (busy || micState !== "recording") return;

        setMicState("sending");
        setBusy(true);

        const mr = mediaRecorderRef.current;
        if (!mr) {
            setMicState("idle");
            setBusy(false);
            return;
        }

        const mime = mr.mimeType || "audio/webm";

        const blob = await new Promise<Blob>((resolve) => {
            mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mime || "audio/webm" }));
            mr.stop();
        });

        try {
            // 1) storage 업로드
            const ext = mime.includes("mp4") ? "mp4" : "webm";
            const path = `user/${sid}_${Date.now()}.${ext}`;

            const { error: upErr } = await supabase.storage.from("audio").upload(path, blob, {
                contentType: mime || "audio/webm",
                upsert: true,
            });
            if (upErr) throw upErr;

            // 2) Edge turn 호출
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const utcOffsetMin = -new Date().getTimezoneOffset();

            const { data, error } = await supabase.functions.invoke("turn", {
                body: {
                    sessionId: sid,
                    userAudioPath: path,
                    userAudioMime: mime || "audio/webm",
                    clientTz: tz,
                    clientUtcOffsetMin: utcOffsetMin,
                    ttsVoice: "alloy",
                    turnLimit: maxTurns,
                },
            });
            if (error) throw error;

            const userTranscript = String((data as any)?.userTranscript ?? "").trim();
            const aiText = String((data as any)?.aiText ?? "").trim();
            const aiAudioUrl = (data as any)?.aiAudioUrl as string | null;
            const newTurnCount = Number((data as any)?.turnCount ?? turnCount);
            const ended = Boolean((data as any)?.ended);

            if (userTranscript) {
                setMessages((prev) => [...prev, { id: uid("u"), role: "user", text: userTranscript, createdAt: Date.now() }]);
            }

            if (aiText) {
                setMessages((prev) => [...prev, { id: uid("a"), role: "assistant", text: aiText, createdAt: Date.now() }]);
                await playUrl(aiAudioUrl);
            }

            setTurnCount(newTurnCount);

            if (ended) {
                nav(`${base}/session/${sid}/end`, { replace: true });
                return;
            }
        } catch (e: any) {
            alert(e?.message ?? "전송 실패");
        } finally {
            setBusy(false);
            setMicState("idle");
        }
    }

    async function onMicPress() {
        if (micState === "idle") return startRecording();
        if (micState === "recording") return stopRecordingAndSend();
    }

    return (
        <div className={styles.root}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => nav(-1)} aria-label="뒤로가기">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 18L9 12L15 6"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <div className={styles.headerCenter}>
                    <div className={styles.headerTitle}>{title}</div>
                    <div className={styles.headerTime}>{formatMMSS(elapsed)}</div>
                </div>

                <button className={styles.endBtn} type="button" onClick={() => nav(`${base}/session/${sid}/end`)}>
                    종료
                </button>

                <div className={styles.progressWrap}>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className={styles.progressText}>{progressLabel}</div>
                </div>
            </div>

            {/* Body */}
            <div className={styles.page}>
                {loading && <div className={styles.loading}>불러오는 중...</div>}

                {!loading && (
                    <>
                        <div className={styles.scenarioCard}>
                            <div className={styles.scenarioLabel}>시나리오</div>
                            <div className={styles.scenarioDesc}>{scenarioDesc}</div>
                        </div>

                        <div className={styles.chat} ref={listRef}>
                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={[styles.bubbleRow, m.role === "assistant" ? styles.left : styles.right].join(" ")}
                                >
                                    <div className={[styles.bubble, m.role === "assistant" ? styles.bubbleAi : styles.bubbleMe].join(" ")}>
                                        <div className={styles.bubbleText}>{m.text}</div>

                                        {m.role === "assistant" && (
                                            <button
                                                className={styles.translateBtn}
                                                type="button"
                                                onClick={() => onTranslate(m.id)}
                                                disabled={!!m.translating}
                                            >
                                                {m.translating ? "번역중..." : "번역보기"}
                                            </button>
                                        )}

                                        {m.role === "assistant" && m.showTranslation && (
                                            <div className={styles.translationText}>{m.translatedText ?? ""}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Bottom mic area */}
            <div className={styles.bottom}>
                <div className={styles.micHint}>
                    {micState === "recording"
                        ? "말이 끝나면 다시 버튼을 눌러주세요"
                        : micState === "sending"
                            ? "전송 중..."
                            : "말을 시작할 때 마이크를 눌러주세요"}
                </div>

                <button
                    className={[
                        styles.micBtn,
                        micState === "recording" ? styles.micBtnRecording : "",
                        micState === "sending" ? styles.micBtnBusy : "",
                    ].join(" ")}
                    type="button"
                    onClick={onMicPress}
                    disabled={loading || busy || micState === "sending"}
                    aria-label="마이크"
                >
                    {micState === "recording" ? (
                        <div className={styles.micBars} aria-hidden>
                            <span />
                            <span />
                            <span />
                        </div>
                    ) : (
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                </button>

                <div className={styles.homeIndicator} />
            </div>
        </div>
    );
}
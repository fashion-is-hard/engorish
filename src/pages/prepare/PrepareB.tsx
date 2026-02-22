import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { createSession, SessionSettings } from "@/lib/sessionApi";
import {
    getScenarioById,
    getGoalsByScenarioId,
    ScenarioDetail,
    ScenarioGoalRow,
} from "@/lib/scenarioApi";
import styles from "./prepareB.module.css";

type NavState =
    | {
        categoryTitle?: string; // "학교"
        packageTitle?: string; // "팀프로젝트"
    }
    | null;

const SPEEDS: SessionSettings["speech_rate"][] = [0.8, 1.0, 1.2, 1.5];

export default function PrepareB() {
    const { scenarioId } = useParams();
    const sid = Number(scenarioId);

    const nav = useNavigate();
    const loc = useLocation();
    const base = getBasePath(loc.pathname);
    const navState = (loc.state ?? null) as NavState;

    const [loading, setLoading] = useState(true);
    const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
    const [goals, setGoals] = useState<ScenarioGoalRow[]>([]);
    const [starting, setStarting] = useState(false);

    // ✅ B: 기본값 Intermediate 느낌으로 (원하면 basic로 바꿔도 됨)
    const [settings, setSettings] = useState<SessionSettings>({
        correction_mode: true, // 문장교정
        difficulty: "hard", // Intermediate
        speech_rate: 1.0,
    });

    useEffect(() => {
        if (!Number.isFinite(sid)) return;

        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const s = await getScenarioById(sid);
                if (!mounted) return;
                setScenario(s);

                const g = await getGoalsByScenarioId(sid);
                if (!mounted) return;
                setGoals(g ?? []);
            } catch (e: any) {
                alert(e?.message ?? "시나리오 로드 실패");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [sid]);

    const topChip = navState?.categoryTitle?.trim();
    const subTitle = navState?.packageTitle?.trim();

    const thumbSrc = useMemo(() => {
        const key = scenario?.thumbnail_key?.trim();
        if (!key) return null;
        return `/thumbnails/${key}.png`;
    }, [scenario?.thumbnail_key]);

    async function onStart() {
        if (!scenario || starting) return;

        setStarting(true);
        try {
            const sessionId = await createSession({
                variant: "B",
                scenarioId: sid,
                settings,
            });
            nav(`${base}/session/${sessionId}/play`);
        } catch (e: any) {
            alert(e?.message ?? "세션 생성 실패");
        } finally {
            setStarting(false);
        }
    }

    if (!Number.isFinite(sid)) {
        return <div style={{ padding: 24 }}>잘못된 scenarioId</div>;
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
            </div>

            <div className={styles.page}>
                {loading && <div className={`t-body-14-r ${styles.loading}`}>불러오는 중...</div>}

                {!loading && scenario && (
                    <>
                        {/* Hero */}
                        <div className={styles.hero}>
                            <div className={styles.heroThumb}>
                                {thumbSrc ? (
                                    <img
                                        className={styles.heroImg}
                                        src={thumbSrc}
                                        alt={`${scenario.title} 썸네일`}
                                        onError={(e) => {
                                            // 이미지 누락 시 회색박스로 유지
                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                ) : null}
                            </div>

                            {topChip && <div className={`t-cap-12-m ${styles.heroChip}`}>{topChip}</div>}

                            <div className={`t-title-24-b ${styles.heroTitle}`}>{scenario.title}</div>

                            {subTitle && <div className={`t-body-14-r ${styles.heroSub}`}>{subTitle}</div>}
                        </div>

                        {/* 시나리오 */}
                        <Section label="시나리오">
                            <div className={styles.card}>
                                <div className="t-body-16-r">
                                    {scenario.one_liner ?? "이 시나리오 설명이 아직 없습니다."}
                                </div>
                            </div>
                        </Section>

                        {/* 목표 */}
                        <Section label="목표">
                            <div className={styles.card}>
                                {goals.slice(0, 3).length === 0 ? (
                                    <div className="t-body-14-r" style={{ color: "var(--color-primary-light)" }}>
                                        (이 시나리오에 목표가 아직 없어요)
                                    </div>
                                ) : (
                                    <div className={styles.goalList}>
                                        {goals.slice(0, 3).map((g) => (
                                            <div key={g.goal_id} className={styles.goalRow}>
                                                <span className={styles.goalCheck} aria-hidden>
                                                    ✓
                                                </span>
                                                <span className="t-body-16-r">{g.goal_text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* 대화설정 (페이지 내 카드로 노출) */}
                        <Section label="대화설정">
                            <div className={`${styles.card} ${styles.settingsCard}`}>
                                {/* 교정 모드 */}
                                <div className={styles.setRow}>
                                    <div className={`t-body-16-r ${styles.setLabel}`}>교정 모드</div>
                                    <div className={styles.setRight}>
                                        <button
                                            type="button"
                                            className={[
                                                styles.pill,
                                                !settings.correction_mode ? styles.pillActiveSoft : styles.pillInactive,
                                            ].join(" ")}
                                            onClick={() => setSettings((s) => ({ ...s, correction_mode: false }))}
                                        >
                                            새로운 제안
                                        </button>
                                        <button
                                            type="button"
                                            className={[
                                                styles.pill,
                                                settings.correction_mode ? styles.pillActive : styles.pillInactive,
                                            ].join(" ")}
                                            onClick={() => setSettings((s) => ({ ...s, correction_mode: true }))}
                                        >
                                            문장교정
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                {/* 난이도 */}
                                <div className={styles.setRow}>
                                    <div className={`t-body-16-r ${styles.setLabel}`}>난이도 선택</div>
                                    <div className={styles.setRight}>
                                        <button
                                            type="button"
                                            className={[
                                                styles.pill,
                                                settings.difficulty === "basic" ? styles.pillActiveSoft : styles.pillInactive,
                                            ].join(" ")}
                                            onClick={() => setSettings((s) => ({ ...s, difficulty: "basic" }))}
                                        >
                                            Basic
                                        </button>
                                        <button
                                            type="button"
                                            className={[
                                                styles.pill,
                                                settings.difficulty === "hard" ? styles.pillActive : styles.pillInactive,
                                            ].join(" ")}
                                            onClick={() => setSettings((s) => ({ ...s, difficulty: "hard" }))}
                                        >
                                            Intermediate
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                {/* 질문 재생 속도 */}
                                <div className={styles.speedBlock}>
                                    <div className={styles.speedTop}>
                                        <div className={`t-body-16-r ${styles.setLabel}`}>질문 재생 속도</div>
                                        <div className={`t-body-14-r ${styles.speedValue}`}>
                                            {settings.speech_rate.toFixed(1)}
                                        </div>
                                    </div>

                                    <div className={styles.speedTicks}>
                                        {SPEEDS.map((v) => (
                                            <div
                                                key={v}
                                                className={[
                                                    "t-body-14-r",
                                                    styles.tick,
                                                    settings.speech_rate === v ? styles.tickActive : "",
                                                ].join(" ")}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSettings((s) => ({ ...s, speech_rate: v }))}
                                            >
                                                {v.toFixed(1)}
                                            </div>
                                        ))}
                                    </div>

                                    <input
                                        className={styles.range}
                                        type="range"
                                        min={0}
                                        max={SPEEDS.length - 1}
                                        step={1}
                                        value={SPEEDS.indexOf(settings.speech_rate)}
                                        onChange={(e) => {
                                            const idx = Number(e.target.value);
                                            const v = SPEEDS[idx] ?? 1.0;
                                            setSettings((s) => ({ ...s, speech_rate: v }));
                                        }}
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* 안내 박스 */}
                        <div className={styles.infoBox}>
                            <div className={`t-body-16-m ${styles.infoTitle}`}>마이크 사용권한</div>
                            <ul className={`t-body-14-r ${styles.bullets}`}>
                                <li>AI와 대화를 나누기 위해서는 마이크 사용 권한이 필요해요.</li>
                                <li>말이 끝나면 반드시 마이크 버튼을 다시 눌러주세요.</li>
                            </ul>

                            <div style={{ height: 12 }} />

                            <div className={`t-body-16-m ${styles.infoTitle}`}>대화 종료</div>
                            <ul className={`t-body-14-r ${styles.bullets}`}>
                                <li>대화는 최대 20턴이에요. 20턴을 채우면 대화가 자동으로 종료돼요.</li>
                                <li>그 전에 대화를 종료하고 싶으면 종료 버튼을 눌러주세요.</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom CTA */}
            <div className={styles.bottomBar}>
                <div className={styles.bottomInner}>
                    <button
                        className={[
                            "t-btn-14",
                            styles.ctaBtn,
                            !scenario || loading || starting ? styles.ctaBtnDisabled : "",
                        ].join(" ")}
                        disabled={!scenario || loading || starting}
                        onClick={onStart}
                    >
                        {starting ? "세션 준비 중..." : "대화 시작하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={styles.section}>
            <div className={`t-cap-12-m ${styles.sectionLabel}`}>{label}</div>
            {children}
        </div>
    );
}
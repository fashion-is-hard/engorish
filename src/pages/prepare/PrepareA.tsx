import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath, getVariantFromPath } from "@/lib/abVariant";
import { createSession, SessionSettings } from "@/lib/sessionApi";
import { getScenarioById, ScenarioDetail } from "@/lib/scenarioApi";
import styles from "./prepareA.module.css";

type NavState = {
    categoryTitle?: string; // "학교"
    packageTitle?: string;  // "팀프로젝트"
} | null;

const SPEEDS: SessionSettings["speech_rate"][] = [0.8, 1.0, 1.2, 1.5];

function thumbSrc(key?: string | null) {
    if (!key) return "";
    // public/thumbnails/{thumbnail_key}.png
    return `/thumbnails/${key}.png`;
}

export default function PrepareA() {
    const { scenarioId } = useParams();
    const sid = Number(scenarioId);

    const loc = useLocation();
    const nav = useNavigate();
    const base = getBasePath(loc.pathname);
    const variant = getVariantFromPath(loc.pathname); // A/B
    const navState = (loc.state ?? null) as NavState;

    const [loading, setLoading] = useState(true);
    const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
    const [starting, setStarting] = useState(false);

    // ✅ A 화면 기준 설정값
    const [settings, setSettings] = useState<SessionSettings>({
        correction_mode: true,   // 문장교정(true) / 새로운제안(false)
        difficulty: "basic",
        speech_rate: 1.0,
    });

    // ✅ 모달 오픈
    const [openSettings, setOpenSettings] = useState(false);

    // body scroll lock
    useEffect(() => {
        if (!openSettings) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [openSettings]);

    // 데이터 로드
    useEffect(() => {
        if (!Number.isFinite(sid)) return;

        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const s = await getScenarioById(sid);
                if (!mounted) return;
                setScenario(s);
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

    const examplePhrases: { en: string; ko?: string }[] = useMemo(() => {
        // scenario.example_phrases가 배열이면 문자열로 처리
        // (KO가 없으면 EN만 보여줌)
        const v: any = (scenario as any)?.example_phrases;
        if (!v) return [];

        if (Array.isArray(v)) {
            return v.map((x) => ({ en: String(x) }));
        }
        if (Array.isArray(v?.phrases)) {
            return v.phrases.map((x: any) => ({ en: String(x) }));
        }
        // 만약 [{en,ko}] 형태로 들어오면 그대로
        if (Array.isArray(v?.items)) {
            return v.items.map((x: any) => ({ en: String(x.en ?? ""), ko: x.ko ? String(x.ko) : undefined }));
        }
        return [];
    }, [scenario]);

    const correctionLabel = settings.correction_mode ? "문장 교정" : "새로운 제안";
    const difficultyLabel = settings.difficulty === "basic" ? "Basic" : "Intermediate";
    const speedLabel = settings.speech_rate.toFixed(1);

    async function onStart() {
        if (!scenario || starting) return;

        setStarting(true);
        try {
            const sessionId = await createSession({
                variant, // 라우트 기준 A/B 그대로 전달
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

    if (!Number.isFinite(sid)) return <div style={{ padding: 24 }}>잘못된 scenarioId</div>;

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
                            <div className={styles.heroThumbWrap}>
                                {scenario.thumbnail_key ? (
                                    <img
                                        className={styles.heroThumbImg}
                                        src={thumbSrc(scenario.thumbnail_key)}
                                        alt=""
                                        loading="eager"
                                    />
                                ) : (
                                    <div className={styles.heroThumbFallback} />
                                )}
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

                        {/* 대화설정 (누르면 모달) */}
                        <Section label="대화설정">
                            <button
                                type="button"
                                className={`${styles.card} ${styles.settingsCardBtn}`}
                                onClick={() => setOpenSettings(true)}
                            >
                                <div className={styles.setRow}>
                                    <div className="t-body-16-r">교정모드</div>
                                    <div className={styles.setRight}>
                                        <span className="t-body-14-r">{correctionLabel}</span>
                                        <span className={styles.chev}>›</span>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                <div className={styles.setRow}>
                                    <div className="t-body-16-r">난이도 선택</div>
                                    <div className={styles.setRight}>
                                        <span className="t-body-14-r">{difficultyLabel}</span>
                                        <span className={styles.chev}>›</span>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                <div className={styles.setRow}>
                                    <div className="t-body-16-r">질문 재생 속도</div>
                                    <div className={styles.setRight}>
                                        <span className="t-body-14-r">{speedLabel}</span>
                                        <span className={styles.chev}>›</span>
                                    </div>
                                </div>
                            </button>
                        </Section>

                        {/* 유용한 표현 */}
                        <Section label="유용한 표현">
                            <div className={styles.card}>
                                {examplePhrases.slice(0, 3).length === 0 ? (
                                    <div className="t-body-14-r" style={{ color: "var(--color-primary-light)" }}>
                                        예시 표현이 아직 없습니다.
                                    </div>
                                ) : (
                                    examplePhrases.slice(0, 3).map((p, i) => (
                                        <div key={i}>
                                            <div className={styles.phraseItem}>
                                                <div className={`t-body-16-r ${styles.phraseEn}`}>{p.en}</div>
                                                {p.ko && <div className={`t-body-14-r ${styles.phraseKo}`}>{p.ko}</div>}
                                            </div>
                                            {i < 2 && <div className={styles.phraseDivider} />}
                                        </div>
                                    ))
                                )}
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

            {/* ✅ Settings Bottom Sheet Modal */}
            {openSettings && (
                <div
                    className={styles.modalOverlay}
                    role="presentation"
                    onMouseDown={(e) => {
                        // overlay 클릭 닫기 (시트 내부 클릭은 무시)
                        if (e.target === e.currentTarget) setOpenSettings(false);
                    }}
                >
                    <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="대화 설정">
                        <div className={styles.sheetHandle} />
                        <div className={styles.sheetHeader}>
                            <div className="t-title-20-b">대화 설정</div>
                            <button
                                type="button"
                                className={styles.sheetClose}
                                onClick={() => setOpenSettings(false)}
                                aria-label="닫기"
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.sheetBody}>
                            {/* 교정 모드 */}
                            <div className={styles.block}>
                                <div className={`t-sub-18-sb ${styles.blockTitle}`}>교정 모드</div>
                                <div className={styles.btnRow}>
                                    <button
                                        type="button"
                                        className={[
                                            styles.pillBtn,
                                            !settings.correction_mode ? styles.pillBtnActive : "",
                                        ].join(" ")}
                                        onClick={() => setSettings((s) => ({ ...s, correction_mode: false }))}
                                    >
                                        새로운 제안
                                    </button>
                                    <button
                                        type="button"
                                        className={[
                                            styles.pillBtn,
                                            settings.correction_mode ? styles.pillBtnActive : "",
                                        ].join(" ")}
                                        onClick={() => setSettings((s) => ({ ...s, correction_mode: true }))}
                                    >
                                        문장 교정
                                    </button>
                                </div>
                            </div>

                            {/* 난이도 */}
                            <div className={styles.block}>
                                <div className={`t-sub-18-sb ${styles.blockTitle}`}>난이도 선택</div>
                                <div className={styles.btnRow}>
                                    <button
                                        type="button"
                                        className={[
                                            styles.pillBtn,
                                            settings.difficulty === "basic" ? styles.pillBtnActive : "",
                                        ].join(" ")}
                                        onClick={() => setSettings((s) => ({ ...s, difficulty: "basic" }))}
                                    >
                                        Basic
                                    </button>
                                    <button
                                        type="button"
                                        className={[
                                            styles.pillBtn,
                                            settings.difficulty === "hard" ? styles.pillBtnActive : "",
                                        ].join(" ")}
                                        onClick={() => setSettings((s) => ({ ...s, difficulty: "hard" }))}
                                    >
                                        Intermediate
                                    </button>
                                </div>
                            </div>

                            {/* 속도 */}
                            <div className={styles.block}>
                                <div className={`t-sub-18-sb ${styles.blockTitle}`}>질문 재생 속도</div>
                                <div className={styles.speedRow}>
                                    {SPEEDS.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            className={[
                                                styles.speedBtn,
                                                settings.speech_rate === v ? styles.speedBtnActive : "",
                                            ].join(" ")}
                                            onClick={() => setSettings((s) => ({ ...s, speech_rate: v }))}
                                        >
                                            {v.toFixed(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.sheetFooter}>
                            <button
                                type="button"
                                className={["t-btn-14", styles.sheetCta].join(" ")}
                                onClick={() => setOpenSettings(false)}
                            >
                                적용하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
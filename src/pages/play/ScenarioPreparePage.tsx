import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath, getVariantFromPath } from "@/lib/abVariant";
import { createSession, SessionSettings } from "@/lib/sessionApi";
import {
  getScenarioById,
  getGoalsByScenarioId,
  ScenarioDetail,
  ScenarioGoalRow,
} from "@/lib/scenarioApi";
import styles from "./ScenarioPreparePage.module.css";

type NavState = {
  categoryTitle?: string; // "학교"
  packageTitle?: string;  // "팀프로젝트"
} | null;

const SPEEDS: SessionSettings["speech_rate"][] = [0.8, 1.0, 1.2, 1.5];

export default function ScenarioPreparePage() {
  const { scenarioId } = useParams();
  const sid = Number(scenarioId);

  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);
  const variant = getVariantFromPath(loc.pathname); // "A" | "B"
  const navState = (loc.state ?? null) as NavState;

  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [goalRows, setGoalRows] = useState<ScenarioGoalRow[]>([]);
  const [starting, setStarting] = useState(false);

  const [settings, setSettings] = useState<SessionSettings>({
    correction_mode: false,
    difficulty: "basic",
    speech_rate: 1.0,
  });

  const examplePhrases: string[] = useMemo(() => {
    const v = scenario?.example_phrases;
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (Array.isArray((v as any)?.phrases)) return (v as any).phrases.map(String);
    return [];
  }, [scenario]);

  // ✅ public 썸네일 경로
  const heroThumbSrc = useMemo(() => {
    const key = (scenario?.thumbnail_key ?? "").trim();
    if (!key) return null;
    return `/thumbnails/${key}.png`;
  }, [scenario?.thumbnail_key]);

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
        setGoalRows(g);
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

  if (!Number.isFinite(sid)) return <div style={{ padding: 24 }}>잘못된 scenarioId</div>;

  async function onStart() {
    if (!scenario || starting) return;

    setStarting(true);
    try {
      const sessionId = await createSession({
        variant,
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

  const topChip = navState?.categoryTitle?.trim();
  const subTitle = navState?.packageTitle?.trim();

  return (
    <div className={styles.root}>
      {/* Header (back only) */}
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
              {/* ✅ 썸네일 출력: 없으면 회색 박스 유지 */}
              <div className={styles.heroThumb}>
                {heroThumbSrc && (
                  <img
                    className={styles.heroThumbImg}
                    src={heroThumbSrc}
                    alt={`${scenario.title} thumbnail`}
                    loading="lazy"
                    onError={(e) => {
                      // 파일 없으면 이미지 숨김 (배경색 박스는 그대로)
                      e.currentTarget.style.display = "none";
                    }}
                  />
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

            {/* ✅ 분기: A=유용한표현 / B=대화목적(목표) */}
            {variant === "B" ? (
              <Section label="목표">
                <div className={styles.card}>
                  {goalRows.slice(0, 3).length === 0 ? (
                    <div className="t-body-14-r" style={{ color: "var(--color-primary-light)" }}>
                      (이 시나리오에 goal이 아직 없어요)
                    </div>
                  ) : (
                    <div className={styles.goalList}>
                      {goalRows.slice(0, 3).map((g) => (
                        <div key={g.goal_id} className={styles.goalRow}>
                          <span className={styles.goalCheck}>✓</span>
                          <span className="t-body-16-r">{g.goal_text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            ) : (
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
                          <div className={`t-body-16-r ${styles.phraseEn}`}>{p}</div>
                        </div>
                        {i < 2 && <div className={styles.phraseDivider} />}
                      </div>
                    ))
                  )}
                </div>
              </Section>
            )}

            {/* ✅ 대화설정 */}
            <Section label="대화설정">
              <div className={`${styles.card} ${styles.aSettingsCard}`}>
                <div className={styles.aSetRow}>
                  <div className="t-body-16-r">교정 모드</div>

                  <div className={styles.toggleWrap}>
                    <span
                      className={`t-body-14-r ${styles.toggleLabel} ${settings.correction_mode ? styles.toggleLabelOn : ""
                        }`}
                    >
                      ON
                    </span>

                    <button
                      type="button"
                      className={[styles.toggle, settings.correction_mode ? styles.toggleOn : ""].join(" ")}
                      onClick={() => setSettings((s) => ({ ...s, correction_mode: !s.correction_mode }))}
                      aria-label="교정 모드 토글"
                      aria-pressed={settings.correction_mode}
                    >
                      <span className={styles.knob} />
                    </button>

                    <span
                      className={`t-body-14-r ${styles.toggleLabel} ${!settings.correction_mode ? styles.toggleLabelOff : ""
                        }`}
                    >
                      OFF
                    </span>
                  </div>
                </div>

                <div className={styles.aDivider} />

                <div className={styles.aSetRow}>
                  <div className="t-body-16-r">난이도 선택</div>
                  <div className={styles.levelGroup}>
                    <button
                      type="button"
                      className={[
                        styles.levelBtn,
                        settings.difficulty === "basic" ? styles.levelBtnActive : "",
                      ].join(" ")}
                      onClick={() => setSettings((s) => ({ ...s, difficulty: "basic" }))}
                    >
                      Basic
                    </button>
                    <button
                      type="button"
                      className={[
                        styles.levelBtn,
                        settings.difficulty === "hard" ? styles.levelBtnActive : "",
                      ].join(" ")}
                      onClick={() => setSettings((s) => ({ ...s, difficulty: "hard" }))}
                    >
                      Intermediate
                    </button>
                  </div>
                </div>

                <div className={styles.aDivider} />

                <div className={styles.aSliderBlock}>
                  <div className={styles.aSliderTop}>
                    <div className="t-body-16-r">질문 재생 속도</div>
                  </div>

                  <div className={styles.aTicks}>
                    {SPEEDS.map((v) => (
                      <div
                        key={v}
                        className={[
                          "t-body-14-r",
                          styles.aTickLabel,
                          settings.speech_rate === v ? styles.aTickLabelActive : "",
                        ].join(" ")}
                        onClick={() => setSettings((s) => ({ ...s, speech_rate: v }))}
                        role="button"
                        tabIndex={0}
                      >
                        {v.toFixed(1)}
                      </div>
                    ))}
                  </div>

                  <input
                    className={styles.aRange}
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
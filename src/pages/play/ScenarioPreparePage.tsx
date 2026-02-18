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

export default function ScenarioPreparePage() {
  const { scenarioId } = useParams();
  const sid = Number(scenarioId);

  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);
  const variant = getVariantFromPath(loc.pathname); // "A" | "B"

  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [goalRows, setGoalRows] = useState<ScenarioGoalRow[]>([]);

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

  useEffect(() => {
    if (!Number.isFinite(sid)) return;

    (async () => {
      setLoading(true);
      try {
        const s = await getScenarioById(sid);
        setScenario(s);

        const g = await getGoalsByScenarioId(sid);
        setGoalRows(g);
      } catch (e: any) {
        alert(e?.message ?? "시나리오 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [sid]);

  if (!Number.isFinite(sid)) return <div style={{ padding: 24 }}>잘못된 scenarioId</div>;

  async function onStart() {
    try {
      const sessionId = await createSession({
        variant,
        scenarioId: sid,
        settings,
      });
      nav(`${base}/session/${sessionId}/play`);
    } catch (e: any) {
      alert(e?.message ?? "세션 생성 실패");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => nav(-1)} style={{ marginBottom: 12 }}>
        ← 뒤로
      </button>

      {loading && <div>불러오는 중...</div>}

      {!loading && scenario && (
        <>
          <h2>{scenario.title}</h2>
          {scenario.one_liner && <p style={{ opacity: 0.85 }}>{scenario.one_liner}</p>}

          {variant === "A" ? (
            <>
              <h3>예시 표현</h3>
              <ul>
                {examplePhrases.slice(0, 3).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3>목표</h3>
              <ol>
                {goalRows.slice(0, 3).map((g) => (
                  <li key={g.goal_id}>{g.goal_text}</li>
                ))}
              </ol>
              {goalRows.length === 0 && (
                <div style={{ opacity: 0.7 }}>(이 시나리오에 goal이 아직 없어요)</div>
              )}
            </>
          )}

          <h3 style={{ marginTop: 16 }}>대화 설정</h3>

          <label style={{ display: "block", marginTop: 8 }}>
            <input
              type="checkbox"
              checked={settings.correction_mode}
              onChange={(e) =>
                setSettings((s) => ({ ...s, correction_mode: e.target.checked }))
              }
            />{" "}
            교정모드
          </label>

          <div style={{ marginTop: 8 }}>
            난이도:{" "}
            <select
              value={settings.difficulty}
              onChange={(e) =>
                setSettings((s) => ({ ...s, difficulty: e.target.value as any }))
              }
            >
              <option value="basic">Basic</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div style={{ marginTop: 8 }}>
            발화 속도:{" "}
            <select
              value={settings.speech_rate}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  speech_rate: Number(e.target.value) as any,
                }))
              }
            >
              <option value={0.8}>0.8</option>
              <option value={1.0}>1.0</option>
              <option value={1.2}>1.2</option>
              <option value={1.5}>1.5</option>
            </select>
          </div>

          <button onClick={onStart} style={{ marginTop: 16 }}>
            대화 시작하기
          </button>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getScenariosByPackage, ScenarioRow } from "@/lib/contentApi";

export default function ScenarioListPage() {
  const { packageId } = useParams();
  const packageIdNum = Number(packageId);

  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScenarioRow[]>([]);

  useEffect(() => {
    if (!Number.isFinite(packageIdNum)) return;

    (async () => {
      try {
        const rows = await getScenariosByPackage(packageIdNum);
        setItems(rows);
      } catch (e: any) {
        alert(e?.message ?? "시나리오 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [packageIdNum]);

  if (!Number.isFinite(packageIdNum)) {
    return <div style={{ padding: 24 }}>잘못된 packageId</div>;
  }

  const firstScenarioId = items[0]?.scenario_id;

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => nav(-1)} style={{ marginBottom: 12 }}>
        ← 뒤로
      </button>

      <h2>시나리오</h2>
      {loading && <div>불러오는 중...</div>}

      {!loading && items.length === 0 && (
        <div style={{ opacity: 0.7 }}>이 패키지에 시나리오가 없습니다.</div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => nav(`${base}/scenario/${firstScenarioId}/prepare`)}>
            첫 번째 시나리오 시작하기
          </button>
        </div>
      )}

      {/* 목록은 보여주되 버튼은 없애고 "순서 안내"만 */}
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {items.map((s, idx) => (
          <div
            key={s.scenario_id}
            style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}
          >
            <div style={{ fontWeight: 800 }}>
              {idx + 1}. {s.title}
            </div>
            {s.one_liner && <div style={{ opacity: 0.85, marginTop: 6 }}>{s.one_liner}</div>}
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
              순서대로 진행됩니다
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getScenariosByPackage, ScenarioRow } from "@/lib/contentApi";
import styles from "./ScenarioListPage.module.css";

type NavState = {
  packageTitle?: string;
  categoryTitle?: string; // (옵션) CategoryListPage에서 넘겨주면 같이 전달
} | null;

export default function ScenarioListPage() {
  const { packageId } = useParams();
  const packageIdNum = Number(packageId);

  const nav = useNavigate();
  const loc = useLocation();

  // ✅ 현재 경로가 /a/... 또는 /b/... 인지 기반으로 base 생성
  const base = useMemo(() => getBasePath(loc.pathname), [loc.pathname]);

  const navState = (loc.state ?? null) as NavState;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScenarioRow[]>([]);

  useEffect(() => {
    if (!Number.isFinite(packageIdNum)) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const rows = await getScenariosByPackage(packageIdNum);
        if (!mounted) return;
        setItems(rows);
      } catch (e: any) {
        alert(e?.message ?? "시나리오 로드 실패");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [packageIdNum]);

  if (!Number.isFinite(packageIdNum)) {
    return <div style={{ padding: 24 }}>잘못된 packageId</div>;
  }

  const headerTitle = useMemo(() => {
    return navState?.packageTitle?.trim() || "패키지";
  }, [navState]);

  const firstScenarioId = items[0]?.scenario_id;
  const canStart = !loading && !!firstScenarioId;

  // ✅ Prepare로 이동 (Router: /a/scenario/:scenarioId/prepare, /b/scenario/:scenarioId/prepare)
  function goPrepare(scenarioId: number) {
    nav(`${base}/scenario/${scenarioId}/prepare`, {
      state: {
        packageTitle: navState?.packageTitle,
        categoryTitle: navState?.categoryTitle,
      },
    });
  }

  return (
    <div className={styles.root}>
      {/* AppBar */}
      <div className={styles.appBar}>
        <button
          className={styles.backBtn}
          onClick={() => nav(-1)}
          aria-label="뒤로가기"
        >
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

        <div className={`t-sub-18-sb ${styles.title}`}>{headerTitle}</div>
        <div />
      </div>

      <div className={styles.page}>
        {loading && (
          <div className={`t-body-14-r ${styles.loading}`}>불러오는 중...</div>
        )}

        {!loading && items.length === 0 && (
          <div className={`t-body-14-r ${styles.loading}`}>
            이 패키지에 시나리오가 없습니다.
          </div>
        )}

        {/* Step list */}
        {!loading && items.length > 0 && (
          <div className={styles.list}>
            {items.map((s, idx) => {
              const thumbSrc = s.thumbnail_key
                ? `/thumbnails/${s.thumbnail_key}.png`
                : null;

              return (
                <div key={s.scenario_id} className={styles.row}>
                  <div className={`t-body-14-m ${styles.stepCircle}`}>
                    {idx + 1}
                  </div>

                  {/* ✅ 카드 전체 클릭 → 해당 시나리오 Prepare */}
                  <button
                    type="button"
                    className={styles.cardBtn}
                    onClick={() => goPrepare(s.scenario_id)}
                  >
                    <div className={styles.card}>
                      <div className={styles.thumb} aria-hidden>
                        {thumbSrc ? (
                          <img
                            className={styles.thumbImg}
                            src={thumbSrc}
                            alt=""
                            loading="lazy"
                          />
                        ) : null}
                      </div>

                      <div className={`t-sub-18-sb ${styles.itemTitle}`}>
                        {s.title}
                      </div>

                      {s.one_liner && (
                        <div className={`t-body-14-r ${styles.itemDesc}`}>
                          {s.one_liner}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className={styles.bottomBar}>
        <button
          className={[
            "t-btn-14",
            styles.ctaBtn,
            canStart ? "" : styles.ctaBtnDisabled,
          ].join(" ")}
          disabled={!canStart}
          onClick={() => {
            if (!firstScenarioId) return;
            goPrepare(firstScenarioId);
          }}
        >
          순서대로 진행하기
        </button>
      </div>
    </div>
  );
}
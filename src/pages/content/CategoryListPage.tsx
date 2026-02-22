import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import {
  getCategories,
  CategoryRow,
  getPackagesByCategory,
  PackageRow,
} from "@/lib/contentApi";
import styles from "./CategoryListPage.module.css";

function getThumbSrc(thumbnailKey: string | null) {
  if (!thumbnailKey) return null;
  return `/thumbnails/${thumbnailKey}.png`;
}

export default function CategoryListPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);

  // tabs = categories
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  // cards = packages
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);

  // 1) 카테고리(탭) 로드
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const rows = await getCategories();

        if (!mounted) return;

        const activeRows = rows.filter((r) => r.is_active !== false);
        setCategories(activeRows);

        const firstId = activeRows[0]?.category_id ?? null;
        setActiveCategoryId(firstId);
      } catch (e: any) {
        alert(e?.message ?? "카테고리 로드 실패");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 2) 선택된 카테고리의 패키지(카드) 로드
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!activeCategoryId) return;

      try {
        setPkgLoading(true);
        const rows = await getPackagesByCategory(activeCategoryId);
        if (!mounted) return;
        setPackages(rows);
      } catch (e: any) {
        alert(e?.message ?? "패키지 로드 실패");
      } finally {
        if (mounted) setPkgLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeCategoryId]);

  const activeTitle = useMemo(() => {
    const c = categories.find((x) => x.category_id === activeCategoryId);
    return c?.title ?? "학습영역";
  }, [categories, activeCategoryId]);

  // ✅ public/thumbnails/{thumbnail_key}.png 로 매핑
  function getThumbSrc(thumbnailKey?: string | null) {
    const key = (thumbnailKey ?? "").trim();
    if (!key) return ""; // 썸네일 없으면 빈값 → fallback div 보여줌
    return `/thumbnails/${key}.png`;
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

        <div className={`t-sub-18-sb ${styles.title}`}>학습영역</div>
        <div />
      </div>

      <div className={styles.page}>
        {/* 섹션 타이틀 */}
        <div className={`t-title-24-b ${styles.sectionTitle}`}>
          {activeTitle}
        </div>

        {/* Tabs from categories */}
        <div className={styles.tabs}>
          {categories.map((c) => {
            const active = c.category_id === activeCategoryId;
            return (
              <button
                key={c.category_id}
                type="button"
                className={[
                  "t-btn-14",
                  styles.tab,
                  active ? styles.tabActive : "",
                ].join(" ")}
                onClick={() => setActiveCategoryId(c.category_id)}
              >
                {c.title}
              </button>
            );
          })}
        </div>

        {(loading || pkgLoading) && (
          <div className={`t-body-14-r ${styles.loading}`}>불러오는 중...</div>
        )}

        {/* Grid cards = packages */}
        <div className={styles.grid}>
          {packages.map((p) => {
            const thumbSrc = getThumbSrc(p.thumbnail_key);

            return (
              <button
                key={p.package_id}
                className={styles.cardBtn}
                onClick={() =>
                  nav(`${base}/package/${p.package_id}`, {
                    state: { packageTitle: p.title },
                  })
                }
              >
                <div className={styles.card}>
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={`${p.title} thumbnail`}
                      className={styles.thumbImg}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className={styles.thumb} />
                  )}

                  <div className={`t-sub-18-sb ${styles.cardTitle}`}>
                    {p.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!pkgLoading && !loading && packages.length === 0 && (
          <div className={`t-body-14-r ${styles.loading}`}>
            아직 등록된 패키지가 없어요.
          </div>
        )}
      </div>
    </div>
  );
}
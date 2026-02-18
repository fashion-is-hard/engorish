import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getPackagesByCategory, PackageRow } from "@/lib/contentApi";

export default function PackageListPage() {
  const { categoryId } = useParams();
  const categoryIdNum = Number(categoryId);

  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PackageRow[]>([]);

  useEffect(() => {
    if (!Number.isFinite(categoryIdNum)) return;

    (async () => {
      try {
        const rows = await getPackagesByCategory(categoryIdNum);
        setItems(rows);
      } catch (e: any) {
        alert(e?.message ?? "패키지 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryIdNum]);

  if (!Number.isFinite(categoryIdNum)) {
    return <div style={{ padding: 24 }}>잘못된 categoryId</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => nav(`${base}/category`)} style={{ marginBottom: 12 }}>
        ← 카테고리로
      </button>

      <h2>패키지</h2>
      {loading && <div>불러오는 중...</div>}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.map((p) => (
          <button
            key={p.package_id}
            onClick={() => nav(`${base}/package/${p.package_id}`)}
            style={{ padding: 16, textAlign: "left" }}
          >
            <div style={{ fontWeight: 700 }}>{p.title}</div>
            {p.description && <div style={{ opacity: 0.8 }}>{p.description}</div>}
            {p.thumbnail_key && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>thumb: {p.thumbnail_key}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

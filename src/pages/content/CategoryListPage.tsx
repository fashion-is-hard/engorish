import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import { getCategories, CategoryRow } from "@/lib/contentApi";

export default function CategoryListPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CategoryRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getCategories();
        setItems(rows);
      } catch (e: any) {
        alert(e?.message ?? "카테고리 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>카테고리</h2>
      {loading && <div>불러오는 중...</div>}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.map((c) => (
          <button
            key={c.category_id}
            onClick={() => nav(`${base}/category/${c.category_id}`)}
            style={{ padding: 16, textAlign: "left" }}
          >
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            {c.thumbnail_key && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>thumb: {c.thumbnail_key}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

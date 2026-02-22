import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Variant = "a" | "b";

export default function RequireAuthAndVariant({ required }: { required: Variant }) {
  const loc = useLocation();

  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean>(false);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [fatal, setFatal] = useState(false);

  const fromPath = useMemo(() => loc.pathname + loc.search + loc.hash, [loc.pathname, loc.search, loc.hash]);

  const fetchVariant = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("ab_variant")
      .eq("id", userId)
      .single();

    if (error) throw error;

    let v = data?.ab_variant as Variant | null;

    // 안전장치: null/이상값이면 즉시 랜덤 배정 후 저장 (DB 트리거가 있더라도 기존 유저 대비)
    if (v !== "a" && v !== "b") {
      v = Math.random() < 0.5 ? "a" : "b";
      await supabase.from("profiles").update({ ab_variant: v }).eq("id", userId);
    }

    return v;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) throw error;

        const session = data.session;
        if (!session?.user) {
          setAuthed(false);
          setVariant(null);
          setLoading(false);
          return;
        }

        setAuthed(true);
        const v = await fetchVariant(session.user.id);
        if (!mounted) return;

        setVariant(v);
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setFatal(true);
        setLoading(false);
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      try {
        if (!mounted) return;

        if (!session?.user) {
          setAuthed(false);
          setVariant(null);
          return;
        }

        setAuthed(true);
        const v = await fetchVariant(session.user.id);
        if (!mounted) return;

        setVariant(v);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setFatal(true);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  // 치명적 오류 시: 일단 로그인으로 보내서 복구 유도
  if (fatal) return <Navigate to="/login" replace />;

  // 로그인 안 되어 있으면 공용 로그인으로 (원래 가려던 곳 기억)
  if (!authed) return <Navigate to="/login" replace state={{ from: fromPath }} />;

  // variant 로딩이 아직 안 됐으면(이론상 거의 없음) 대기
  if (variant !== "a" && variant !== "b") return <div style={{ padding: 24 }}>로딩중...</div>;

  // 내 variant가 required랑 다르면 올바른 variant 루트로 리다이렉트
  if (variant !== required) {
    // /a/... 를 /b/... 로, /b/...를 /a/...로 치환
    const redirected = loc.pathname.replace(/^\/(a|b)(\/|$)/, `/${variant}$2`);
    return <Navigate to={redirected + loc.search + loc.hash} replace />;
  }

  return <Outlet />;
}
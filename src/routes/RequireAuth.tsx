import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }){
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthed(!!data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  // 로그인 안 되어 있으면 같은 variant의 /login으로 보냄
  const base = loc.pathname.startsWith("/b") ? "/b" : "/a";
  if (!authed) return <Navigate to={`${base}/login`} replace />;

  return children;
}

import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { paths } from "@/routes/paths";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthed(!!data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      setAuthed(!!session);
      setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  if (!authed) {
    const base = loc.pathname.startsWith("/b") ? paths.b.login : paths.a.login;
    return <Navigate to={base} replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}

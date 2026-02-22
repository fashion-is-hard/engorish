// LoginPage.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { signIn } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import styles from "./LoginPage.module.css";

type Variant = "a" | "b";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();

  const from = (loc.state as any)?.from as string | undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  async function routeAfterLogin() {
    // 1) 혹시 원래 가려던 경로(from)가 있으면 우선 그쪽으로 (가드가 variant 교정해줌)
    if (from && typeof from === "string" && from.startsWith("/")) {
      nav(from, { replace: true });
      return;
    }

    // 2) 없으면 내 variant를 조회해서 홈으로
    const { data: sessionRes } = await supabase.auth.getSession();
    const user = sessionRes.session?.user;
    if (!user) {
      nav("/login", { replace: true });
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("ab_variant")
      .eq("id", user.id)
      .single();

    if (error) {
      // 프로필 조회 실패 시 안전하게 a로
      nav("/a/home", { replace: true });
      return;
    }

    let v = profile?.ab_variant as Variant | null;
    if (v !== "a" && v !== "b") v = "a";

    nav(`/${v}/home`, { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      await signIn(email, password);
      await routeAfterLogin();
    } catch (err: any) {
      alert(err?.message ?? "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.titleWrap}>
          <h1 className={`t-title-32-b ${styles.title}`}>Log in Engorish</h1>
        </div>

        <form onSubmit={onSubmit} className={styles.form}>
          <input
            className={`t-body-16-r ${styles.input}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            inputMode="email"
          />

          <input
            className={`t-body-16-r ${styles.input}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            type="password"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "t-btn-14",
              styles.button,
              canSubmit ? styles.buttonEnabled : styles.buttonDisabled,
            ].join(" ")}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className={`t-body-14-r ${styles.footer}`}>
          잉고리쉬가 처음이신가요?
          <Link className={`t-link-14 ${styles.link}`} to="/signup">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
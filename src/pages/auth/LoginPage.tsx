import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { signIn } from "@/lib/auth";
import { getBasePath } from "@/lib/abVariant";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      await signIn(email, password);
      nav(`${base}/home`);
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
          <Link className={`t-link-14 ${styles.link}`} to={`${base}/signup`}>
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
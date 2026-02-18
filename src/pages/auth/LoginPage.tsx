import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { signIn } from "@/lib/auth";
import { getBasePath } from "@/lib/abVariant";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h2>로그인</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          type="password"
          autoComplete="current-password"
        />
        <button disabled={loading} type="submit">
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        아직 계정이 없나요? <Link to={`${base}/signup`}>회원가입</Link>
      </div>
    </div>
  );
}

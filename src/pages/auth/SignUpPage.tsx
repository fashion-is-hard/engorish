import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  signUpWithProfile,
  EXCHANGE_STATUS_OPTIONS,
  ExchangeStatusDb,
  GenderUi,
} from "@/lib/auth";
import { getBasePath } from "@/lib/abVariant";

export default function SignUpPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const base = getBasePath(loc.pathname);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<GenderUi>("선택안함");
  const [age, setAge] = useState<number>(20);
  const [exchangeStatus, setExchangeStatus] =
    useState<ExchangeStatusDb>("pre_departure");

  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().includes("@") &&
      password.length >= 6 &&
      fullName.trim().length > 0 &&
      age > 0
    );
  }, [email, password, fullName, age]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    try {
      await signUpWithProfile({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        gender,
        age,
        exchangeStatus,
      });
      alert("회원가입 완료! 이제 로그인 해주세요.");
      nav(`${base}/login`);
    } catch (err: any) {
      alert(err?.message ?? "회원가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>회원가입</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          이메일
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          비밀번호
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            type="password"
            autoComplete="new-password"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          성명
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="홍길동"
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            성별
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderUi)}
            >
              <option value="선택안함">선택안함</option>
              <option value="여">여</option>
              <option value="남">남</option>
              <option value="기타">기타</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            나이
            <input
              type="number"
              value={age}
              min={1}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          교환 상태
          <select
            value={exchangeStatus}
            onChange={(e) => setExchangeStatus(e.target.value as ExchangeStatusDb)}
          >
            {EXCHANGE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          style={{ height: 44, marginTop: 8 }}
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        이미 계정이 있나요? <Link to={`${base}/login`}>로그인</Link>
      </div>
    </div>
  );
}

// SignUpPage.tsx
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signUpWithProfile,
  EXCHANGE_STATUS_OPTIONS,
  ExchangeStatusDb,
  GenderUi,
} from "@/lib/auth";
import styles from "./SignUpPage.module.css";

export default function SignUpPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<GenderUi>("선택안함");
  const [age, setAge] = useState<number>(20);
  const [exchangeStatus, setExchangeStatus] =
    useState<ExchangeStatusDb>("pre_departure");

  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().includes("@") &&
      password.length >= 6 &&
      fullName.trim().length > 0 &&
      age > 0 &&
      agreePrivacy
    );
  }, [email, password, fullName, age, agreePrivacy]);

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

      // ✅ A/B는 DB에서 “사용자 모르게” 이미 배정됨(트리거/서버 로직)
      alert("회원가입 완료! 이제 로그인 해주세요.");
      nav("/login", { replace: true });
    } catch (err: any) {
      alert(err?.message ?? "회원가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        {/* AppBar */}
        <div className={styles.appBar}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => nav(-1)}
            aria-label="뒤로가기"
          >
            <svg
              className={styles.backIcon}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <h1 className={`t-title-24-b ${styles.title}`}>회원가입</h1>

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
              autoComplete="new-password"
            />

            <input
              className={`t-body-16-r ${styles.input}`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="이름"
            />

            <div className={styles.row2}>
              <select
                className={`t-body-16-r ${styles.select}`}
                value={gender}
                onChange={(e) => setGender(e.target.value as GenderUi)}
                aria-label="성별"
              >
                <option value="선택안함">성별</option>
                <option value="여">여</option>
                <option value="남">남</option>
                <option value="기타">기타</option>
              </select>

              <input
                className={`t-body-16-r ${styles.input}`}
                type="number"
                value={age}
                min={1}
                onChange={(e) => setAge(Number(e.target.value))}
                placeholder="나이"
                aria-label="나이"
              />
            </div>

            <select
              className={`t-body-16-r ${styles.select}`}
              value={exchangeStatus}
              onChange={(e) =>
                setExchangeStatus(e.target.value as ExchangeStatusDb)
              }
              aria-label="현재 어떤 상태인가요?"
            >
              {EXCHANGE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className={styles.agreeRow}>
              <label className={`t-body-14-r ${styles.agreeLeft}`}>
                <input
                  className={styles.checkbox}
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                />
                <span>
                  <span style={{ color: "var(--color-secondary)" }}>[필수]</span>{" "}
                  개인정보수집에 동의합니다
                </span>
              </label>

              <a className={`t-body-14-r ${styles.policyLink}`} href="#">
                개인정보 처리방침
              </a>
            </div>

            <div className={`t-body-14-r ${styles.footer}`}>
              이미 계정이 있나요?
              <Link className={`t-link-14 ${styles.link}`} to="/login">
                로그인
              </Link>
            </div>

            <div className={styles.bottomBar}>
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className={[
                  "t-btn-14",
                  styles.button,
                  canSubmit && !loading
                    ? styles.buttonEnabled
                    : styles.buttonDisabled,
                ].join(" ")}
              >
                {loading ? "가입 중..." : "회원가입"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
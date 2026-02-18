import { useState } from "react";
import { signUpWithProfile } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState(0);
  const [exchangeStatus, setExchangeStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await signUpWithProfile(
        email,
        password,
        name,
        gender,
        age,
        exchangeStatus
      );

      navigate("/a/home"); // 나중에 variant에 맞게 자동화 가능
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="이메일" onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="비밀번호"
          onChange={(e) => setPassword(e.target.value)}
        />
        <input placeholder="이름" onChange={(e) => setName(e.target.value)} />
        <input placeholder="성별" onChange={(e) => setGender(e.target.value)} />
        <input
          type="number"
          placeholder="나이"
          onChange={(e) => setAge(Number(e.target.value))}
        />
        <input
          placeholder="교환 상태"
          onChange={(e) => setExchangeStatus(e.target.value)}
        />
        <button type="submit">가입</button>
      </form>
    </div>
  );
}

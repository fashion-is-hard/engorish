import { signOut } from "@/lib/auth";

export default function HomePage() {
  return (
    <div>
      <h2>홈</h2>
      <button onClick={signOut}>로그아웃</button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { getBasePath } from "@/lib/abVariant";
import { getMyProfile, Profile } from "@/lib/profiles";

export default function HomePage() {
  const loc = useLocation();
  const nav = useNavigate();
  const base = getBasePath(loc.pathname);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (mounted) setProfile(p);
      } catch (e: any) {
        alert(e?.message ?? "프로필 로드 실패");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onLogout() {
    try {
      await signOut();
      nav(`${base}/login`);
    } catch (e: any) {
      alert(e?.message ?? "로그아웃 실패");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>홈</h2>

      {loading && <div>프로필 불러오는 중...</div>}

      {profile && (
        <div style={{ marginTop: 12, lineHeight: 1.8 }}>
          <div>
            <b>이름</b>: {profile.full_name}
          </div>
          <div>
            <b>교환 상태</b>: {profile.exchange_status}
          </div>
          <div>
            <b>성별</b>: {profile.gender}
          </div>
          <div>
            <b>나이</b>: {profile.age}
          </div>
          <div>
            <b>배포 앱</b>: {profile.signup_app}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <button onClick={() => nav(`${base}/category`)}>지금 시작하기</button>

        <button onClick={onLogout}>로그아웃</button>
      </div>
    </div>
  );
}

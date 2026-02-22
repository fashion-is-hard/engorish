// src/pages/landing/LandingPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";
import { supabase } from "@/lib/supabaseClient"; // 프로젝트 경로에 맞게 이미 쓰는 supabase import로 맞춰도 됨

export default function LandingPage() {
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const t1 = window.setTimeout(() => setVisible(true), 200);

        const route = async () => {
            // 1) 세션 확인
            const { data: sessionRes, error: sErr } = await supabase.auth.getSession();
            if (sErr) {
                // 세션 확인 실패 시: 안전하게 로그인으로
                navigate("/login", { replace: true });
                return;
            }

            const user = sessionRes.session?.user;
            if (!user) {
                // 로그인 안 했으면 랜딩 유지 (또는 자동 로그인 페이지로 보내고 싶으면 아래 주석 해제)
                // navigate("/login", { replace: true });
                return;
            }

            // 2) variant 조회
            const { data: profile, error: pErr } = await supabase
                .from("profiles")
                .select("ab_variant")
                .eq("id", user.id)
                .single();

            if (pErr) {
                // 프로필 조회 실패 시: 일단 로그인으로 보내거나 기본 a로 보내도 됨
                navigate("/login", { replace: true });
                return;
            }

            // 3) variant에 따라 라우팅
            const v = profile?.ab_variant === "b" ? "b" : "a";
            navigate(`/${v}`, { replace: true });
        };

        // 기존 1.5초 후 강제 이동 대신: 세션 체크 후 이동
        // 애니메이션 느낌 유지하고 싶으면 600~1200ms 정도 지연을 줄 수 있음.
        const t2 = window.setTimeout(() => {
            void route();
        }, 900);

        return () => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
        };
    }, [navigate]);

    return (
        <div className={styles.root}>
            <h1
                className={[
                    "t-title-42-b",
                    styles.title,
                    visible ? styles.titleVisible : "",
                ].join(" ")}
            >
                Engorish
            </h1>
        </div>
    );
}
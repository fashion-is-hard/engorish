// src/pages/landing/LandingPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";
import { supabase } from "@/lib/supabaseClient";

type Variant = "a" | "b";

export default function LandingPage() {
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const t1 = window.setTimeout(() => setVisible(true), 200);

        const route = async () => {
            try {
                // 1) 세션 확인
                const { data: sessionRes, error: sErr } = await supabase.auth.getSession();
                if (sErr) throw sErr;

                const user = sessionRes.session?.user;

                // 2) 로그인 안 됐으면 공용 로그인으로
                if (!user) {
                    navigate("/login", { replace: true });
                    return;
                }

                // 3) 로그인 돼 있으면 variant 조회 후 /a 또는 /b로
                const { data: profile, error: pErr } = await supabase
                    .from("profiles")
                    .select("ab_variant")
                    .eq("id", user.id)
                    .single();

                if (pErr) throw pErr;

                const v = (profile?.ab_variant === "b" ? "b" : "a") as Variant;
                navigate(`/${v}`, { replace: true });
            } catch (e) {
                // 어떤 에러든 안전하게 로그인으로
                navigate("/login", { replace: true });
            }
        };

        // ✅ 랜딩 연출 시간 (원하는대로 800~1500ms로 조절)
        const t2 = window.setTimeout(() => {
            void route();
        }, 1200);

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
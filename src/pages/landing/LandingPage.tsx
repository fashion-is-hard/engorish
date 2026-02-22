// src/pages/landing/LandingPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const t1 = window.setTimeout(() => setVisible(true), 200);
        const t2 = window.setTimeout(() => {
            navigate("/a/login", { replace: true });
        }, 1500);

        return () => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
        };
    }, [navigate]);

    return (
        <div className={styles.root}>
            <h1
                className={[
                    "t-title-42-b",                // ✅ 전역 타이포 시스템
                    styles.title,                  // ✅ 애니메이션용(opacity/scale)
                    visible ? styles.titleVisible : "",
                ].join(" ")}
            >
                Engorish
            </h1>
        </div>
    );
}
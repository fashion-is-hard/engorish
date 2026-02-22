import { useLocation, useNavigate } from "react-router-dom";
import { getBasePath } from "@/lib/abVariant";
import styles from "./InProgressCard.module.css";
import { useState } from "react";
import { thumbnailMap } from "@/lib/thumbnailMap";

export type SessionRow = {
    session_id: string;
    user_id: string;
    variant: "A" | "B" | string | null;
    scenario_id: number | null;
    status: string | null;
    started_at: string | null;
    ended_at: string | null;
    turn_count: number | null;
    word_count: number | null;
    result: any | null;
};

export type InProgressCardProps = {
    loading: boolean;
    inProgress: SessionRow | null;
};

export default function InProgressCard({ loading, inProgress }: InProgressCardProps) {
    const loc = useLocation();
    const nav = useNavigate();
    const base = getBasePath(loc.pathname);

    if (loading) return null;

    // ✅ 진행중이 없으면 HomePage(온보딩 카드)가 보여줄 거라 여기선 아무것도 안 보여도 됨
    if (!inProgress) return null;

    // 스샷은 “팀 프로젝트 / 1/3 / 3개의 카드” 고정 UI라서
    // 실제 DB에 시나리오 메타가 없으면 일단 하드코딩(나중에 scenario 테이블 join으로 교체)
    const items = [
        {
            title: "역할 분담하기",
            desc: "...",
            active: true,
            thumbnailKey: null,
        },
        {
            title: "회의 일정 정하기",
            desc: "...",
            active: false,
            thumbnailKey: null,
        },
        {
            title: "회의 일정 변경 요청하기",
            desc: "...",
            active: false,
            thumbnailKey: null,
        },
    ];
    function Thumb({ thumbnailKey }: { thumbnailKey?: string | null }) {
        const url = thumbnailKey ? thumbnailMap[thumbnailKey] : undefined;
        const [failed, setFailed] = useState(false);

        // 이미지 없거나 실패했으면 그냥 회색 박스
        if (!url || failed) {
            return <div className={styles.thumb} />;
        }

        return (
            <div className={styles.thumb}>
                <img
                    src={url}
                    alt=""
                    className={styles.thumbImg}
                    loading="lazy"
                    onError={() => setFailed(true)}
                />
            </div>
        );
    }

    return (
        <div>
            <div className={styles.sectionTopRow}>
                <div className={`t-body-14-r ${styles.sectionLabel}`}>진행중인 롤플레잉</div>
                <button className={`t-btn-14 ${styles.otherBtn}`} onClick={() => nav(`${base}/category`)}>
                    다른 목록
                </button>
            </div>

            <div className={styles.projectTitleRow}>
                <div className={`t-title-24-b ${styles.projectTitle}`}>팀 프로젝트</div>
                <div className={`t-cap-12-m ${styles.progressText}`}>1/3</div>
            </div>

            <div className={styles.progressBarWrap}>
                <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill} />
                </div>
            </div>

            <div className={styles.list}>
                {items.map((it, idx) => (
                    <div key={idx} className={styles.item}>
                        <div className={`${styles.checkCircle} ${it.active ? styles.checkCircleActive : ""}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M20 6L9 17l-5-5"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <div className={styles.card}>

                            <div className={`t-sub-18-sb ${styles.itemTitle}`}>{it.title}</div>
                            <div className={`t-body-14-r ${styles.itemDesc}`}>{it.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
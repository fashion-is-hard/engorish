// src/pages/home/InProgressCard.tsx
import React from "react";

export type SessionRow = {
    session_id: string;
    user_id: string;
    variant: "A" | "B" | string | null;
    scenario_id: number | null;
    status: string | null;
    started_at: string | null;
    ended_at: string | null;
    turn_count: number | null;
    word_count: number | null; // ✅ roleplay_sessions 컬럼명
    result: any | null;
};

export type InProgressCardProps = {
    loading: boolean;
    inProgress: SessionRow | null;
    recent: SessionRow[];
};

export default function InProgressCard({ loading, inProgress, recent }: InProgressCardProps) {
    if (loading) return <div>불러오는 중...</div>;

    if (!inProgress) {
        return (
            <div style={{ opacity: 0.75 }}>
                진행중인 롤플레잉이 없어요. 시나리오를 선택해 시작해보세요.
            </div>
        );
    }

    return (
        <div>
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>진행중인 롤플레잉</div>

            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ fontWeight: 700 }}>세션 ID</div>
                <div style={{ fontSize: 14, opacity: 0.7 }}>{inProgress.session_id}</div>
            </div>

            {recent.length > 0 && (
                <>
                    <div style={{ marginTop: 24, fontSize: 14, opacity: 0.7 }}>최근 완료</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {recent.map((r) => (
                            <div
                                key={r.session_id}
                                style={{
                                    padding: 12,
                                    border: "1px solid #eee",
                                    borderRadius: 10,
                                    fontSize: 13,
                                }}
                            >
                                {r.session_id}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
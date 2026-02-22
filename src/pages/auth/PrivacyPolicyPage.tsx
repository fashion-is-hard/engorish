// src/pages/legal/PrivacyPolicyPage.tsx
import { useNavigate } from "react-router-dom";
import styles from "./PrivacyPolicyPage.module.css";

export default function PrivacyPolicyPage() {
    const nav = useNavigate();

    return (
        <div className={styles.root}>
            {/* AppBar */}
            <div className={styles.appBar}>
                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => nav(-1)}
                    aria-label="뒤로가기"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 18L9 12L15 6"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                <div className={`t-sub-18-sb ${styles.title}`}>개인정보 처리방침</div>
                <div />
            </div>

            <div className={styles.content}>
                <div className={`t-title-20-b ${styles.h1}`}>개인정보 처리방침</div>

                <div className={`t-body-14-r ${styles.section}`}>
                    <div className={styles.h2}>1. 수집하는 개인정보 항목</div>
                    <div className={styles.p}>
                        <b>[필수]</b>
                        <ul>
                            <li>이메일</li>
                            <li>성별</li>
                            <li>연령대</li>
                            <li>교환학생 상태</li>
                        </ul>
                        <b>[서비스 이용 과정에서 자동 생성 및 수집]</b>
                        <ul>
                            <li>대화 전사 텍스트</li>
                            <li>발화량 및 플레이 진행 기록</li>
                            <li>접속 기록 및 서비스 이용 로그</li>
                        </ul>
                        <div className={styles.note}>※ 음성 녹음 파일은 저장하지 않습니다.</div>
                    </div>
                </div>

                <div className={`t-body-14-r ${styles.section}`}>
                    <div className={styles.h2}>2. 개인정보 이용 목적</div>
                    <ul className={styles.ul}>
                        <li>AI 대화 기능 제공</li>
                        <li>발화량 측정 및 세션 진행 관리</li>
                        <li>대화 분석 리포트 생성</li>
                        <li>서비스 개선 및 실험 결과 분석</li>
                        <li>오류 확인 및 보안 유지</li>
                    </ul>
                    <div className={styles.note}>
                        ※ 마케팅, 광고, 상업적 판매 목적으로 사용하지 않습니다.
                    </div>
                </div>

                <div className={`t-body-14-r ${styles.section}`}>
                    <div className={styles.h2}>3. 보유 및 이용 기간</div>
                    <ul className={styles.ul}>
                        <li>개인정보는 실험 종료 또는 수집일로부터 1개월 이내 보관 후 파기합니다.</li>
                        <li>이용자가 삭제를 요청할 경우 지체 없이 삭제합니다.</li>
                    </ul>
                </div>

                <div className={`t-body-14-r ${styles.section}`}>
                    <div className={styles.h2}>4. 제3자 처리 및 외부 서비스 이용</div>
                    <div className={styles.p}>
                        서비스 운영을 위해 다음 외부 서비스를 사용합니다.
                        <ul>
                            <li>Supabase</li>
                            <li>OpenAI API</li>
                        </ul>
                        위 서비스는 기술적 처리 목적이며, 개인정보를 판매하거나 제3자에게 제공하지 않습니다.
                    </div>
                </div>

                <div className={`t-body-14-r ${styles.section}`}>
                    <div className={styles.h2}>5. 참여자의 권리 및 내부 열람 제한</div>
                    <ul className={styles.ul}>
                        <li>참여자는 언제든지 열람, 수정, 삭제, 참여 철회를 요청할 수 있습니다.</li>
                        <li>발화 기록 및 개인 분석 데이터는 기능 제공 목적에 한해 저장되며, 운영팀 이외에는 열람/임의 제공하지 않습니다.</li>
                        <li>데이터 접근 권한은 최소한으로 제한되며 연구 목적 범위 내에서만 사용됩니다.</li>
                    </ul>
                </div>

                <div className={`t-body-14-r ${styles.footer}`}>
                    문의: rlatpgmlid@naver.com
                    <br />
                    시행일: 2026년 2월 22일
                </div>
            </div>
        </div>
    );
}
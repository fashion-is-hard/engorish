import { useMemo } from "react";
import PlayA from "./PlayA";

/**
 * 지금 단계에서는 “플레이 UI/흐름”을 먼저 고정하는게 중요해서
 * PlayB는 PlayA를 재사용 + (추후) 목표 UI를 얹는 방식으로 가는게 안정적이야.
 *
 * 실제 목표/체크는:
 * - ScenarioPrepareB에서 선택한 goal 체크
 * - 세션 결과(result)에 저장
 * 같은 식으로 붙이면 됨.
 */
export default function PlayB() {
    // ✅ 지금은 동일 UI 재사용 (필요하면 여기서 래핑해서 상단 목표 패널 추가 가능)
    // 다음 단계에서 “상단 goal bar” 넣을 때 이 파일을 확장하면 돼.
    return <PlayA />;
}
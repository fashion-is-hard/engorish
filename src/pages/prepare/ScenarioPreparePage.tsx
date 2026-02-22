// src/pages/prepare/ScenarioPreparePage.tsx
import { useLocation } from "react-router-dom";
import { getVariantFromPath } from "@/lib/abVariant";

// ✅ 네가 만든 분리 컴포넌트 경로 기준 (스크린샷 구조 그대로)
import PrepareA from "./PrepareA";
import PrepareB from "./PrepareB";

export default function ScenarioPreparePage() {
    const loc = useLocation();
    const variant = getVariantFromPath(loc.pathname); // "A" | "B"

    // ✅ /a/... 면 PrepareA, /b/... 면 PrepareB
    if (variant === "B") return <PrepareB />;
    return <PrepareA />;
}
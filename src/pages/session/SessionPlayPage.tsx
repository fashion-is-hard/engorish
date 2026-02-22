import { useLocation } from "react-router-dom";
import { getVariantFromPath } from "@/lib/abVariant";
import PlayA from "./PlayA";
import PlayB from "./PlayB";

export default function SessionPlayPage() {
    const loc = useLocation();
    const variant = getVariantFromPath(loc.pathname); // "A" | "B" (or "a"/"b")

    const v = String(variant).toLowerCase();
    return v === "b" ? <PlayB /> : <PlayA />;
}
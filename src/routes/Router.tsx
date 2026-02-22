import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "@/pages/landing/LandingPage";

import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import PrivacyPolicyPage from "@/pages/auth/PrivacyPolicyPage";

import HomePage from "@/pages/home/HomePage";

import CategoryListPage from "@/pages/content/CategoryListPage";
import PackageListPage from "@/pages/content/PackageListPage";
import ScenarioListPage from "@/pages/content/ScenarioListPage";

// ✅ 구조 변경 반영: prepare / session 폴더로 import 수정
import ScenarioPreparePage from "@/pages/prepare/ScenarioPreparePage";
import SessionPlayPage from "@/pages/session/SessionPlayPage";

import SessionEndPageA from "@/pages/session/PlayA";
import SessionEndPageB from "@/pages/session/PlayB";

import RequireAuthAndVariant from "@/routes/RequireAuth";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= Public ================= */}
        <Route path="/" element={<LandingPage />} />

        {/* 공용 인증 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* (선택) 예전 주소로 들어오면 공용으로 리다이렉트 */}
        <Route path="/a/login" element={<Navigate to="/login" replace />} />
        <Route path="/b/login" element={<Navigate to="/login" replace />} />
        <Route path="/a/signup" element={<Navigate to="/signup" replace />} />
        <Route path="/b/signup" element={<Navigate to="/signup" replace />} />

        {/* ================= A 앱 ================= */}
        <Route element={<RequireAuthAndVariant required="a" />}>
          <Route path="/a" element={<Navigate to="/a/home" replace />} />

          <Route path="/a/home" element={<HomePage />} />

          <Route path="/a/category" element={<CategoryListPage />} />
          <Route path="/a/category/:categoryId" element={<PackageListPage />} />
          <Route path="/a/package/:packageId" element={<ScenarioListPage />} />

          {/* ✅ prepare/play/end 라우트 연결 */}
          <Route
            path="/a/scenario/:scenarioId/prepare"
            element={<ScenarioPreparePage />}
          />
          <Route
            path="/a/session/:sessionId/play"
            element={<SessionPlayPage />}
          />
          <Route
            path="/a/session/:sessionId/end"
            element={<SessionEndPageA />}
          />
        </Route>

        {/* ================= B 앱 ================= */}
        <Route element={<RequireAuthAndVariant required="b" />}>
          <Route path="/b" element={<Navigate to="/b/home" replace />} />

          <Route path="/b/home" element={<HomePage />} />

          <Route path="/b/category" element={<CategoryListPage />} />
          <Route path="/b/category/:categoryId" element={<PackageListPage />} />
          <Route path="/b/package/:packageId" element={<ScenarioListPage />} />

          {/* ✅ prepare/play/end 라우트 연결 */}
          <Route
            path="/b/scenario/:scenarioId/prepare"
            element={<ScenarioPreparePage />}
          />
          <Route
            path="/b/session/:sessionId/play"
            element={<SessionPlayPage />}
          />
          <Route
            path="/b/session/:sessionId/end"
            element={<SessionEndPageB />}
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}
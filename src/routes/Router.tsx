import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "@/pages/landing/LandingPage";

import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import HomePage from "@/pages/home/HomePage";
import RequireAuth from "@/routes/RequireAuth";

import CategoryListPage from "@/pages/content/CategoryListPage";
import PackageListPage from "@/pages/content/PackageListPage";
import ScenarioListPage from "@/pages/content/ScenarioListPage";

import ScenarioPreparePage from "@/pages/play/ScenarioPreparePage";
import SessionPlayPage from "@/pages/play/SessionPlayPage";
import SessionEndPageA from "@/pages/play/SessionEndPageA";
import SessionEndPageB from "@/pages/play/SessionEndPageB";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔥 랜딩 페이지 */}
        <Route path="/" element={<LandingPage />} />

        {/* ================= A ================= */}

        <Route path="/a/login" element={<LoginPage />} />
        <Route path="/a/signup" element={<SignUpPage />} />
        <Route path="/a/home" element={<RequireAuth><HomePage /></RequireAuth>} />

        <Route path="/a/category" element={<RequireAuth><CategoryListPage /></RequireAuth>} />
        <Route path="/a/category/:categoryId" element={<RequireAuth><PackageListPage /></RequireAuth>} />
        <Route path="/a/package/:packageId" element={<RequireAuth><ScenarioListPage /></RequireAuth>} />

        <Route path="/a/scenario/:scenarioId/prepare" element={<RequireAuth><ScenarioPreparePage /></RequireAuth>} />
        <Route path="/a/session/:sessionId/play" element={<RequireAuth><SessionPlayPage /></RequireAuth>} />
        <Route path="/a/session/:sessionId/end" element={<RequireAuth><SessionEndPageA /></RequireAuth>} />

        {/* ================= B ================= */}

        <Route path="/b/login" element={<LoginPage />} />
        <Route path="/b/signup" element={<SignUpPage />} />
        <Route path="/b/home" element={<RequireAuth><HomePage /></RequireAuth>} />

        <Route path="/b/category" element={<RequireAuth><CategoryListPage /></RequireAuth>} />
        <Route path="/b/category/:categoryId" element={<RequireAuth><PackageListPage /></RequireAuth>} />
        <Route path="/b/package/:packageId" element={<RequireAuth><ScenarioListPage /></RequireAuth>} />

        <Route path="/b/scenario/:scenarioId/prepare" element={<RequireAuth><ScenarioPreparePage /></RequireAuth>} />
        <Route path="/b/session/:sessionId/play" element={<RequireAuth><SessionPlayPage /></RequireAuth>} />
        <Route path="/b/session/:sessionId/end" element={<RequireAuth><SessionEndPageB /></RequireAuth>} />

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />

      </Routes>
    </BrowserRouter>
  );
}
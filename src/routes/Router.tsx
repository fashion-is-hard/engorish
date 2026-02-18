import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import HomePage from "@/pages/home/HomePage";
import RequireAuth from "@/routes/RequireAuth";
import CategoryListPage from "@/pages/content/CategoryListPage";
import PackageListPage from "@/pages/content/PackageListPage";
import ScenarioListPage from "@/pages/content/ScenarioListPage";
import ScenarioPreparePage from "@/pages/play/ScenarioPreparePage";
import SessionPlayPage from "@/pages/play/SessionPlayPage";


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* A */}
<Route path="/a/category" element={<RequireAuth><CategoryListPage /></RequireAuth>} />
<Route path="/a/category/:categoryId" element={<RequireAuth><PackageListPage /></RequireAuth>} />
<Route path="/a/package/:packageId" element={<RequireAuth><ScenarioListPage /></RequireAuth>} />

{/* B */}
<Route path="/b/category" element={<RequireAuth><CategoryListPage /></RequireAuth>} />
<Route path="/b/category/:categoryId" element={<RequireAuth><PackageListPage /></RequireAuth>} />
<Route path="/b/package/:packageId" element={<RequireAuth><ScenarioListPage /></RequireAuth>} />


        <Route path="/" element={<Navigate to="/a/login" replace />} />

        {/* A */}
        <Route path="/a/login" element={<LoginPage />} />
        <Route path="/a/signup" element={<SignUpPage />} />
        <Route path="/a/home" element={<RequireAuth><HomePage /></RequireAuth>} />

        {/* B */}
        <Route path="/b/login" element={<LoginPage />} />
        <Route path="/b/signup" element={<SignUpPage />} />
        <Route path="/b/home" element={<RequireAuth><HomePage /></RequireAuth>} />

        <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
        <Route path="/a/scenario/:scenarioId/prepare" element={<RequireAuth><ScenarioPreparePage /></RequireAuth>} />
<Route path="/b/scenario/:scenarioId/prepare" element={<RequireAuth><ScenarioPreparePage /></RequireAuth>} />

<Route path="/a/session/:sessionId/play" element={<RequireAuth><SessionPlayPage /></RequireAuth>} />
<Route path="/b/session/:sessionId/play" element={<RequireAuth><SessionPlayPage /></RequireAuth>} />





      </Routes>
    </BrowserRouter>
  );
}

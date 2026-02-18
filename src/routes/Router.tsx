import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/a/login" replace />} />

        {/* A */}
        <Route path="/a/login" element={<div>/a/login</div>} />
        <Route path="/a/signup" element={<div>/a/signup</div>} />
        <Route path="/a/home" element={<div>/a/home</div>} />

        {/* B */}
        <Route path="/b/login" element={<div>/b/login</div>} />
        <Route path="/b/signup" element={<div>/b/signup</div>} />
        <Route path="/b/home" element={<div>/b/home</div>} />

        <Route path="*" element={<div>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}

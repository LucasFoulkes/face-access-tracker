import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import FacialLogin from "./pages/FacialLogin";
import PinLogin from "./pages/PinLogin";
import CedulaLogin from "./pages/CedulaLogin";
import Confirmation from "./pages/Confirmation";
import AdminPage from "./pages/AdminPage";
import FaceRegistration from "./pages/FaceRegistration";
import PWAStatus from "./components/PWAStatus";
import { useEffect, useState } from "react";
import { isHostAllowed } from "./utils/cors";
import "./App.css";

function App() {
  const [corsError, setCorsError] = useState<string | null>(null);

  // Apply viewport fixes for mobile devices - prevent zoom on input focus in iOS
  useEffect(() => {
    // Add meta viewport event listeners for iOS to prevent zoom on input focus
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    // Set viewport height as CSS variable to handle iOS Safari issues
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    // Check if the current host is allowed
    const checkHostAccess = () => {
      if (!isHostAllowed(window.location.href)) {
        setCorsError(`This host (${window.location.hostname}) might be blocked. If you're experiencing issues, please update vite.config.ts allowedHosts.`);
      }
    };

    checkHostAccess();

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return (
    <>
      {corsError && (
        <div className="fixed top-0 left-0 right-0 p-2 bg-yellow-500 text-black text-center z-50">
          ⚠️ {corsError}
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/facial" element={<FacialLogin />} />
        <Route path="/pin" element={<PinLogin />} />
        <Route path="/cedula" element={<CedulaLogin />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/face-registration" element={<FaceRegistration />} />
        {/* Fallback route for unknown paths */}
      </Routes>
      <PWAStatus />
    </>
  );
}

export default App;
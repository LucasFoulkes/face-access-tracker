import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import FacialLogin from "./pages/FacialLogin";
import PinLogin from "./pages/PinLogin";
import CedulaLogin from "./pages/CedulaLogin";
import Confirmation from "./pages/Confirmation";
import AdminPage from "./pages/AdminPage";
import FaceRegistration from "./pages/FaceRegistration";
import PWAStatus from "./components/PWAStatus";
import "./App.css";

function App() {
  return (
    <>
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
  )
}

export default App;
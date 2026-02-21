import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Public } from "./pages/Public";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import { Signup } from "./pages/Signup";

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        {/* Auth */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/signup" element={<Signup />} />

        {/* Admin dashboard with username in URL */}
        <Route path="/admin/:username" element={<Admin />} />

        {/* Public profile */}
        <Route path="/:username" element={<Public />} />

        {/* Fallback: redirect home to marketing public page */}
        <Route path="/" element={<Navigate to="/marketing" replace />} />
      </Routes>
    </>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;

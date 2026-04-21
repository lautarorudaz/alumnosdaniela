import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Ejercicios from "./pages/Ejercicios";
import Rutinas from "./pages/Rutinas";
import Comentarios from "./pages/Comentarios";
import RutinaPublica from "./pages/RutinaPublica";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>

                    {/* ── Pública — sin login ─────────────────────────────────────── */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/rutina/:token" element={<RutinaPublica />} />

                    {/* ── Privadas — requieren login ──────────────────────────────── */}
                    <Route path="/inicio" element={<PrivateRoute><Inicio /></PrivateRoute>} />
                    <Route path="/ejercicios" element={<PrivateRoute><Ejercicios /></PrivateRoute>} />
                    <Route path="/rutinas" element={<PrivateRoute><Rutinas /></PrivateRoute>} />
                    <Route path="/comentarios" element={<PrivateRoute><Comentarios /></PrivateRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/inicio" replace />} />

                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
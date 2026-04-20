import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Dashboard from "./pages/Dashboard";
import Ejercicios from "./pages/Ejercicios";
import Rutinas from "./pages/Rutinas";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/inicio" element={<PrivateRoute><Inicio /></PrivateRoute>} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/ejercicios" element={<PrivateRoute><Ejercicios /></PrivateRoute>} />
                    <Route path="/rutinas" element={<PrivateRoute><Rutinas /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/inicio" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
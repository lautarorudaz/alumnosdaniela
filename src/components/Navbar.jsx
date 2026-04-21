import { useState } from "react";
import { NavLink } from "react-router-dom";
import { logout } from "../firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                
                {/* Placeholder para centrar el logo en mobile */}
                <div className="navbar-placeholder" style={{ display: 'none' }}></div>

                <div className="navbar-logo-container">
                    <img src="/logo.png" alt="Logo" className="navbar-logo" />
                </div>

                <div className={`navbar-links ${isOpen ? 'open' : ''}`}>
                    <NavLink to="/inicio" className="navbar-link" onClick={() => setIsOpen(false)}>INICIO</NavLink>
                    <NavLink to="/ejercicios" className="navbar-link" onClick={() => setIsOpen(false)}>EJERCICIOS</NavLink>
                    <NavLink to="/rutinas" className="navbar-link" onClick={() => setIsOpen(false)}>RUTINAS</NavLink>
                    <NavLink to="/comentarios" className="navbar-link" onClick={() => setIsOpen(false)}>COMENTARIOS</NavLink>
                    
                    {/* Logout visible solo en mobile dentro del menú */}
                    <div className="mobile-only" style={{ marginTop: '2rem', width: '100%', display: 'none' }}>
                        <button onClick={handleLogout} className="navbar-logout-btn" style={{ width: '100%' }}>
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                <div className="navbar-actions">
                    <button onClick={handleLogout} className="navbar-logout-btn">
                        Cerrar sesión
                    </button>
                </div>

                {/* Hamburger Button */}
                <button className="navbar-hamburger" onClick={toggleMenu} aria-label="Menu">
                    {isOpen ? <CloseIcon /> : <MenuIcon />}
                </button>

            </div>
        </nav>
    );
}

function MenuIcon() {
    return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}

function CloseIcon() {
    return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
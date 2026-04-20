import { NavLink } from "react-router-dom";
import { logout } from "../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const linkStyle = ({ isActive }) => ({
        color: isActive ? "var(--color-accent)" : "white",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: "500",
        letterSpacing: "0.04em",
        paddingBottom: "2px",
        borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
        transition: "all 0.2s",
    });

    return (
        <nav style={styles.nav}>
            <div style={styles.inner}>

                <img src="/logo.png" alt="Logo" style={styles.logo} />

                <div style={styles.links}>
                    <NavLink to="/inicio" style={linkStyle}>INICIO</NavLink>
                    <NavLink to="/ejercicios" style={linkStyle}>EJERCICIOS</NavLink>
                    <NavLink to="/rutinas" style={linkStyle}>RUTINAS</NavLink>
                    <NavLink to="/comentarios" style={linkStyle}>COMENTARIOS</NavLink>
                </div>

                <button onClick={handleLogout} style={styles.btn}>
                    Cerrar sesión
                </button>

            </div>
        </nav>
    );
}

const styles = {
    nav: {
        background: "var(--color-primary)",
        padding: "0 2rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
    },
    inner: {
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "80px 1fr 140px",
        alignItems: "center",
    },
    logo: {
        height: "50px",
        objectFit: "contain",
    },
    links: {
        display: "flex",
        gap: "2.5rem",
        justifyContent: "center",
        alignItems: "center",
    },
    btn: {
        background: "transparent",
        border: "1.5px solid var(--color-accent)",
        color: "var(--color-accent)",
        borderRadius: "var(--radius-sm)",
        padding: "7px 16px",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
        justifySelf: "end",
    },
};
import { useAuth } from "../hooks/useAuth";
import { logout } from "../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.brand}>
                <span style={styles.dot1} />
                <span style={styles.dot2} />
                <span style={styles.title}>Daniela en Movimiento</span>
            </div>
            <div style={styles.right}>
                {user && <span style={styles.email}>{user.email}</span>}
                <button onClick={handleLogout} style={styles.btn}>Cerrar sesión</button>
            </div>
        </nav>
    );
}

const styles = {
    nav: {
        background: "var(--color-primary)",
        color: "#fff",
        padding: "0 1.5rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 10px rgba(2,104,66,0.3)",
    },
    brand: { display: "flex", alignItems: "center", gap: "8px" },
    dot1: { width: 10, height: 10, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" },
    dot2: { width: 10, height: 10, borderRadius: "50%", background: "var(--color-primary-3)", display: "inline-block" },
    title: { fontWeight: 700, fontSize: "16px", letterSpacing: "0.03em" },
    right: { display: "flex", alignItems: "center", gap: "12px" },
    email: { fontSize: "13px", opacity: 0.85 },
    btn: {
        padding: "6px 14px",
        background: "var(--color-accent)",
        color: "#013d27",
        border: "none",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "13px",
        cursor: "pointer",
    },
};

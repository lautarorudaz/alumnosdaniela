import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../firebase/auth";
import "../styles/theme.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError("Correo o contraseña incorrectos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.bg}>
            <div style={styles.card}>

                <img src="/logo.png" alt="Logo Daniela en Movimiento" style={styles.logo} />

                <h1 style={styles.title}>DANIELA EN MOVIMIENTO</h1>
                <p style={styles.subtitle}>Acceso exclusivo · Panel de profesora</p>

                <div style={styles.strip}>
                    {["#026842", "#009d71", "#5ccda7", "#efb810", "#f9db5c"].map(c => (
                        <div key={c} style={{ ...styles.dot, background: c }} />
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.field}>
                        <label style={styles.label}>Correo electrónico</label>
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} style={styles.btn}>
                        {loading ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>

                <p style={styles.footer}>Sistema de gestión de turnos · uso privado</p>
            </div>
        </div>
    );
}

const styles = {
    bg: {
        minHeight: "100vh",
        background: "var(--color-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
    },
    card: {
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: "2.5rem 2rem 2rem",
        width: "100%",
        maxWidth: "400px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    logo: {
        width: "80px",
        height: "80px",
        objectFit: "contain",
        borderRadius: "50%",
        marginBottom: "1.25rem",
        border: "3px solid var(--color-primary-3)",
    },
    title: {
        fontSize: "18px",
        fontWeight: "600",
        color: "var(--color-primary)",
        margin: "0 0 4px",
        textAlign: "center",
        letterSpacing: "0.02em",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--color-text-muted)",
        margin: "0 0 1.5rem",
        textAlign: "center",
    },
    strip: {
        display: "flex",
        gap: "6px",
        marginBottom: "1.75rem",
    },
    dot: {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
    },
    form: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
    },
    label: {
        fontSize: "12px",
        fontWeight: "500",
        color: "var(--color-primary)",
        letterSpacing: "0.03em",
    },
    input: {
        padding: "10px 14px",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "14px",
        color: "var(--color-text)",
        background: "#f6fdf9",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    },
    error: {
        fontSize: "13px",
        color: "#c0392b",
        margin: "0",
        textAlign: "center",
    },
    btn: {
        padding: "13px",
        background: "var(--color-accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "15px",
        fontWeight: "500",
        cursor: "pointer",
        marginTop: "4px",
        letterSpacing: "0.02em",
    },
    footer: {
        marginTop: "1.5rem",
        fontSize: "11px",
        color: "var(--color-text-muted)",
        textAlign: "center",
    },
};
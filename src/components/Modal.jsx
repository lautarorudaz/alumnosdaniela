export default function Modal({ title, onClose, children }) {
    return (
        <div style={styles.backdrop} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>{title}</h2>
                    <button onClick={onClose} style={styles.close}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: "fixed", inset: 0,
        background: "rgba(1,61,39,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: "1rem",
    },
    modal: {
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: "1.75rem 1.5rem",
        width: "100%", maxWidth: "440px",
        boxShadow: "0 8px 40px rgba(2,104,66,0.2)",
    },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
    title: { margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--color-primary)" },
    close: {
        background: "none", border: "none", fontSize: "18px",
        cursor: "pointer", color: "var(--color-text-muted)", lineHeight: 1,
    },
};

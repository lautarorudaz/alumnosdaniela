export default function TurnoCard({ turno, onEdit, onDelete }) {
    const { alumno, fecha, hora, disciplina, notas } = turno;

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <p style={styles.alumno}>{alumno}</p>
                    <p style={styles.disciplina}>{disciplina}</p>
                </div>
                <div style={styles.actions}>
                    <button onClick={() => onEdit(turno)} style={styles.btnEdit}>Editar</button>
                    <button onClick={() => onDelete(turno.id)} style={styles.btnDelete}>Eliminar</button>
                </div>
            </div>
            <div style={styles.info}>
                <span style={styles.badge}>📅 {fecha}</span>
                <span style={styles.badge}>🕐 {hora}</span>
            </div>
            {notas && <p style={styles.notas}>{notas}</p>}
        </div>
    );
}

const styles = {
    card: {
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.25rem",
        border: "1.5px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        transition: "box-shadow 0.2s",
    },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    alumno: { margin: 0, fontWeight: 700, fontSize: "15px", color: "var(--color-text)" },
    disciplina: { margin: "2px 0 0", fontSize: "13px", color: "var(--color-primary-2)" },
    actions: { display: "flex", gap: "8px" },
    btnEdit: {
        padding: "4px 12px", background: "var(--color-primary-3)", border: "none",
        borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#013d27",
    },
    btnDelete: {
        padding: "4px 12px", background: "#ffeaea", border: "none",
        borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#c0392b",
    },
    info: { display: "flex", gap: "10px", flexWrap: "wrap" },
    badge: {
        background: "var(--color-bg)", borderRadius: "6px", padding: "3px 10px",
        fontSize: "12px", color: "var(--color-text)", border: "1px solid var(--color-border)",
    },
    notas: { margin: 0, fontSize: "13px", color: "var(--color-text-muted)", fontStyle: "italic" },
};

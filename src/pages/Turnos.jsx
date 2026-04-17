import { useState } from "react";
import { useTurnos } from "../hooks/useTurnos";
import TurnoCard from "../components/TurnoCard";
import Modal from "../components/Modal";

const EMPTY = { alumno: "", fecha: "", hora: "", disciplina: "", notas: "" };

export default function Turnos() {
    const { turnos, loading, error, crear, editar, eliminar } = useTurnos();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null); // turno being edited
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
    const openEdit = (t) => { setEditing(t); setForm({ alumno: t.alumno, fecha: t.fecha, hora: t.hora, disciplina: t.disciplina, notas: t.notas || "" }); setShowModal(true); };
    const closeModal = () => setShowModal(false);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) await editar(editing.id, form);
            else await crear(form);
            closeModal();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Eliminar este turno?")) await eliminar(id);
    };

    return (
        <div style={styles.page}>
            <div style={styles.topBar}>
                <h1 style={styles.heading}>Turnos</h1>
                <button onClick={openCreate} style={styles.btnNew}>+ Nuevo turno</button>
            </div>

            {loading && <p style={styles.msg}>Cargando turnos…</p>}
            {error && <p style={{ ...styles.msg, color: "#c0392b" }}>{error}</p>}

            {!loading && turnos.length === 0 && (
                <p style={styles.msg}>No hay turnos registrados aún.</p>
            )}

            <div style={styles.grid}>
                {turnos.map(t => (
                    <TurnoCard key={t.id} turno={t} onEdit={openEdit} onDelete={handleDelete} />
                ))}
            </div>

            {showModal && (
                <Modal title={editing ? "Editar turno" : "Nuevo turno"} onClose={closeModal}>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        {[
                            { name: "alumno", label: "Alumno/a", type: "text", required: true },
                            { name: "fecha", label: "Fecha", type: "date", required: true },
                            { name: "hora", label: "Hora", type: "time", required: true },
                            { name: "disciplina", label: "Disciplina", type: "text", required: true },
                            { name: "notas", label: "Notas (opcional)", type: "text", required: false },
                        ].map(f => (
                            <div key={f.name} style={styles.field}>
                                <label style={styles.label}>{f.label}</label>
                                <input
                                    name={f.name}
                                    type={f.type}
                                    value={form[f.name]}
                                    onChange={handleChange}
                                    required={f.required}
                                    style={styles.input}
                                />
                            </div>
                        ))}
                        <button type="submit" disabled={saving} style={styles.btnSave}>
                            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear turno"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}

const styles = {
    page: { padding: "1.5rem", maxWidth: "800px", margin: "0 auto" },
    topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
    heading: { margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--color-primary)" },
    btnNew: {
        padding: "10px 20px", background: "var(--color-primary)", color: "#fff",
        border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "14px", cursor: "pointer",
    },
    grid: { display: "flex", flexDirection: "column", gap: "12px" },
    msg: { color: "var(--color-text-muted)", textAlign: "center", padding: "2rem 0" },
    form: { display: "flex", flexDirection: "column", gap: "12px" },
    field: { display: "flex", flexDirection: "column", gap: "4px" },
    label: { fontSize: "12px", fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.03em" },
    input: {
        padding: "9px 12px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)",
        fontSize: "14px", color: "var(--color-text)", background: "#f6fdf9", outline: "none", width: "100%", boxSizing: "border-box",
    },
    btnSave: {
        padding: "12px", background: "var(--color-accent)", color: "#013d27",
        border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginTop: "4px",
    },
};

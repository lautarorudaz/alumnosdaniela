import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firestore";
import RutinaEditor, { emptyRutina } from "../components/RutinaEditor";
import { generateId } from "../utils/uuid";

const ETAPAS = ["Movilidad", "Activación", "Trabajo Central"];

export default function Rutinas() {
    const [rutinas, setRutinas] = useState([]);
    const [rutinasActivas, setRutinasActivas] = useState(0);

    // Para el editor
    const [showEditor, setShowEditor] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [rutinaActual, setRutinaActual] = useState(null);

    const [confirmDel, setConfirmDel] = useState(null);

    const fetchData = async () => {
        const [rSnap, aSnap] = await Promise.all([
            getDocs(collection(db, "rutinas")),
            getDocs(collection(db, "alumnos")),
        ]);
        setRutinas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRutinasActivas(aSnap.docs.filter(d => d.data().rutina).length);
    };

    useEffect(() => { fetchData(); }, []);

    const openNueva = () => {
        setRutinaActual(emptyRutina());
        setEditandoId(null);
        setShowEditor(true);
    };

    const openEditar = (r) => {
        setRutinaActual({ nombre: r.nombre, semanas: r.semanas });
        setEditandoId(r.id);
        setShowEditor(true);
    };

    const openDuplicar = (r) => {
        setRutinaActual({
            nombre: `${r.nombre} (copia)`,
            semanas: JSON.parse(JSON.stringify(r.semanas)).map(s => ({
                ...s, id: generateId(),
                dias: s.dias.map(d => ({ ...d, id: generateId() })),
            })),
        });
        setEditandoId(null);
        setShowEditor(true);
    };

    const handleGuardar = async (rutinaGuardada) => {
        if (editandoId) {
            await updateDoc(doc(db, "rutinas", editandoId), rutinaGuardada);
        } else {
            await addDoc(collection(db, "rutinas"), rutinaGuardada);
        }
        setShowEditor(false);
        fetchData();
    };

    const handleEliminar = async (id) => {
        await deleteDoc(doc(db, "rutinas", id));
        setConfirmDel(null);
        fetchData();
    };

    return (
        <>
            <Navbar />
            <div style={S.page}>
                <div style={S.statsGrid}>
                    <StatCard label="Rutinas genéricas" value={rutinas.length} color="var(--color-primary)" />
                    <StatCard label="Rutinas activas" value={rutinasActivas} color="var(--color-accent)" />
                </div>

                <div style={S.sectionHeader}>
                    <span style={S.sectionTitle}>Rutinas genéricas</span>
                    <button style={S.btnNuevo} onClick={openNueva}>+ Nueva rutina</button>
                </div>

                {rutinas.length === 0 ? (
                    <div style={S.empty}>No hay rutinas genéricas todavía.</div>
                ) : rutinas.map(r => (
                    <div key={r.id} style={S.rutinaCard}>
                        <div>
                            <p style={S.rcNombre}>{r.nombre}</p>
                            <p style={S.rcMeta}>
                                {r.semanas?.length} semana{r.semanas?.length !== 1 ? "s" : ""} ·{" "}
                                {r.semanas?.[0]?.dias?.length} días/semana
                            </p>
                            <div style={{ marginTop: 6 }}>
                                {ETAPAS.map(e => <span key={e} style={S.tag}>{e}</span>)}
                            </div>
                        </div>
                        <div style={S.rcActions}>
                            <button style={S.iconBtn} title="Editar" onClick={() => openEditar(r)}><EditIcon /></button>
                            <button style={S.iconBtn} title="Duplicar" onClick={() => openDuplicar(r)}><CopyIcon /></button>
                            <button style={{ ...S.iconBtn, color: "#c0392b" }} title="Eliminar" onClick={() => setConfirmDel(r)}><DeleteIcon /></button>
                        </div>
                    </div>
                ))}
            </div>

            {showEditor && (
                <RutinaEditor
                    rutinaInicial={rutinaActual}
                    titulo={editandoId ? "Editar rutina" : "Nueva rutina genérica"}
                    onClose={() => setShowEditor(false)}
                    onSave={handleGuardar}
                />
            )}

            {/* CONFIRMAR ELIMINAR */}
            {confirmDel && (
                <div style={S.overlay}>
                    <div style={{ ...S.pickerModal, maxWidth: 360, textAlign: "center" }}>
                        <DeleteIcon size={32} color="#c0392b" />
                        <h2 style={{ ...S.editorTitle, marginTop: 12 }}>¿Eliminar rutina?</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: "8px 0 24px" }}>
                            Vas a eliminar <strong>{confirmDel.nombre}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div style={S.editorFooter}>
                            <button style={S.btnCancelar} onClick={() => setConfirmDel(null)}>Cancelar</button>
                            <button style={{ ...S.btnGuardar, background: "#c0392b" }} onClick={() => handleEliminar(confirmDel.id)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
    return (
        <div style={{ ...S.statCard, borderTop: `4px solid ${color}` }}>
            <p style={S.statLabel}>{label}</p>
            <p style={{ ...S.statValue, color }}>{value}</p>
        </div>
    );
}

// ── ÍCONOS ────────────────────────────────────────────────────────────────────
function EditIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function CopyIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function DeleteIcon({ size = 15, color = "currentColor" }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}

// ── ESTILOS ───────────────────────────────────────────────────────────────────
const S = {
    page: { maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" },
    statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.75rem" },
    statCard: { background: "white", borderRadius: "var(--radius-md)", padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    statLabel: { fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 6px", fontWeight: 500 },
    statValue: { fontSize: 34, fontWeight: 700, margin: 0 },
    sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
    sectionTitle: { fontSize: 13, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.05em", textTransform: "uppercase" },
    btnNuevo: { padding: "9px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
    rutinaCard: { background: "white", borderRadius: "var(--radius-md)", padding: "1rem 1.25rem", marginBottom: 10, borderLeft: "4px solid var(--color-primary-2)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
    rcNombre: { fontSize: 15, fontWeight: 600, color: "var(--color-primary)", margin: "0 0 3px" },
    rcMeta: { fontSize: 12, color: "var(--color-text-muted)", margin: 0 },
    rcActions: { display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 12 },
    tag: { display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#eafaf4", color: "var(--color-primary)", marginRight: 4 },
    empty: { textAlign: "center", color: "var(--color-text-muted)", fontSize: 14, padding: "3rem 0" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, overflowY: "auto", padding: "2rem 1rem" },
    pickerModal: { background: "white", borderRadius: "var(--radius-lg)", padding: "1.75rem", width: "100%", maxWidth: 520, marginTop: "auto", marginBottom: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    editorTitle: { fontSize: 18, fontWeight: 600, color: "var(--color-primary)", margin: 0 },
    editorFooter: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: "1.5rem" },
    btnCancelar: { padding: "10px 20px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, cursor: "pointer", color: "var(--color-text)" },
    btnGuardar: { padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
};
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firestore";
import RutinaEditor, { emptyRutina } from "../components/RutinaEditor";

const METODOLOGIAS = ["Presencial", "A distancia", "Híbrido"];

const emptyForm = {
    nombre: "", apellido: "", edad: "", metodologia: "Presencial", telefono: "",
};

export default function Inicio() {
    const [alumnos, setAlumnos] = useState([]);
    const [rutinasGenericas, setRutinasGenericas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState("todos");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [confirmDel, setConfirmDel] = useState(null);

    // Asignación de rutina
    const [alumnoParaRutina, setAlumnoParaRutina] = useState(null);
    const [showSelectTemplate, setShowSelectTemplate] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [rutinaEditing, setRutinaEditing] = useState(null);

    const fetchAlumnos = async () => {
        const snap = await getDocs(collection(db, "alumnos"));
        setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));

        const rSnap = await getDocs(collection(db, "rutinas"));
        setRutinasGenericas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { fetchAlumnos(); }, []);

    const totalAlumnos = alumnos.length;
    const conRutina = alumnos.filter(a => a.rutina).length;
    const sinRutina = alumnos.filter(a => !a.rutina).length;

    const alumnosFiltrados = alumnos.filter(a => {
        const nombreCompleto = `${a.nombre} ${a.apellido}`.toLowerCase();
        const matchBusqueda = nombreCompleto.includes(busqueda.toLowerCase());
        const matchFiltro =
            filtro === "todos" ? true :
                filtro === "con_rutina" ? !!a.rutina :
                    filtro === "sin_rutina" ? !a.rutina :
                        filtro === "a_distancia" ? a.metodologia === "A distancia" : true;
        return matchBusqueda && matchFiltro;
    });

    const openNuevo = () => { setForm(emptyForm); setEditando(null); setShowModal(true); };
    const openEditar = (a) => { setForm({ nombre: a.nombre, apellido: a.apellido, edad: a.edad, metodologia: a.metodologia, telefono: a.telefono }); setEditando(a.id); setShowModal(true); };

    const handleGuardar = async () => {
        if (!form.nombre || !form.apellido) return;
        if (editando) {
            await updateDoc(doc(db, "alumnos", editando), form);
        } else {
            await addDoc(collection(db, "alumnos"), { ...form, rutina: null });
        }
        setShowModal(false);
        fetchAlumnos();
    };

    const handleEliminar = async (id) => {
        await deleteDoc(doc(db, "alumnos", id));
        setConfirmDel(null);
        fetchAlumnos();
    };

    const handleSelectPlantilla = (genId) => {
        const r = rutinasGenericas.find(rg => rg.id === genId);
        if (r) {
            setShowSelectTemplate(false);
            setRutinaEditing(JSON.parse(JSON.stringify({ nombre: r.nombre, semanas: r.semanas })));
            setShowEditor(true);
        }
    };

    const openCrearDeCero = () => {
        setShowSelectTemplate(false);
        setRutinaEditing(emptyRutina());
        setShowEditor(true);
    };

    return (
        <>
            <Navbar />
            <div style={styles.page}>

                {/* PANEL DE STATS */}
                <div style={styles.statsGrid}>
                    <StatCard label="Total alumnos" value={totalAlumnos} color="var(--color-primary)" />
                    <StatCard label="Alumnos con rutina" value={conRutina} color="var(--color-primary-2)" />
                    <StatCard label="Alumnos sin rutina" value={sinRutina} color="var(--color-accent)" />
                </div>

                {/* BARRA DE BÚSQUEDA Y FILTROS */}
                <div style={styles.toolbar}>
                    <input
                        style={styles.search}
                        type="text"
                        placeholder="🔍  Buscar por nombre..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                    <div style={styles.filtros}>
                        {[
                            { key: "todos", label: "Todos" },
                            { key: "con_rutina", label: "Con rutina" },
                            { key: "sin_rutina", label: "Sin rutina" },
                            { key: "a_distancia", label: "A distancia" },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFiltro(f.key)}
                                style={{ ...styles.filtroBtn, ...(filtro === f.key ? styles.filtroBtnActive : {}) }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button style={styles.btnNuevo} onClick={openNuevo}>+ Nuevo alumno</button>
                </div>

                {/* TABLA */}
                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                {["Nombre y apellido", "Edad", "Metodología", "Teléfono", "Rutina", "Acciones"].map(h => (
                                    <th key={h} style={styles.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {alumnosFiltrados.length === 0 ? (
                                <tr><td colSpan={6} style={styles.empty}>No se encontraron alumnos.</td></tr>
                            ) : alumnosFiltrados.map(a => (
                                <tr key={a.id} style={styles.tr}>
                                    <td style={styles.td}><strong>{a.nombre} {a.apellido}</strong></td>
                                    <td style={styles.td}>{a.edad}</td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.badge, background: a.metodologia === "A distancia" ? "#e8f4fd" : "#eafaf4", color: a.metodologia === "A distancia" ? "#1a6fa8" : "var(--color-primary)" }}>
                                            {a.metodologia}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{a.telefono}</td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.badge, background: a.rutina ? "#eafaf4" : "#fff8e1", color: a.rutina ? "var(--color-primary)" : "#a07000" }}>
                                            {a.rutina ? "Asignada" : "Sin rutina"}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.acciones}>
                                            <button title="Editar alumno" style={styles.iconBtn} onClick={() => openEditar(a)}>
                                                <EditIcon />
                                            </button>
                                            
                                            {a.rutina ? (
                                                <button title="Ver / Editar rutina asignada" style={{ ...styles.iconBtn, color: "var(--color-primary)" }} onClick={() => {
                                                    setAlumnoParaRutina(a);
                                                    setRutinaEditing(a.rutina);
                                                    setShowEditor(true);
                                                }}>
                                                    <ViewIcon />
                                                </button>
                                            ) : (
                                                <button title="Asignar rutina" style={{ ...styles.iconBtn, color: "var(--color-primary-2)" }} onClick={() => {
                                                    setAlumnoParaRutina(a);
                                                    setShowSelectTemplate(true);
                                                }}>
                                                    <RutinaIcon />
                                                </button>
                                            )}

                                            <button title="Eliminar alumno" style={{ ...styles.iconBtn, color: "#c0392b" }} onClick={() => setConfirmDel(a)}>
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL ASIGNAR RUTINA (ELIGIR MÉTODO) */}
            {showSelectTemplate && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: "400px" }}>
                        <h2 style={styles.modalTitle}>Asignar rutina a {alumnoParaRutina?.nombre}</h2>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                            <button 
                                style={{ ...styles.btnGuardar, width: "100%", background: "var(--color-primary-2)" }}
                                onClick={openCrearDeCero}
                            >
                                ✨ Crear rutina desde cero
                            </button>

                            <div style={{ margin: "10px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 500 }}>
                                o usar una plantilla genérica
                            </div>

                            <div style={styles.formField}>
                                <select 
                                    style={styles.formInput}
                                    defaultValue=""
                                    onChange={(e) => handleSelectPlantilla(e.target.value)}
                                >
                                    <option value="" disabled>-- Selecciona una rutina --</option>
                                    {rutinasGenericas.map(rg => (
                                        <option key={rg.id} value={rg.id}>{rg.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ ...styles.modalActions, marginTop: "24px" }}>
                            <button style={styles.btnCancelar} onClick={() => setShowSelectTemplate(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RUTINA EDITOR */}
            {showEditor && (
                <RutinaEditor
                    rutinaInicial={rutinaEditing}
                    titulo={`Rutina de ${alumnoParaRutina?.nombre}`}
                    onClose={() => setShowEditor(false)}
                    onSave={async (rutinaFinal) => {
                        await updateDoc(doc(db, "alumnos", alumnoParaRutina.id), { rutina: rutinaFinal });
                        setShowEditor(false);
                        fetchAlumnos();
                    }}
                />
            )}

            {/* MODAL AGREGAR / EDITAR */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>{editando ? "Editar alumno" : "Nuevo alumno"}</h2>
                        {[
                            { key: "nombre", label: "Nombre", type: "text" },
                            { key: "apellido", label: "Apellido", type: "text" },
                            { key: "edad", label: "Edad", type: "number" },
                            { key: "telefono", label: "Teléfono", type: "text" },
                        ].map(f => (
                            <div key={f.key} style={styles.formField}>
                                <label style={styles.formLabel}>{f.label}</label>
                                <input
                                    type={f.type}
                                    value={form[f.key]}
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    style={styles.formInput}
                                />
                            </div>
                        ))}
                        <div style={styles.formField}>
                            <label style={styles.formLabel}>Metodología</label>
                            <select value={form.metodologia} onChange={e => setForm({ ...form, metodologia: e.target.value })} style={styles.formInput}>
                                {METODOLOGIAS.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div style={styles.modalActions}>
                            <button style={styles.btnCancelar} onClick={() => setShowModal(false)}>Cancelar</button>
                            <button style={styles.btnGuardar} onClick={handleGuardar}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ELIMINAR */}
            {confirmDel && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: "360px", textAlign: "center" }}>
                        <DeleteIcon size={32} color="#c0392b" />
                        <h2 style={{ ...styles.modalTitle, marginTop: "12px" }}>¿Eliminar alumno?</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "8px 0 24px" }}>
                            Vas a eliminar a <strong>{confirmDel.nombre} {confirmDel.apellido}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div style={styles.modalActions}>
                            <button style={styles.btnCancelar} onClick={() => setConfirmDel(null)}>Cancelar</button>
                            <button style={{ ...styles.btnGuardar, background: "#c0392b" }} onClick={() => handleEliminar(confirmDel.id)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
            <p style={styles.statLabel}>{label}</p>
            <p style={{ ...styles.statValue, color }}>{value}</p>
        </div>
    );
}

// Íconos SVG simples
function EditIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}
function RutinaIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
    );
}
function DeleteIcon({ size = 15, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}
function ViewIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

const styles = {
    page: { maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" },
    statCard: { background: "white", borderRadius: "var(--radius-md)", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    statLabel: { fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 8px", fontWeight: "500" },
    statValue: { fontSize: "36px", fontWeight: "700", margin: 0 },
    toolbar: { display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap" },
    search: { flex: "1", minWidth: "200px", padding: "9px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", color: "var(--color-text)", background: "white", outline: "none" },
    filtros: { display: "flex", gap: "8px", flexWrap: "wrap" },
    filtroBtn: { padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border)", background: "white", color: "var(--color-primary)", fontSize: "13px", cursor: "pointer", fontWeight: "500" },
    filtroBtnActive: { background: "var(--color-primary)", color: "white", borderColor: "var(--color-primary)" },
    btnNuevo: { padding: "9px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    tableWrap: { background: "white", borderRadius: "var(--radius-md)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1.5px solid #e8f5ee", background: "#f6fdf9" },
    tr: { borderBottom: "1px solid #f0faf5", transition: "background 0.15s" },
    td: { padding: "13px 16px", fontSize: "14px", color: "var(--color-text)" },
    empty: { padding: "3rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "14px" },
    badge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "500" },
    acciones: { display: "flex", gap: "8px", alignItems: "center" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
    modal: { background: "white", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: "440px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    modalTitle: { fontSize: "18px", fontWeight: "600", color: "var(--color-primary)", margin: "0 0 1.5rem" },
    formField: { marginBottom: "1rem" },
    formLabel: { display: "block", fontSize: "12px", fontWeight: "500", color: "var(--color-primary)", marginBottom: "5px" },
    formInput: { width: "100%", padding: "10px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", color: "var(--color-text)", background: "#f6fdf9", boxSizing: "border-box", outline: "none" },
    modalActions: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "1.5rem" },
    btnCancelar: { padding: "10px 20px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", cursor: "pointer", color: "var(--color-text)" },
    btnGuardar: { padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
};
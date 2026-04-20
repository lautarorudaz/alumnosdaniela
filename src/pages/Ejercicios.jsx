import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase/firestore";

const ETAPAS = ["Movilidad", "Activación", "Trabajo Central"];

const GRUPOS = [
    "Pecho", "Hombro", "Espalda", "Tríceps", "Bíceps",
    "Antebrazo", "Cadera", "Cuádriceps", "Isquiotibiales",
    "Pantorrillas", "Abdomen", "Otros"
];

const emptyForm = {
    nombre: "",
    etapas: [],
    grupos: [],
    youtubeUrl: "",
};

function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    try {
        // Formatos: youtu.be/ID  o  youtube.com/watch?v=ID  o  youtube.com/embed/ID
        const regexps = [
            /youtu\.be\/([^?&]+)/,
            /youtube\.com\/watch\?v=([^&]+)/,
            /youtube\.com\/embed\/([^?&]+)/,
        ];
        for (const re of regexps) {
            const match = url.match(re);
            if (match) return `https://www.youtube.com/embed/${match[1]}`;
        }
    } catch { }
    return null;
}

export default function Ejercicios() {
    const [ejercicios, setEjercicios] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [showFiltros, setShowFiltros] = useState(false);
    const [filtroEtapa, setFiltroEtapa] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [confirmDel, setConfirmDel] = useState(null);

    const fetchEjercicios = async () => {
        const snap = await getDocs(collection(db, "ejercicios"));
        setEjercicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { fetchEjercicios(); }, []);

    const ejerciciosFiltrados = ejercicios.filter(e => {
        const matchNombre = e.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchEtapa = filtroEtapa ? e.etapas?.includes(filtroEtapa) : true;
        const matchGrupo = filtroGrupo ? e.grupos?.includes(filtroGrupo) : true;
        return matchNombre && matchEtapa && matchGrupo;
    });

    const toggleCheck = (key, value) => {
        setForm(prev => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter(v => v !== value)
                : [...prev[key], value],
        }));
    };

    const openNuevo = () => { setForm(emptyForm); setEditando(null); setShowModal(true); };
    const openEditar = (e) => {
        setForm({ nombre: e.nombre, etapas: e.etapas || [], grupos: e.grupos || [], youtubeUrl: e.youtubeUrl || "" });
        setEditando(e.id);
        setShowModal(true);
    };

    const handleGuardar = async () => {
        if (!form.nombre.trim()) return;
        if (editando) {
            await updateDoc(doc(db, "ejercicios", editando), form);
        } else {
            await addDoc(collection(db, "ejercicios"), form);
        }
        setShowModal(false);
        fetchEjercicios();
    };

    const handleEliminar = async (id) => {
        await deleteDoc(doc(db, "ejercicios", id));
        setConfirmDel(null);
        fetchEjercicios();
    };

    const hayFiltros = filtroEtapa || filtroGrupo;

    return (
        <>
            <Navbar />
            <div style={styles.page}>

                {/* HEADER */}
                <div style={styles.header}>
                    <h1 style={styles.titulo}>Ejercicios</h1>
                    <button style={styles.btnNuevo} onClick={openNuevo}>+ Nuevo ejercicio</button>
                </div>

                {/* BARRA BÚSQUEDA + FILTROS */}
                <div style={styles.toolbar}>
                    <div style={styles.searchRow}>
                        <input
                            style={styles.search}
                            type="text"
                            placeholder="🔍  Buscar por nombre..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                        <button
                            style={{ ...styles.btnFiltros, ...(hayFiltros ? styles.btnFiltrosActive : {}) }}
                            onClick={() => setShowFiltros(v => !v)}
                        >
                            <FilterIcon />
                            Filtros
                            {hayFiltros && <span style={styles.filtrosBadge}>!</span>}
                        </button>
                        {hayFiltros && (
                            <button style={styles.btnLimpiar} onClick={() => { setFiltroEtapa(""); setFiltroGrupo(""); }}>
                                Limpiar
                            </button>
                        )}
                    </div>

                    {showFiltros && (
                        <div style={styles.filtrosPanel}>
                            <div style={styles.filtroGrupo}>
                                <p style={styles.filtroLabel}>Etapa</p>
                                <div style={styles.chips}>
                                    {ETAPAS.map(e => (
                                        <button
                                            key={e}
                                            style={{ ...styles.chip, ...(filtroEtapa === e ? styles.chipActive : {}) }}
                                            onClick={() => setFiltroEtapa(filtroEtapa === e ? "" : e)}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={styles.filtroGrupo}>
                                <p style={styles.filtroLabel}>Grupo muscular</p>
                                <div style={styles.chips}>
                                    {GRUPOS.map(g => (
                                        <button
                                            key={g}
                                            style={{ ...styles.chip, ...(filtroGrupo === g ? styles.chipActive : {}) }}
                                            onClick={() => setFiltroGrupo(filtroGrupo === g ? "" : g)}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* GRID DE EJERCICIOS */}
                {ejerciciosFiltrados.length === 0 ? (
                    <div style={styles.empty}>No se encontraron ejercicios.</div>
                ) : (
                    <div style={styles.grid}>
                        {ejerciciosFiltrados.map(e => (
                            <EjercicioCard
                                key={e.id}
                                ejercicio={e}
                                onEditar={() => openEditar(e)}
                                onEliminar={() => setConfirmDel(e)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL NUEVO / EDITAR */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>{editando ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>

                        <div style={styles.formField}>
                            <label style={styles.formLabel}>Nombre del ejercicio *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                style={styles.formInput}
                                placeholder="Ej: Sentadilla con peso"
                            />
                        </div>

                        <div style={styles.formField}>
                            <label style={styles.formLabel}>Etapa</label>
                            <div style={styles.checkGrid}>
                                {ETAPAS.map(e => (
                                    <label key={e} style={styles.checkItem}>
                                        <input
                                            type="checkbox"
                                            checked={form.etapas.includes(e)}
                                            onChange={() => toggleCheck("etapas", e)}
                                            style={{ accentColor: "var(--color-primary)" }}
                                        />
                                        {e}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={styles.formField}>
                            <label style={styles.formLabel}>Grupo muscular</label>
                            <div style={styles.checkGrid}>
                                {GRUPOS.map(g => (
                                    <label key={g} style={styles.checkItem}>
                                        <input
                                            type="checkbox"
                                            checked={form.grupos.includes(g)}
                                            onChange={() => toggleCheck("grupos", g)}
                                            style={{ accentColor: "var(--color-primary)" }}
                                        />
                                        {g}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={styles.formField}>
                            <label style={styles.formLabel}>Link de YouTube</label>
                            <input
                                type="url"
                                value={form.youtubeUrl}
                                onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
                                style={styles.formInput}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
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
                        <h2 style={{ ...styles.modalTitle, marginTop: "12px" }}>¿Eliminar ejercicio?</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "8px 0 24px" }}>
                            Vas a eliminar <strong>{confirmDel.nombre}</strong>. Esta acción no se puede deshacer.
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

// ── CARD ─────────────────────────────────────────────────────────────────────
function EjercicioCard({ ejercicio, onEditar, onEliminar }) {
    const embedUrl = getYoutubeEmbedUrl(ejercicio.youtubeUrl);

    return (
        <div style={styles.card}>
            {/* VIDEO O PLACEHOLDER */}
            <div style={styles.videoWrap}>
                {embedUrl ? (
                    <iframe
                        src={embedUrl}
                        title={ejercicio.nombre}
                        style={styles.iframe}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <div style={styles.videoPlaceholder}>
                        <YoutubeIcon />
                        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>
                            Sin video
                        </span>
                    </div>
                )}
            </div>

            {/* INFO */}
            <div style={styles.cardBody}>
                <p style={styles.cardNombre}>{ejercicio.nombre}</p>

                {ejercicio.etapas?.length > 0 && (
                    <div style={styles.tagsRow}>
                        {ejercicio.etapas.map(e => (
                            <span key={e} style={{ ...styles.tag, ...styles.tagEtapa }}>{e}</span>
                        ))}
                    </div>
                )}

                {ejercicio.grupos?.length > 0 && (
                    <div style={styles.tagsRow}>
                        {ejercicio.grupos.map(g => (
                            <span key={g} style={{ ...styles.tag, ...styles.tagGrupo }}>{g}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* ACCIONES */}
            <div style={styles.cardActions}>
                <button style={styles.iconBtn} title="Editar" onClick={onEditar}><EditIcon /></button>
                <button style={{ ...styles.iconBtn, color: "#c0392b" }} title="Eliminar" onClick={onEliminar}><DeleteIcon /></button>
            </div>
        </div>
    );
}

// ── ÍCONOS ───────────────────────────────────────────────────────────────────
function FilterIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}
function YoutubeIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#ccc" stroke="none" />
        </svg>
    );
}
function EditIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}
function DeleteIcon({ size = 16, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const styles = {
    page: { maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
    titulo: { fontSize: "22px", fontWeight: "600", color: "var(--color-primary)", margin: 0 },
    btnNuevo: { padding: "9px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },

    toolbar: { marginBottom: "1.75rem" },
    searchRow: { display: "flex", gap: "10px", alignItems: "center" },
    search: { flex: 1, padding: "9px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", color: "var(--color-text)", background: "white", outline: "none" },
    btnFiltros: { display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "white", color: "var(--color-primary)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    btnFiltrosActive: { background: "var(--color-primary)", color: "white", borderColor: "var(--color-primary)" },
    filtrosBadge: { background: "var(--color-accent)", color: "white", borderRadius: "50%", width: "16px", height: "16px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" },
    btnLimpiar: { padding: "9px 14px", border: "1.5px solid #e0e0e0", borderRadius: "var(--radius-sm)", background: "white", color: "#999", fontSize: "13px", cursor: "pointer" },

    filtrosPanel: { marginTop: "12px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" },
    filtroGrupo: { display: "flex", flexDirection: "column", gap: "8px" },
    filtroLabel: { fontSize: "12px", fontWeight: "600", color: "var(--color-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" },
    chips: { display: "flex", flexWrap: "wrap", gap: "8px" },
    chip: { padding: "5px 14px", borderRadius: "20px", border: "1.5px solid var(--color-border)", background: "white", color: "var(--color-primary)", fontSize: "13px", cursor: "pointer", fontWeight: "500" },
    chipActive: { background: "var(--color-primary)", color: "white", borderColor: "var(--color-primary)" },

    empty: { textAlign: "center", color: "var(--color-text-muted)", fontSize: "14px", padding: "4rem 0" },

    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" },

    card: { background: "white", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column" },
    videoWrap: { width: "100%", aspectRatio: "16/9", background: "#f6fdf9", position: "relative" },
    iframe: { width: "100%", height: "100%", border: "none", display: "block" },
    videoPlaceholder: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },

    cardBody: { padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" },
    cardNombre: { fontSize: "15px", fontWeight: "600", color: "var(--color-primary)", margin: 0 },
    tagsRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
    tag: { display: "inline-block", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "500" },
    tagEtapa: { background: "#eafaf4", color: "var(--color-primary)" },
    tagGrupo: { background: "#fff8e1", color: "#a07000" },

    cardActions: { padding: "10px 14px", borderTop: "1px solid #f0faf5", display: "flex", gap: "8px", justifyContent: "flex-end" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" },

    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
    modal: { background: "white", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    modalTitle: { fontSize: "18px", fontWeight: "600", color: "var(--color-primary)", margin: "0 0 1.5rem" },
    formField: { marginBottom: "1.25rem" },
    formLabel: { display: "block", fontSize: "12px", fontWeight: "500", color: "var(--color-primary)", marginBottom: "6px" },
    formInput: { width: "100%", padding: "10px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", color: "var(--color-text)", background: "#f6fdf9", boxSizing: "border-box", outline: "none" },
    checkGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" },
    checkItem: { display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", color: "var(--color-text)", cursor: "pointer" },
    modalActions: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "1.5rem" },
    btnCancelar: { padding: "10px 20px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", cursor: "pointer", color: "var(--color-text)" },
    btnGuardar: { padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
};
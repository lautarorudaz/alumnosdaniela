import { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc
} from "firebase/firestore";
import { db } from "../firebase/firestore";

const ETAPAS = ["Movilidad", "Activación", "Trabajo Central"];

const GRUPOS_DEFAULT = [
    "Pecho", "Hombro", "Espalda", "Tríceps", "Bíceps",
    "Antebrazo", "Cadera", "Cuádriceps", "Isquiotibiales",
    "Pantorrillas", "Abdomen", "Otros"
];

const ETAPA_ESTILOS = {
    "Movilidad": { color: "#026842", bg: "#eafaf4", border: "#5ccda7" },
    "Activación": { color: "#a07000", bg: "#fff8e1", border: "#efb810" },
    "Trabajo Central": { color: "#3730a3", bg: "#eef2ff", border: "#a5b4fc" },
};

const emptyForm = {
    nombre: "",
    etapas: [],
    grupos: [],
    youtubeUrl: "",
};

function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    try {
        const urlStr = url.trim();
        if (urlStr.includes("youtube.com/shorts/")) {
            const id = urlStr.split("/shorts/")[1].split(/[?&]/)[0];
            return `https://www.youtube.com/embed/${id}`;
        }
        if (urlStr.includes("youtube.com/watch?v=")) {
            const id = urlStr.split("v=")[1].split(/[?&]/)[0];
            return `https://www.youtube.com/embed/${id}`;
        }
        if (urlStr.includes("youtube.com/embed/")) {
            const id = urlStr.split("/embed/")[1].split(/[?&]/)[0];
            return `https://www.youtube.com/embed/${id}`;
        }
        if (urlStr.includes("youtu.be/")) {
            const id = urlStr.split("youtu.be/")[1].split(/[?&]/)[0];
            return `https://www.youtube.com/embed/${id}`;
        }
    } catch { }
    return null;
}

function useIsMobile(breakpoint = 700) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, [breakpoint]);
    return isMobile;
}

export default function Ejercicios() {
    const isMobile = useIsMobile();
    const [ejercicios, setEjercicios] = useState([]);
    const [grupos, setGrupos] = useState(GRUPOS_DEFAULT);
    const [busqueda, setBusqueda] = useState("");
    const [showFiltros, setShowFiltros] = useState(false);
    const [filtroEtapa, setFiltroEtapa] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [confirmDel, setConfirmDel] = useState(null);
    const [showZonasModal, setShowZonasModal] = useState(false);
    const [seccionesAbiertas, setSeccionesAbiertas] = useState({
        "Movilidad": true,
        "Activación": true,
        "Trabajo Central": true,
    });

    const fetchGrupos = async () => {
        const snap = await getDocs(collection(db, "gruposMusculares"));
        if (snap.empty) {
            // Primera vez: guardar los defaults en Firestore
            for (const nombre of GRUPOS_DEFAULT) {
                await addDoc(collection(db, "gruposMusculares"), { nombre });
            }
            setGrupos(GRUPOS_DEFAULT);
        } else {
            const lista = snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
            lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
            
            const uniqueNombres = [];
            const seen = new Set();
            const duplicates = [];
            
            for (const item of lista) {
                const nombreLower = item.nombre.toLowerCase();
                if (!seen.has(nombreLower)) {
                    seen.add(nombreLower);
                    uniqueNombres.push(item.nombre);
                } else {
                    duplicates.push(item);
                }
            }
            
            setGrupos(uniqueNombres);
            
            // Limpiar duplicados de la base de datos
            duplicates.forEach(async (dup) => {
                try { await deleteDoc(doc(db, "gruposMusculares", dup.id)); } catch (e) { console.error(e); }
            });
        }
    };

    const fetchGruposConId = async () => {
        const snap = await getDocs(collection(db, "gruposMusculares"));
        const lista = snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        const unique = [];
        const seen = new Set();
        
        for (const item of lista) {
            const nombreLower = item.nombre.toLowerCase();
            if (!seen.has(nombreLower)) {
                seen.add(nombreLower);
                unique.push(item);
            }
        }
        return unique;
    };

    const fetchEjercicios = async () => {
        const snap = await getDocs(collection(db, "ejercicios"));
        setEjercicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => {
        fetchEjercicios();
        fetchGrupos();
    }, []);

    const toggleSeccion = (etapa) =>
        setSeccionesAbiertas(prev => ({ ...prev, [etapa]: !prev[etapa] }));

    const ejerciciosFiltrados = ejercicios.filter(e => {
        const matchNombre = e.nombre?.toLowerCase().includes(busqueda.toLowerCase());
        const matchEtapa = filtroEtapa ? e.etapas?.includes(filtroEtapa) : true;
        const matchGrupo = filtroGrupo ? e.grupos?.includes(filtroGrupo) : true;
        return matchNombre && matchEtapa && matchGrupo;
    });

    // Agrupar por etapa — un ejercicio puede aparecer en varias
    const porEtapa = ETAPAS.reduce((acc, etapa) => {
        acc[etapa] = ejerciciosFiltrados.filter(e => e.etapas?.includes(etapa));
        return acc;
    }, {});

    // Ejercicios sin etapa asignada
    const sinEtapa = ejerciciosFiltrados.filter(e => !e.etapas || e.etapas.length === 0);

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
            <div style={S.page}>

                {/* HEADER */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <h1 style={S.titulo}>Ejercicios</h1>
                    <div style={{ display: "flex", gap: "10px", marginTop: isMobile ? "10px" : 0, flexWrap: "wrap" }}>
                        <button style={{ ...S.btnZonas, ...(isMobile ? { flex: 1 } : {}) }} onClick={() => setShowZonasModal(true)}>
                            <MuscleIcon /> Zonas musculares
                        </button>
                        <button style={{ ...S.btnNuevo, ...(isMobile ? { flex: 1 } : {}) }} onClick={openNuevo}>+ Nuevo ejercicio</button>
                    </div>
                </div>

                {/* BARRA BÚSQUEDA + FILTROS */}
                <div style={S.toolbar}>
                    <div style={S.searchRow}>
                        <input
                            style={S.search}
                            type="text"
                            placeholder="🔍  Buscar por nombre..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                        <button
                            style={{ ...S.btnFiltros, ...(hayFiltros ? S.btnFiltrosActive : {}) }}
                            onClick={() => setShowFiltros(v => !v)}
                        >
                            <FilterIcon />
                            Filtros
                            {hayFiltros && <span style={S.filtrosBadge}>!</span>}
                        </button>
                        {hayFiltros && (
                            <button style={S.btnLimpiar} onClick={() => { setFiltroEtapa(""); setFiltroGrupo(""); }}>
                                Limpiar
                            </button>
                        )}
                    </div>

                    {showFiltros && (
                        <div style={S.filtrosPanel}>
                            <div style={S.filtroGrupo}>
                                <p style={S.filtroLabel}>Etapa</p>
                                <div style={S.chips}>
                                    {ETAPAS.map(e => (
                                        <button
                                            key={e}
                                            style={{ ...S.chip, ...(filtroEtapa === e ? S.chipActive : {}) }}
                                            onClick={() => setFiltroEtapa(filtroEtapa === e ? "" : e)}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={S.filtroGrupo}>
                                <p style={S.filtroLabel}>Grupo muscular</p>
                                <div style={S.chips}>
                                    {grupos.map(g => (
                                        <button
                                            key={g}
                                            style={{ ...S.chip, ...(filtroGrupo === g ? S.chipActive : {}) }}
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

                {/* SECCIONES POR ETAPA */}
                {ejerciciosFiltrados.length === 0 ? (
                    <div style={S.empty}>No se encontraron ejercicios.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {ETAPAS.map(etapa => {
                            const lista = porEtapa[etapa];
                            const abierta = seccionesAbiertas[etapa];
                            const estilos = ETAPA_ESTILOS[etapa];
                            return (
                                <div key={etapa} style={{ ...S.seccion, borderColor: estilos.border }}>
                                    {/* Header de sección */}
                                    <button
                                        style={{ ...S.seccionHeader, background: estilos.bg }}
                                        onClick={() => toggleSeccion(etapa)}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{
                                                display: "inline-block",
                                                transition: "transform 0.2s",
                                                transform: abierta ? "rotate(90deg)" : "rotate(0deg)",
                                                color: estilos.color,
                                            }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </span>
                                            <span style={{ ...S.seccionTitulo, color: estilos.color }}>{etapa}</span>
                                            <span style={{ ...S.seccionCount, color: estilos.color }}>
                                                {lista.length} ejercicio{lista.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Grid de ejercicios */}
                                    {abierta && (
                                        lista.length === 0 ? (
                                            <div style={S.seccionEmpty}>
                                                No hay ejercicios de {etapa} todavía.
                                            </div>
                                        ) : (
                                            <div style={S.grid}>
                                                {lista.map(e => (
                                                    <EjercicioCard
                                                        key={e.id}
                                                        ejercicio={e}
                                                        onEditar={() => openEditar(e)}
                                                        onEliminar={() => setConfirmDel(e)}
                                                    />
                                                ))}
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })}

                        {/* Sección "Sin etapa" si hay ejercicios sin clasificar */}
                        {sinEtapa.length > 0 && (
                            <div style={{ ...S.seccion, borderColor: "#e0e0e0" }}>
                                <button
                                    style={{ ...S.seccionHeader, background: "#f5f5f5" }}
                                    onClick={() => toggleSeccion("sin_etapa")}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{
                                            display: "inline-block",
                                            transition: "transform 0.2s",
                                            transform: seccionesAbiertas["sin_etapa"] ? "rotate(90deg)" : "rotate(0deg)",
                                            color: "#888",
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </span>
                                        <span style={{ ...S.seccionTitulo, color: "#888" }}>Sin etapa asignada</span>
                                        <span style={{ ...S.seccionCount, color: "#888" }}>
                                            {sinEtapa.length} ejercicio{sinEtapa.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                </button>
                                {seccionesAbiertas["sin_etapa"] && (
                                    <div style={S.grid}>
                                        {sinEtapa.map(e => (
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
                        )}
                    </div>
                )}
            </div>

            {/* MODAL NUEVO / EDITAR */}
            {showModal && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <h2 style={S.modalTitle}>{editando ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>

                        <div style={S.formField}>
                            <label style={S.formLabel}>Nombre del ejercicio *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                style={S.formInput}
                                placeholder="Ej: Sentadilla con peso"
                            />
                        </div>

                        <div style={S.formField}>
                            <label style={S.formLabel}>Etapa</label>
                            <div style={S.checkGrid}>
                                {ETAPAS.map(e => (
                                    <label key={e} style={S.checkItem}>
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

                        <div style={S.formField}>
                            <label style={S.formLabel}>Grupo muscular</label>
                            <div style={S.checkGrid}>
                                {grupos.map(g => (
                                    <label key={g} style={S.checkItem}>
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

                        <div style={S.formField}>
                            <label style={S.formLabel}>Link de YouTube</label>
                            <input
                                type="url"
                                value={form.youtubeUrl}
                                onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
                                style={S.formInput}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                        </div>

                        <div style={S.modalActions}>
                            <button style={S.btnCancelar} onClick={() => setShowModal(false)}>Cancelar</button>
                            <button style={S.btnGuardar} onClick={handleGuardar}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ELIMINAR */}
            {confirmDel && (
                <div style={S.overlay}>
                    <div style={{ ...S.modal, maxWidth: "360px", textAlign: "center" }}>
                        <DeleteIcon size={32} color="#c0392b" />
                        <h2 style={{ ...S.modalTitle, marginTop: "12px" }}>¿Eliminar ejercicio?</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "8px 0 24px" }}>
                            Vas a eliminar <strong>{confirmDel.nombre}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div style={S.modalActions}>
                            <button style={S.btnCancelar} onClick={() => setConfirmDel(null)}>Cancelar</button>
                            <button style={{ ...S.btnGuardar, background: "#c0392b" }} onClick={() => handleEliminar(confirmDel.id)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ZONAS MUSCULARES */}
            {showZonasModal && (
                <ZonasMusculares
                    onClose={() => { setShowZonasModal(false); fetchGrupos(); }}
                    fetchGruposConId={fetchGruposConId}
                />
            )}
        </>
    );
}

// ── MODAL ZONAS MUSCULARES ───────────────────────────────────────────────────
function ZonasMusculares({ onClose, fetchGruposConId }) {
    const [lista, setLista] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [editandoId, setEditandoId] = useState(null);
    const [editandoNombre, setEditandoNombre] = useState("");
    const [confirmDelZona, setConfirmDelZona] = useState(null);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        fetchGruposConId().then(setLista);
    }, []);

    const handleAgregar = async () => {
        const nombre = nuevoNombre.trim();
        if (!nombre) return;
        if (lista.some(g => g.nombre.toLowerCase() === nombre.toLowerCase())) return;
        setSaving(true);
        const ref = await addDoc(collection(db, "gruposMusculares"), { nombre });
        setLista(prev => [...prev, { id: ref.id, nombre }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNuevoNombre("");
        setSaving(false);
        inputRef.current?.focus();
    };

    const handleRenombrar = async (id) => {
        const nombre = editandoNombre.trim();
        if (!nombre) return;
        setSaving(true);
        await updateDoc(doc(db, "gruposMusculares", id), { nombre });
        setLista(prev => prev.map(g => g.id === id ? { ...g, nombre } : g).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setEditandoId(null);
        setSaving(false);
    };

    const handleEliminarZona = async (id) => {
        setSaving(true);
        await deleteDoc(doc(db, "gruposMusculares", id));
        setLista(prev => prev.filter(g => g.id !== id));
        setConfirmDelZona(null);
        setSaving(false);
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: "480px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <h2 style={{ ...S.modalTitle, margin: 0 }}>Zonas musculares</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#999" }}>✕</button>
                </div>

                {/* Agregar nueva */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
                    <input
                        ref={inputRef}
                        style={{ ...S.formInput, flex: 1, margin: 0 }}
                        placeholder="Nueva zona muscular..."
                        value={nuevoNombre}
                        onChange={e => setNuevoNombre(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAgregar()}
                    />
                    <button
                        style={{ ...S.btnGuardar, padding: "10px 16px", opacity: saving ? 0.6 : 1 }}
                        onClick={handleAgregar}
                        disabled={saving}
                    >
                        + Agregar
                    </button>
                </div>

                {/* Lista */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "340px", overflowY: "auto" }}>
                    {lista.length === 0 && (
                        <p style={{ color: "var(--color-text-muted)", textAlign: "center", fontSize: "13px", padding: "1rem" }}>No hay zonas musculares.</p>
                    )}
                    {lista.map(zona => (
                        <div key={zona.id} style={S.zonaRow}>
                            {editandoId === zona.id ? (
                                <input
                                    autoFocus
                                    style={{ ...S.formInput, flex: 1, margin: 0, padding: "6px 10px" }}
                                    value={editandoNombre}
                                    onChange={e => setEditandoNombre(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") handleRenombrar(zona.id);
                                        if (e.key === "Escape") setEditandoId(null);
                                    }}
                                />
                            ) : (
                                <span style={{ flex: 1, fontSize: "14px", color: "var(--color-text)" }}>{zona.nombre}</span>
                            )}
                            <div style={{ display: "flex", gap: "6px" }}>
                                {editandoId === zona.id ? (
                                    <>
                                        <button style={S.zonaBtn} onClick={() => handleRenombrar(zona.id)} disabled={saving}>✓</button>
                                        <button style={{ ...S.zonaBtn, color: "#999" }} onClick={() => setEditandoId(null)}>✕</button>
                                    </>
                                ) : (
                                    <>
                                        <button style={S.zonaBtn} title="Renombrar" onClick={() => { setEditandoId(zona.id); setEditandoNombre(zona.nombre); }}>
                                            <EditIcon />
                                        </button>
                                        <button style={{ ...S.zonaBtn, color: "#c0392b" }} title="Eliminar" onClick={() => setConfirmDelZona(zona)}>
                                            <DeleteIcon />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ ...S.modalActions, marginTop: "1.25rem" }}>
                    <button style={S.btnCancelar} onClick={onClose}>Cerrar</button>
                </div>

                {/* Confirm eliminar zona */}
                {confirmDelZona && (
                    <div style={{ ...S.overlay, borderRadius: "var(--radius-lg)" }}>
                        <div style={{ ...S.modal, maxWidth: "340px", textAlign: "center" }}>
                            <DeleteIcon size={28} color="#c0392b" />
                            <h3 style={{ color: "var(--color-primary)", margin: "12px 0 8px" }}>¿Eliminar zona?</h3>
                            <p style={{ color: "var(--color-text-muted)", fontSize: "13px", margin: "0 0 20px" }}>
                                Vas a eliminar <strong>{confirmDelZona.nombre}</strong>. Los ejercicios que la tengan asignada no serán afectados.
                            </p>
                            <div style={S.modalActions}>
                                <button style={S.btnCancelar} onClick={() => setConfirmDelZona(null)}>Cancelar</button>
                                <button style={{ ...S.btnGuardar, background: "#c0392b" }} onClick={() => handleEliminarZona(confirmDelZona.id)} disabled={saving}>Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── CARD ─────────────────────────────────────────────────────────────────────
function EjercicioCard({ ejercicio, onEditar, onEliminar }) {
    const [showVideo, setShowVideo] = useState(false);
    const embedUrl = getYoutubeEmbedUrl(ejercicio.youtubeUrl);

    return (
        <div style={S.card}>
            <div style={S.videoWrap}>
                {embedUrl ? (
                    showVideo ? (
                        <iframe
                            src={embedUrl}
                            title={ejercicio.nombre}
                            style={S.iframe}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <div style={S.videoPlaceholder}>
                            <YoutubeIcon />
                            <button onClick={() => setShowVideo(true)} style={S.btnPreview}>
                                Ver Preview
                            </button>
                        </div>
                    )
                ) : (
                    <div style={S.videoPlaceholder}>
                        <YoutubeIcon />
                        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>
                            Sin video
                        </span>
                    </div>
                )}
            </div>

            <div style={S.cardBody}>
                <p style={S.cardNombre}>{ejercicio.nombre}</p>
                {ejercicio.grupos?.length > 0 && (
                    <div style={S.tagsRow}>
                        {ejercicio.grupos.map(g => (
                            <span key={g} style={{ ...S.tag, ...S.tagGrupo }}>{g}</span>
                        ))}
                    </div>
                )}
            </div>

            <div style={S.cardActions}>
                <button style={S.iconBtn} title="Editar" onClick={onEditar}><EditIcon /></button>
                <button style={{ ...S.iconBtn, color: "#c0392b" }} title="Eliminar" onClick={onEliminar}><DeleteIcon /></button>
            </div>
        </div>
    );
}

// ── ÍCONOS ───────────────────────────────────────────────────────────────────
function FilterIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
}
function MuscleIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>;
}
function YoutubeIcon() {
    return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#ccc" stroke="none" /></svg>;
}
function EditIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function DeleteIcon({ size = 16, color = "currentColor" }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const S = {
    page: { maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
    titulo: { fontSize: "22px", fontWeight: "600", color: "var(--color-primary)", margin: 0 },
    btnNuevo: { padding: "9px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    btnZonas: { display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "white", color: "var(--color-primary)", border: "1.5px solid var(--color-primary)", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    zonaRow: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#f6fdf9", borderRadius: "var(--radius-sm)", border: "1px solid #e8f5ee" },
    zonaBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", fontSize: "14px" },

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

    // Secciones por etapa
    seccion: { border: "1.5px solid", borderRadius: "var(--radius-md)", overflow: "hidden", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
    seccionHeader: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", border: "none", cursor: "pointer", textAlign: "left" },
    seccionTitulo: { fontSize: "14px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" },
    seccionCount: { fontSize: "12px", fontWeight: "500", opacity: 0.75, marginLeft: 4 },
    seccionEmpty: { padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px", background: "#fafafa" },

    empty: { textAlign: "center", color: "var(--color-text-muted)", fontSize: "14px", padding: "4rem 0" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", padding: "16px", background: "#fafdfc" },

    card: { background: "white", borderRadius: "var(--radius-sm)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", border: "1px solid #e8f5ee" },
    videoWrap: { width: "100%", aspectRatio: "16/9", background: "#f6fdf9", position: "relative" },
    iframe: { width: "100%", height: "100%", border: "none", display: "block" },
    videoPlaceholder: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },

    cardBody: { padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" },
    cardNombre: { fontSize: "14px", fontWeight: "600", color: "var(--color-primary)", margin: 0 },
    tagsRow: { display: "flex", flexWrap: "wrap", gap: "5px" },
    tag: { display: "inline-block", padding: "2px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: "500" },
    tagGrupo: { background: "#fff8e1", color: "#a07000" },

    cardActions: { padding: "8px 12px", borderTop: "1px solid #f0faf5", display: "flex", gap: "8px", justifyContent: "flex-end" },
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
    btnPreview: { marginTop: "12px", padding: "6px 16px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer", fontWeight: "600" },
};
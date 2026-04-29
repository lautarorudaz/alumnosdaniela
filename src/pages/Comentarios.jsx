import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/firestore";

export default function Comentarios() {
    const [tab, setTab] = useState("comentarios"); // "comentarios" | "progreso"

    // ── Comentarios ──────────────────────────────────────────────────────────
    const [comentarios, setComentarios] = useState([]);
    const [cargandoCom, setCargandoCom] = useState(true);
    const [filtro, setFiltro] = useState("todos");
    const [busqueda, setBusqueda] = useState("");
    const [confirmDel, setConfirmDel] = useState(null);

    // ── Progreso ─────────────────────────────────────────────────────────────
    const [seguimientos, setSeguimientos] = useState([]);
    const [cargandoSeg, setCargandoSeg] = useState(true);
    const [alumnoAbierto, setAlumnoAbierto] = useState(null);

    const navigate = useNavigate();

    const fetchComentarios = async () => {
        setCargandoCom(true);
        try {
            const q = query(collection(db, "comentarios"), orderBy("fecha", "desc"));
            const snap = await getDocs(q);
            setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
            const snap = await getDocs(collection(db, "comentarios"));
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
            setComentarios(docs);
        } finally {
            setCargandoCom(false);
        }
    };

    const fetchSeguimientos = async () => {
        setCargandoSeg(true);
        try {
            const q = query(collection(db, "seguimientos"), orderBy("fecha", "desc"));
            const snap = await getDocs(q);
            setSeguimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
            const snap = await getDocs(collection(db, "seguimientos"));
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
            setSeguimientos(docs);
        } finally {
            setCargandoSeg(false);
        }
    };

    useEffect(() => {
        fetchComentarios();
        fetchSeguimientos();
    }, []);

    // ── Helpers comentarios ──────────────────────────────────────────────────
    const marcarLeido = async (id) => {
        await updateDoc(doc(db, "comentarios", id), { leido: true });
        setComentarios(prev => prev.map(c => c.id === id ? { ...c, leido: true } : c));
    };

    const handleEliminar = async (id) => {
        await deleteDoc(doc(db, "comentarios", id));
        setConfirmDel(null);
        setComentarios(prev => prev.filter(c => c.id !== id));
    };

    const comentariosFiltrados = comentarios.filter(c => {
        const matchBusqueda = c.alumnoNombre?.toLowerCase().includes(busqueda.toLowerCase());
        const matchFiltro =
            filtro === "todos" ? true :
                filtro === "nuevos" ? !c.leido :
                    filtro === "leidos" ? !!c.leido : true;
        return matchBusqueda && matchFiltro;
    });

    const noLeidos = comentarios.filter(c => !c.leido).length;

    // ── Helpers progreso ─────────────────────────────────────────────────────
    // Agrupar seguimientos por alumno
    const porAlumno = seguimientos.reduce((acc, s) => {
        const key = s.alumnoId;
        if (!acc[key]) acc[key] = { alumnoId: s.alumnoId, alumnoNombre: s.alumnoNombre, registros: [] };
        acc[key].registros.push(s);
        return acc;
    }, {});
    const alumnosConProgreso = Object.values(porAlumno);

    // Agrupar registros de un alumno por ejercicio
    const agruparPorEjercicio = (registros) =>
        registros.reduce((acc, r) => {
            if (!acc[r.ejercicioNombre]) acc[r.ejercicioNombre] = [];
            acc[r.ejercicioNombre].push(r);
            return acc;
        }, {});

    const formatFecha = (ts) => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <>
            <Navbar />
            <div style={S.page}>

                {/* ── TABS ─────────────────────────────────────────────────── */}
                <div style={S.tabs}>
                    <button
                        style={{ ...S.tab, ...(tab === "comentarios" ? S.tabActive : {}) }}
                        onClick={() => setTab("comentarios")}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Comentarios
                        {noLeidos > 0 && <span style={S.tabBadge}>{noLeidos}</span>}
                    </button>
                    <button
                        style={{ ...S.tab, ...(tab === "progreso" ? S.tabActive : {}) }}
                        onClick={() => setTab("progreso")}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Progreso
                        {alumnosConProgreso.length > 0 && (
                            <span style={{ ...S.tabBadge, background: "var(--color-primary)" }}>
                                {alumnosConProgreso.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── TAB: COMENTARIOS ─────────────────────────────────────── */}
                {tab === "comentarios" && (
                    <>
                        <div style={S.statsGrid}>
                            <div style={{ ...S.statCard, borderTop: "4px solid var(--color-primary)" }}>
                                <p style={S.statLabel}>Total comentarios</p>
                                <p style={{ ...S.statValue, color: "var(--color-primary)" }}>{comentarios.length}</p>
                            </div>
                            <div style={{ ...S.statCard, borderTop: "4px solid var(--color-accent)" }}>
                                <p style={S.statLabel}>Sin leer</p>
                                <p style={{ ...S.statValue, color: "var(--color-accent)" }}>{noLeidos}</p>
                            </div>
                        </div>

                        <div style={S.toolbar}>
                            <input
                                style={S.search}
                                type="text"
                                placeholder="🔍  Buscar por alumno..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                            />
                            <div style={S.filtros}>
                                {[
                                    { key: "todos", label: "Todos" },
                                    { key: "nuevos", label: `Sin leer${noLeidos > 0 ? ` (${noLeidos})` : ""}` },
                                    { key: "leidos", label: "Leídos" },
                                ].map(f => (
                                    <button key={f.key} onClick={() => setFiltro(f.key)}
                                        style={{ ...S.filtroBtn, ...(filtro === f.key ? S.filtroBtnActive : {}) }}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {cargandoCom ? (
                            <div style={S.empty}>Cargando comentarios...</div>
                        ) : comentariosFiltrados.length === 0 ? (
                            <div style={S.emptyBox}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5ccda7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 12 }}>
                                    {filtro === "nuevos" ? "No hay comentarios sin leer." : "No hay comentarios todavía."}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {comentariosFiltrados.map(c => (
                                    <div key={c.id} style={{ ...S.comentarioCard, ...(c.leido ? {} : S.comentarioCardNuevo) }}>
                                        <div style={S.comentarioTop}>
                                            <div style={S.comentarioMeta}>
                                                <div style={S.avatar}>{c.alumnoNombre?.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <p style={S.alumnoNombreTxt}>{c.alumnoNombre}</p>
                                                    <p style={S.ubicacion}>
                                                        {c.semana} · {c.dia}
                                                        {c.fecha && <span style={{ marginLeft: 8, color: "var(--color-text-muted)", fontWeight: 400 }}>· {formatFecha(c.fecha)}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={S.accionesCol}>
                                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    {!c.leido && <span style={S.badgeNuevo}>Nuevo</span>}
                                                    {!c.leido && (
                                                        <button style={S.iconBtn} title="Marcar como leído" onClick={() => marcarLeido(c.id)}>
                                                            <CheckIcon />
                                                        </button>
                                                    )}
                                                    <button style={{ ...S.iconBtn, color: "#c0392b" }} title="Eliminar" onClick={() => setConfirmDel(c)}>
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                                {c.alumnoId && (
                                                    <button style={S.btnRutina} onClick={() => navigate(`/inicio?alumnoId=${c.alumnoId}`)}>
                                                        Ir a la rutina
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p style={S.comentarioTexto}>"{c.texto}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── TAB: PROGRESO ────────────────────────────────────────── */}
                {tab === "progreso" && (
                    <>
                        <div style={S.statsGrid}>
                            <div style={{ ...S.statCard, borderTop: "4px solid var(--color-primary)" }}>
                                <p style={S.statLabel}>Alumnos con registros</p>
                                <p style={{ ...S.statValue, color: "var(--color-primary)" }}>{alumnosConProgreso.length}</p>
                            </div>
                            <div style={{ ...S.statCard, borderTop: "4px solid var(--color-primary-2)" }}>
                                <p style={S.statLabel}>Total registros</p>
                                <p style={{ ...S.statValue, color: "var(--color-primary-2)" }}>{seguimientos.length}</p>
                            </div>
                        </div>

                        {cargandoSeg ? (
                            <div style={S.empty}>Cargando progreso...</div>
                        ) : alumnosConProgreso.length === 0 ? (
                            <div style={S.emptyBox}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5ccda7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                                <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 12 }}>
                                    Todavía no hay registros de progreso.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {alumnosConProgreso.map(alumno => {
                                    const abierto = alumnoAbierto === alumno.alumnoId;
                                    const porEjercicio = agruparPorEjercicio(alumno.registros);

                                    return (
                                        <div key={alumno.alumnoId} style={S.alumnoCard}>

                                            {/* Header alumno clickeable */}
                                            <button
                                                style={S.alumnoHeader}
                                                onClick={() => setAlumnoAbierto(abierto ? null : alumno.alumnoId)}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <div style={S.avatar}>{alumno.alumnoNombre?.charAt(0).toUpperCase()}</div>
                                                    <div style={{ textAlign: "left" }}>
                                                        <p style={S.alumnoNombreTxt}>{alumno.alumnoNombre}</p>
                                                        <p style={S.ubicacion}>
                                                            {Object.keys(porEjercicio).length} ejercicio{Object.keys(porEjercicio).length !== 1 ? "s" : ""} · {alumno.registros.length} entrada{alumno.registros.length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronIcon open={abierto} />
                                            </button>

                                            {/* Detalle */}
                                            {abierto && (
                                                <div style={S.alumnoDetalle}>
                                                    {Object.entries(porEjercicio).map(([ejercicioNombre, entradas]) => (
                                                        <div key={ejercicioNombre} style={S.ejercicioBloque}>
                                                            <p style={S.ejercicioTitulo}>{ejercicioNombre}</p>
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                                {[...entradas]
                                                                    .sort((a, b) => {
                                                                        const numA = parseInt(a.semana?.replace(/\D/g, "") || "0");
                                                                        const numB = parseInt(b.semana?.replace(/\D/g, "") || "0");
                                                                        return numA - numB;
                                                                    })
                                                                    .map(entrada => (
                                                                        <div key={entrada.id} style={S.entradaRow}>
                                                                            <div style={S.entradaMeta}>
                                                                                <span style={S.semanaTag}>{entrada.semana}</span>
                                                                                <span style={S.diaTag}>{entrada.dia}</span>
                                                                            </div>
                                                                            <p style={S.entradaTexto}>"{entrada.texto}"</p>
                                                                            {entrada.fecha && (
                                                                                <p style={S.entradaFecha}>{formatFecha(entrada.fecha)}</p>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CONFIRMAR ELIMINAR */}
            {confirmDel && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <DeleteIcon size={32} color="#c0392b" />
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-primary)", margin: "12px 0 8px" }}>¿Eliminar comentario?</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: "0 0 24px" }}>Esta acción no se puede deshacer.</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button style={S.btnCancelar} onClick={() => setConfirmDel(null)}>Cancelar</button>
                            <button style={{ ...S.btnGuardar, background: "#c0392b" }} onClick={() => handleEliminar(confirmDel.id)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function CheckIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function DeleteIcon({ size = 15, color = "currentColor" }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}
function ChevronIcon({ open }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

const S = {
    page: { maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" },

    // Tabs
    tabs: { display: "flex", gap: 4, marginBottom: "1.75rem", borderBottom: "2px solid #e8f5ee" },
    tab: { display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "none", border: "none", borderBottom: "3px solid transparent", marginBottom: "-2px", fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)", cursor: "pointer" },
    tabActive: { color: "var(--color-primary)", borderBottomColor: "var(--color-primary)" },
    tabBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, borderRadius: 20, background: "var(--color-accent)", color: "white", fontSize: 11, fontWeight: 700, padding: "0 5px" },

    statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.75rem" },
    statCard: { background: "white", borderRadius: "var(--radius-md)", padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    statLabel: { fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 6px", fontWeight: 500 },
    statValue: { fontSize: 34, fontWeight: 700, margin: 0 },
    toolbar: { display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap" },
    search: { flex: 1, minWidth: 200, padding: "9px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, color: "var(--color-text)", background: "white", outline: "none" },
    filtros: { display: "flex", gap: 8 },
    filtroBtn: { padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border)", background: "white", color: "var(--color-primary)", fontSize: 13, cursor: "pointer", fontWeight: 500 },
    filtroBtnActive: { background: "var(--color-primary)", color: "white", borderColor: "var(--color-primary)" },
    empty: { textAlign: "center", color: "var(--color-text-muted)", fontSize: 14, padding: "3rem 0" },
    emptyBox: { textAlign: "center", padding: "3rem 0", display: "flex", flexDirection: "column", alignItems: "center" },

    // Comentarios
    comentarioCard: { background: "white", borderRadius: "var(--radius-md)", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #e8f5ee" },
    comentarioCardNuevo: { borderLeft: "4px solid var(--color-accent)", background: "#fffdf4" },
    comentarioTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
    comentarioMeta: { display: "flex", alignItems: "center", gap: 10 },
    comentarioTexto: { fontSize: 14, color: "var(--color-text)", lineHeight: 1.6, margin: 0, fontStyle: "italic" },
    accionesCol: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
    badgeNuevo: { display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#fff8e1", color: "#a07000" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
    btnRutina: { background: "#eafaf4", border: "1px solid var(--color-primary)", color: "var(--color-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "4px 10px", borderRadius: 6, marginTop: 2 },

    // Progreso
    alumnoCard: { background: "white", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1.5px solid #e8f5ee" },
    alumnoHeader: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)" },
    alumnoDetalle: { padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid #f0faf5" },
    ejercicioBloque: { paddingTop: 14 },
    ejercicioTitulo: { fontSize: 13, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px", borderBottom: "1px dashed #d0f0e4", paddingBottom: 6 },
    entradaRow: { background: "#f6fdf9", borderRadius: 8, padding: "10px 12px", border: "1px solid #e0f5ec" },
    entradaMeta: { display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" },
    semanaTag: { display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#eafaf4", color: "var(--color-primary)" },
    diaTag: { display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#fff8e1", color: "#a07000" },
    entradaTexto: { fontSize: 13, color: "var(--color-text)", lineHeight: 1.5, margin: "0 0 4px", fontStyle: "italic" },
    entradaFecha: { fontSize: 11, color: "var(--color-text-muted)", margin: 0 },

    // Compartidos
    avatar: { width: 36, height: 36, borderRadius: "50%", background: "#eafaf4", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, flexShrink: 0 },
    alumnoNombreTxt: { fontSize: 14, fontWeight: 600, color: "var(--color-primary)", margin: "0 0 2px" },
    ubicacion: { fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500, margin: 0 },

    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
    modal: { background: "white", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    btnCancelar: { padding: "10px 20px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, cursor: "pointer", color: "var(--color-text)" },
    btnGuardar: { padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
};
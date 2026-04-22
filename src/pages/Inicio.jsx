import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firestore";
import RutinaEditor, { emptyRutina } from "../components/RutinaEditor";
import { generateId } from "../utils/uuid";
import "./Inicio.css";

const METODOLOGIAS = ["Presencial", "A distancia", "Híbrido"];

const emptyForm = {
    nombre: "", apellido: "", edad: "", metodologia: "Presencial", telefono: "54",
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

    const [alumnoParaRutina, setAlumnoParaRutina] = useState(null);
    const [showSelectTemplate, setShowSelectTemplate] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [rutinaEditing, setRutinaEditing] = useState(null);

    // Compartir
    const [alumnoCompartir, setAlumnoCompartir] = useState(null);
    const [copiadoOk, setCopiadoOk] = useState(false);
    const [showFiltros, setShowFiltros] = useState(false);

    const fetchAlumnos = async () => {
        const snap = await getDocs(collection(db, "alumnos"));
        setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        const rSnap = await getDocs(collection(db, "rutinas"));
        setRutinasGenericas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { fetchAlumnos(); }, []);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const alumnoId = params.get("alumnoId");
        if (alumnoId && alumnos.length > 0) {
            const a = alumnos.find(al => al.id === alumnoId);
            if (a && a.rutina) {
                setAlumnoParaRutina(a);
                setRutinaEditing(a.rutina);
                setShowEditor(true);
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    }, [alumnos]);

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
    const openEditar = (a) => {
        setForm({ nombre: a.nombre, apellido: a.apellido, edad: a.edad, metodologia: a.metodologia, telefono: a.telefono });
        setEditando(a.id);
        setShowModal(true);
    };

    const handleGuardar = async () => {
        if (!form.nombre || !form.apellido) return;
        if (editando) {
            await updateDoc(doc(db, "alumnos", editando), form);
        } else {
            const token = generateId().replace(/-/g, "").slice(0, 12);
            await addDoc(collection(db, "alumnos"), { ...form, rutina: null, tokenRutina: token });
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

    const getUrlRutina = (alumno) => {
        const token = alumno.tokenRutina || alumno.id;
        return `${window.location.origin}/rutina/${token}`;
    };

    const handleCopiarLink = async (alumno) => {
        try {
            await navigator.clipboard.writeText(getUrlRutina(alumno));
            setCopiadoOk(true);
            setTimeout(() => setCopiadoOk(false), 2000);
        } catch {
            const el = document.createElement("textarea");
            el.value = getUrlRutina(alumno);
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopiadoOk(true);
            setTimeout(() => setCopiadoOk(false), 2000);
        }
    };

    const handleWhatsApp = (alumno) => {
        const url = getUrlRutina(alumno);
        const texto = `Hola ${alumno.nombre}! 👋 Te comparto tu rutina de entrenamiento: ${url}`;
        const waUrl = `https://wa.me/${alumno.telefono?.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
        window.open(waUrl, "_blank");
    };

    return (
        <>
            <Navbar />
            <div className="inicio-page" style={styles.page}>

                <div className="inicio-stats-grid">
                    <StatCard label="Total alumnos" value={totalAlumnos} color="var(--color-primary)" />
                    <StatCard label="Con rutina" value={conRutina} color="var(--color-primary-2)" />
                    <StatCard label="Sin rutina" value={sinRutina} color="var(--color-accent)" />
                </div>

                <div className="inicio-toolbar">
                    <div className="toolbar-main-row">
                        <input
                            className="inicio-search"
                            type="text"
                            placeholder="🔍 Buscar por nombre..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                        <button 
                            className={`btn-toggle-filtros ${filtro !== 'todos' ? 'active' : ''}`}
                            onClick={() => setShowFiltros(!showFiltros)}
                        >
                            <FilterIcon />
                            <span>Filtros</span>
                        </button>
                    </div>

                    <div className={`inicio-filtros-panel ${showFiltros ? 'open' : ''}`}>
                        {[
                            { key: "todos", label: "Todos" },
                            { key: "con_rutina", label: "Con rutina" },
                            { key: "sin_rutina", label: "Sin rutina" },
                            { key: "a_distancia", label: "A distancia" },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => { setFiltro(f.key); setShowFiltros(false); }}
                                className={`filtro-btn ${filtro === f.key ? 'active' : ''}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    
                    <button className="btn-nuevo-alumno" onClick={openNuevo}>+ Nuevo alumno</button>
                </div>

                {/* VISTA DESKTOP */}
                <div className="table-desktop">
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
                                                <button title="Editar" style={styles.iconBtn} onClick={() => openEditar(a)}><EditIcon /></button>
                                                {a.rutina ? (
                                                    <button title="Ver Rutina" style={{ ...styles.iconBtn, color: "var(--color-primary)" }} onClick={() => {
                                                        setAlumnoParaRutina(a);
                                                        setRutinaEditing(a.rutina);
                                                        setShowEditor(true);
                                                    }}><ViewIcon /></button>
                                                ) : (
                                                    <button title="Asignar" style={{ ...styles.iconBtn, color: "var(--color-primary-2)" }} onClick={() => {
                                                        setAlumnoParaRutina(a);
                                                        setShowSelectTemplate(true);
                                                    }}><RutinaIcon /></button>
                                                )}
                                                {a.rutina && (
                                                    <button title="Compartir" style={{ ...styles.iconBtn, color: "#25a244" }} onClick={() => { setAlumnoCompartir(a); setCopiadoOk(false); }}><ShareIcon /></button>
                                                )}
                                                <button title="Eliminar" style={{ ...styles.iconBtn, color: "#c0392b" }} onClick={() => setConfirmDel(a)}><DeleteIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* VISTA MOBILE */}
                <div className="alumnos-list-mobile">
                    {alumnosFiltrados.length === 0 ? (
                        <div style={styles.empty}>No se encontraron alumnos.</div>
                    ) : alumnosFiltrados.map(a => (
                        <div key={a.id} className="alumno-card-mobile">
                            <div className="alumno-mobile-header">
                                <p className="alumno-mobile-name">{a.nombre} {a.apellido}</p>
                                <span style={{ ...styles.badge, background: a.rutina ? "#eafaf4" : "#fff8e1", color: a.rutina ? "var(--color-primary)" : "#a07000" }}>
                                    {a.rutina ? "Con rutina asignada" : "Sin rutina asignada"}
                                </span>
                            </div>

                            <div className="alumno-mobile-info">
                                <div className="info-item">
                                    <p className="alumno-mobile-label">Teléfono</p>
                                    <p className="alumno-mobile-value">{a.telefono || "-"}</p>
                                </div>
                                <div className="info-item">
                                    <p className="alumno-mobile-label">Metodología</p>
                                    <p className="alumno-mobile-value">{a.metodologia}</p>
                                </div>
                            </div>

                            <div className="alumno-mobile-actions">
                                <button title="Editar" style={styles.iconBtn} onClick={() => openEditar(a)}>
                                    <EditIcon />
                                </button>
                                
                                {a.rutina ? (
                                    <>
                                        <button title="Ver Rutina" style={{ ...styles.iconBtn, color: "var(--color-primary)" }} onClick={() => {
                                            setAlumnoParaRutina(a);
                                            setRutinaEditing(a.rutina);
                                            setShowEditor(true);
                                        }}>
                                            <ViewIcon />
                                        </button>
                                        <button title="Compartir" style={{ ...styles.iconBtn, color: "#25a244" }} onClick={() => { setAlumnoCompartir(a); setCopiadoOk(false); }}>
                                            <ShareIcon />
                                        </button>
                                    </>
                                ) : (
                                    <button title="Asignar" style={{ ...styles.iconBtn, color: "var(--color-primary-2)" }} onClick={() => {
                                        setAlumnoParaRutina(a);
                                        setShowSelectTemplate(true);
                                    }}>
                                        <RutinaIcon />
                                    </button>
                                )}
                                
                                <button title="Eliminar" style={{ ...styles.iconBtn, color: "#c0392b" }} onClick={() => setConfirmDel(a)}>
                                    <DeleteIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            {alumnoCompartir && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: 420 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                            <h2 style={{ ...styles.modalTitle, margin: 0 }}>Compartir</h2>
                            <button style={styles.btnClose} onClick={() => setAlumnoCompartir(null)}>✕</button>
                        </div>
                        <div style={styles.urlBox}>{getUrlRutina(alumnoCompartir)}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <button style={{ ...styles.btnShare, background: copiadoOk ? "#25a244" : "var(--color-primary)" }} onClick={() => handleCopiarLink(alumnoCompartir)}>
                                {copiadoOk ? "¡Copiado!" : "Copiar link"}
                            </button>
                            <button style={{ ...styles.btnShare, background: "#25D366" }} onClick={() => handleWhatsApp(alumnoCompartir)}>WhatsApp</button>
                        </div>
                    </div>
                </div>
            )}

            {showSelectTemplate && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: "400px" }}>
                        <h2 style={styles.modalTitle}>Asignar rutina</h2>
                        <button style={{ ...styles.btnGuardar, width: "100%", background: "var(--color-primary-2)", marginBottom: 12 }} onClick={openCrearDeCero}>✨ Crear desde cero</button>
                        <select style={styles.formInput} defaultValue="" onChange={(e) => handleSelectPlantilla(e.target.value)}>
                            <option value="" disabled>-- Selecciona plantilla --</option>
                            {rutinasGenericas.map(rg => <option key={rg.id} value={rg.id}>{rg.nombre}</option>)}
                        </select>
                        <div style={styles.modalActions}><button style={styles.btnCancelar} onClick={() => setShowSelectTemplate(false)}>Cancelar</button></div>
                    </div>
                </div>
            )}

            {showEditor && (
                <RutinaEditor
                    rutinaInicial={rutinaEditing}
                    titulo={`Rutina de ${alumnoParaRutina?.nombre}`}
                    onClose={() => setShowEditor(false)}
                    onSave={async (rutinaFinal) => {
                        const updates = { rutina: rutinaFinal };
                        if (!alumnoParaRutina.tokenRutina) updates.tokenRutina = generateId().replace(/-/g, "").slice(0, 12);
                        await updateDoc(doc(db, "alumnos", alumnoParaRutina.id), updates);
                        setShowEditor(false);
                        fetchAlumnos();
                    }}
                />
            )}

            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>{editando ? "Editar alumno" : "Nuevo alumno"}</h2>
                        {[{ key: "nombre", label: "Nombre" }, { key: "apellido", label: "Apellido" }, { key: "edad", label: "Edad", type: "number" }, { key: "telefono", label: "Teléfono" }].map(f => (
                            <div key={f.key} style={styles.formField}>
                                <label style={styles.formLabel}>{f.label}</label>
                                <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={styles.formInput} />
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

            {confirmDel && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: "360px", textAlign: "center" }}>
                        <DeleteIcon size={32} color="#c0392b" />
                        <h2 style={{ ...styles.modalTitle, marginTop: "12px" }}>¿Eliminar?</h2>
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

function EditIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function RutinaIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></svg>; }
function ViewIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }
function ShareIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>; }
function CopyIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>; }
function WhatsAppIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>; }
function DeleteIcon({ size = 15, color = "currentColor" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>; }

function FilterIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}

const styles = {
    page: { maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" },
    statCard: { background: "white", borderRadius: "var(--radius-md)", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    statLabel: { fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 8px", fontWeight: "500" },
    statValue: { fontSize: "36px", fontWeight: "700", margin: 0 },
    search: { padding: "9px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", color: "var(--color-text)", background: "white", outline: "none" },
    filtroBtn: { padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border)", background: "white", color: "var(--color-primary)", fontSize: "13px", cursor: "pointer", fontWeight: "500" },
    filtroBtnActive: { background: "var(--color-primary)", color: "white", borderColor: "var(--color-primary)" },
    btnNuevo: { padding: "9px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    tableWrap: { background: "white", borderRadius: "var(--radius-md)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1.5px solid #e8f5ee", background: "#f6fdf9" },
    tr: { borderBottom: "1px solid #f0faf5" },
    td: { padding: "13px 16px", fontSize: "14px", color: "var(--color-text)" },
    empty: { padding: "3rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "14px" },
    badge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "500" },
    acciones: { display: "flex", gap: "8px", alignItems: "center" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
    modal: { background: "white", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: "440px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    modalTitle: { fontSize: "18px", fontWeight: "600", color: "var(--color-primary)", margin: "0 0 1.5rem" },
    btnClose: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-muted)", lineHeight: 1 },
    formField: { marginBottom: "1rem" },
    formLabel: { display: "block", fontSize: "12px", fontWeight: "500", color: "var(--color-primary)", marginBottom: "5px" },
    formInput: { width: "100%", padding: "10px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", color: "var(--color-text)", background: "#f6fdf9", boxSizing: "border-box", outline: "none" },
    modalActions: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "1.5rem" },
    btnCancelar: { padding: "10px 20px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "14px", cursor: "pointer", color: "var(--color-text)" },
    btnGuardar: { padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    shareLabel: { fontSize: 12, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 6px" },
    urlBox: { background: "#f6fdf9", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "var(--color-text-muted)", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 14 },
    btnShare: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", borderRadius: "var(--radius-sm)", border: "none", color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" },
};
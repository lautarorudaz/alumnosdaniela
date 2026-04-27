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
    const [editando, setEditando] = useState(null); // objeto alumno completo
    const [form, setForm] = useState(emptyForm);
    const [confirmDel, setConfirmDel] = useState(null);
    const [confirmQuitarRutina, setConfirmQuitarRutina] = useState(null);

    const [alumnoParaRutina, setAlumnoParaRutina] = useState(null);
    const [showSelectTemplate, setShowSelectTemplate] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [rutinaEditing, setRutinaEditing] = useState(null);

    const [alumnoCompartir, setAlumnoCompartir] = useState(null);
    const [copiadoOk, setCopiadoOk] = useState(false);

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

    const openNuevo = () => {
        setForm(emptyForm);
        setEditando(null);
        setShowModal(true);
    };

    const openEditar = (a) => {
        setForm({ nombre: a.nombre, apellido: a.apellido, edad: a.edad, metodologia: a.metodologia, telefono: a.telefono });
        setEditando(a); // guardamos el alumno completo para acceder a su rutina
        setShowModal(true);
    };

    const handleGuardar = async () => {
        if (!form.nombre || !form.apellido) return;
        if (editando) {
            await updateDoc(doc(db, "alumnos", editando.id), form);
        } else {
            const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
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

    const handleQuitarRutina = async (alumno) => {
        await updateDoc(doc(db, "alumnos", alumno.id), { rutina: null });
        setConfirmQuitarRutina(null);
        setShowModal(false);
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
        window.open(`https://wa.me/${alumno.telefono?.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`, "_blank");
    };

    // Alumno actualizado desde el state (para reflejar cambios tras fetchAlumnos)
    const alumnoEditandoActual = editando
        ? alumnos.find(a => a.id === editando.id)
        : null;

    return (
        <>
            <Navbar />
            <div style={S.page}>

                <div style={S.statsGrid}>
                    <StatCard label="Total alumnos" value={totalAlumnos} color="var(--color-primary)" />
                    <StatCard label="Alumnos con rutina" value={conRutina} color="var(--color-primary-2)" />
                    <StatCard label="Alumnos sin rutina" value={sinRutina} color="var(--color-accent)" />
                </div>

                <div style={S.toolbar}>
                    <input
                        style={S.search}
                        type="text"
                        placeholder="🔍  Buscar por nombre..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                    <div style={S.filtros}>
                        {[
                            { key: "todos", label: "Todos" },
                            { key: "con_rutina", label: "Con rutina" },
                            { key: "sin_rutina", label: "Sin rutina" },
                            { key: "a_distancia", label: "A distancia" },
                        ].map(f => (
                            <button key={f.key} onClick={() => setFiltro(f.key)}
                                style={{ ...S.filtroBtn, ...(filtro === f.key ? S.filtroBtnActive : {}) }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button style={S.btnNuevo} onClick={openNuevo}>+ Nuevo alumno</button>
                </div>

                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                {["Nombre y apellido", "Edad", "Metodología", "Teléfono", "Rutina", "Acciones"].map(h => (
                                    <th key={h} style={S.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {alumnosFiltrados.length === 0 ? (
                                <tr><td colSpan={6} style={S.empty}>No se encontraron alumnos.</td></tr>
                            ) : alumnosFiltrados.map(a => (
                                <tr key={a.id} style={S.tr}>
                                    <td style={S.td}><strong>{a.nombre} {a.apellido}</strong></td>
                                    <td style={S.td}>{a.edad}</td>
                                    <td style={S.td}>
                                        <span style={{ ...S.badge, background: a.metodologia === "A distancia" ? "#e8f4fd" : "#eafaf4", color: a.metodologia === "A distancia" ? "#1a6fa8" : "var(--color-primary)" }}>
                                            {a.metodologia}
                                        </span>
                                    </td>
                                    <td style={S.td}>{a.telefono}</td>
                                    <td style={S.td}>
                                        <span style={{ ...S.badge, background: a.rutina ? "#eafaf4" : "#fff8e1", color: a.rutina ? "var(--color-primary)" : "#a07000" }}>
                                            {a.rutina ? "Asignada" : "Sin rutina"}
                                        </span>
                                    </td>
                                    <td style={S.td}>
                                        <div style={S.acciones}>
                                            <button title="Editar alumno" style={S.iconBtn} onClick={() => openEditar(a)}>
                                                <EditIcon />
                                            </button>
                                            {a.rutina ? (
                                                <button title="Ver / Editar rutina" style={{ ...S.iconBtn, color: "var(--color-primary)" }} onClick={() => {
                                                    setAlumnoParaRutina(a);
                                                    setRutinaEditing(a.rutina);
                                                    setShowEditor(true);
                                                }}>
                                                    <ViewIcon />
                                                </button>
                                            ) : (
                                                <button title="Asignar rutina" style={{ ...S.iconBtn, color: "var(--color-primary-2)" }} onClick={() => {
                                                    setAlumnoParaRutina(a);
                                                    setShowSelectTemplate(true);
                                                }}>
                                                    <RutinaIcon />
                                                </button>
                                            )}
                                            {a.rutina && (
                                                <button title="Compartir rutina" style={{ ...S.iconBtn, color: "#25a244" }} onClick={() => { setAlumnoCompartir(a); setCopiadoOk(false); }}>
                                                    <ShareIcon />
                                                </button>
                                            )}
                                            <button title="Eliminar alumno" style={{ ...S.iconBtn, color: "#c0392b" }} onClick={() => setConfirmDel(a)}>
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

            {/* ── MODAL COMPARTIR ──────────────────────────────────────────── */}
            {alumnoCompartir && (
                <div style={S.overlay}>
                    <div style={{ ...S.modal, maxWidth: 420 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                            <div>
                                <h2 style={{ ...S.modalTitle, margin: 0 }}>Compartir rutina</h2>
                                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                                    {alumnoCompartir.nombre} {alumnoCompartir.apellido} · {alumnoCompartir.rutina?.nombre}
                                </p>
                            </div>
                            <button style={S.btnClose} onClick={() => setAlumnoCompartir(null)}>✕</button>
                        </div>
                        <p style={S.shareLabel}>Link único del alumno</p>
                        <div style={S.urlBox}>{getUrlRutina(alumnoCompartir)}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <button style={{ ...S.btnShare, background: copiadoOk ? "#25a244" : "var(--color-primary)" }} onClick={() => handleCopiarLink(alumnoCompartir)}>
                                <CopyIcon size={18} />{copiadoOk ? "¡Link copiado!" : "Copiar link"}
                            </button>
                            <button style={{ ...S.btnShare, background: "#25D366" }} onClick={() => handleWhatsApp(alumnoCompartir)}>
                                <WhatsAppIcon />Enviar por WhatsApp
                            </button>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", marginTop: 16 }}>
                            El alumno puede ver su rutina sin necesidad de login.
                        </p>
                    </div>
                </div>
            )}

            {/* ── MODAL ASIGNAR RUTINA ─────────────────────────────────────── */}
            {showSelectTemplate && (
                <div style={S.overlay}>
                    <div style={{ ...S.modal, maxWidth: "400px" }}>
                        <h2 style={S.modalTitle}>Asignar rutina a {alumnoParaRutina?.nombre}</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                            <button style={{ ...S.btnGuardar, width: "100%", background: "var(--color-primary-2)" }} onClick={openCrearDeCero}>
                                ✨ Crear rutina desde cero
                            </button>
                            <div style={{ margin: "10px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 500 }}>
                                o usar una plantilla genérica
                            </div>
                            <div style={S.formField}>
                                <select style={S.formInput} defaultValue="" onChange={(e) => handleSelectPlantilla(e.target.value)}>
                                    <option value="" disabled>-- Selecciona una rutina --</option>
                                    {rutinasGenericas.map(rg => (
                                        <option key={rg.id} value={rg.id}>{rg.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ ...S.modalActions, marginTop: "24px" }}>
                            <button style={S.btnCancelar} onClick={() => setShowSelectTemplate(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── RUTINA EDITOR ────────────────────────────────────────────── */}
            {showEditor && (
                <RutinaEditor
                    rutinaInicial={rutinaEditing}
                    titulo={`Rutina de ${alumnoParaRutina?.nombre}`}
                    onClose={() => setShowEditor(false)}
                    onSave={async (rutinaFinal) => {
                        const updates = { rutina: rutinaFinal };
                        if (!alumnoParaRutina.tokenRutina) {
                            updates.tokenRutina = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
                        }
                        await updateDoc(doc(db, "alumnos", alumnoParaRutina.id), updates);
                        setShowEditor(false);
                        fetchAlumnos();
                    }}
                />
            )}

            {/* ── MODAL EDITAR / NUEVO ALUMNO ─────────────────────────────── */}
            {showModal && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ ...S.modalTitle, margin: 0 }}>
                                {editando ? "Editar alumno" : "Nuevo alumno"}
                            </h2>
                            <button style={S.btnClose} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {[
                            { key: "nombre", label: "Nombre", type: "text" },
                            { key: "apellido", label: "Apellido", type: "text" },
                            { key: "edad", label: "Edad", type: "number" },
                            { key: "telefono", label: "Teléfono", type: "text" },
                        ].map(f => (
                            <div key={f.key} style={S.formField}>
                                <label style={S.formLabel}>{f.label}</label>
                                <input
                                    type={f.type}
                                    value={form[f.key]}
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    style={S.formInput}
                                />
                            </div>
                        ))}

                        <div style={S.formField}>
                            <label style={S.formLabel}>Metodología</label>
                            <select value={form.metodologia} onChange={e => setForm({ ...form, metodologia: e.target.value })} style={S.formInput}>
                                {METODOLOGIAS.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* ── RUTINA ACTIVA: solo si estamos editando y tiene rutina ── */}
                        {editando && alumnoEditandoActual?.rutina && (
                            <div style={S.rutinaActivaBox}>
                                <div style={S.rutinaActivaLeft}>
                                    <RutinaIcon />
                                    <div>
                                        <p style={S.rutinaActivaLabel}>Rutina activa</p>
                                        <p style={S.rutinaActivaNombre}>
                                            {alumnoEditandoActual.rutina.nombre || "Sin nombre"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    style={S.btnQuitarRutina}
                                    onClick={() => setConfirmQuitarRutina(alumnoEditandoActual)}
                                >
                                    <DeleteIcon size={13} color="#c0392b" />
                                    Quitar
                                </button>
                            </div>
                        )}

                        <div style={S.modalActions}>
                            <button style={S.btnCancelar} onClick={() => setShowModal(false)}>Cancelar</button>
                            <button style={S.btnGuardar} onClick={handleGuardar}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONFIRMAR QUITAR RUTINA ──────────────────────────────────── */}
            {confirmQuitarRutina && (
                <div style={{ ...S.overlay, zIndex: 300 }}>
                    <div style={{ ...S.modal, maxWidth: "360px", textAlign: "center" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-primary)", margin: "12px 0 8px" }}>
                            ¿Quitar rutina?
                        </h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: "0 0 24px" }}>
                            Se va a quitar <strong>"{confirmQuitarRutina.rutina?.nombre}"</strong> de {confirmQuitarRutina.nombre} {confirmQuitarRutina.apellido}.<br />
                            <span style={{ fontSize: 12 }}>La rutina no se elimina, solo se desvincula del alumno.</span>
                        </p>
                        <div style={S.modalActions}>
                            <button style={S.btnCancelar} onClick={() => setConfirmQuitarRutina(null)}>Cancelar</button>
                            <button style={{ ...S.btnGuardar, background: "#c0392b" }} onClick={() => handleQuitarRutina(confirmQuitarRutina)}>
                                Quitar rutina
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONFIRMAR ELIMINAR ALUMNO ────────────────────────────────── */}
            {confirmDel && (
                <div style={S.overlay}>
                    <div style={{ ...S.modal, maxWidth: "360px", textAlign: "center" }}>
                        <DeleteIcon size={32} color="#c0392b" />
                        <h2 style={{ ...S.modalTitle, marginTop: "12px" }}>¿Eliminar alumno?</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "8px 0 24px" }}>
                            Vas a eliminar a <strong>{confirmDel.nombre} {confirmDel.apellido}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div style={S.modalActions}>
                            <button style={S.btnCancelar} onClick={() => setConfirmDel(null)}>Cancelar</button>
                            <button style={{ ...S.btnGuardar, background: "#c0392b" }} onClick={() => handleEliminar(confirmDel.id)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ ...S.statCard, borderTop: `4px solid ${color}` }}>
            <p style={S.statLabel}>{label}</p>
            <p style={{ ...S.statValue, color }}>{value}</p>
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

const S = {
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
    // Rutina activa dentro del modal
    rutinaActivaBox: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f6fdf9", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: "1rem" },
    rutinaActivaLeft: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-primary)" },
    rutinaActivaLabel: { fontSize: "11px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" },
    rutinaActivaNombre: { fontSize: "13px", fontWeight: "600", color: "var(--color-primary)", margin: 0 },
    btnQuitarRutina: { display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#fff5f5", border: "1.5px solid #f5c0c0", borderRadius: "var(--radius-sm)", color: "#c0392b", fontSize: "12px", fontWeight: "500", cursor: "pointer" },
    // Compartir
    shareLabel: { fontSize: 12, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 6px" },
    urlBox: { background: "#f6fdf9", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "var(--color-text-muted)", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 14 },
    btnShare: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", borderRadius: "var(--radius-sm)", border: "none", color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" },
};
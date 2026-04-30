import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
    query, where, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firestore";

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
    } catch (e) {
        console.error("Error parsing YouTube URL:", e);
    }
    return null;
}

const ETAPA_COLORES = {
    "Movilidad": { bg: "#e8f5ee", color: "#026842", border: "#5ccda7" },
    "Activación": { bg: "#fff8e1", color: "#a07000", border: "#efb810" },
    "Trabajo Central": { bg: "#eef2ff", color: "#3730a3", border: "#a5b4fc" },
};

export default function RutinaPublica() {
    const { token } = useParams();
    const [alumno, setAlumno] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [noEncontrado, setNoEncontrado] = useState(false);
    const [semanaActiva, setSemanaActiva] = useState(0);
    const [diaActivo, setDiaActivo] = useState(0);
    const [comentario, setComentario] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    // Map de seguimientos: "alumnoId|semana|dia|ejercicioNombre" → { id, texto }
    const [seguimientos, setSeguimientos] = useState({});

    useEffect(() => {
        const buscarAlumno = async () => {
            try {
                const [snap, ejSnap] = await Promise.all([
                    getDocs(collection(db, "alumnos")),
                    getDocs(collection(db, "ejercicios")),
                ]);
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const banco = ejSnap.docs.map(d => d.data());
                const found = docs.find(d => d.tokenRutina === token || d.id === token);

                if (found && found.rutina) {
                    // Enriquecer videos desde el banco
                    found.rutina.semanas?.forEach(s =>
                        s.dias?.forEach(d =>
                            d.etapas?.forEach(et =>
                                et.ejercicios?.forEach(ej => {
                                    if (!ej.youtubeUrl) {
                                        const orig = banco.find(be => be.nombre === ej.nombre);
                                        if (orig?.youtubeUrl) ej.youtubeUrl = orig.youtubeUrl;
                                    }
                                })
                            )
                        )
                    );
                    setAlumno(found);

                    // Cargar seguimientos existentes del alumno
                    const segSnap = await getDocs(
                        query(collection(db, "seguimientos"), where("alumnoId", "==", found.id))
                    );
                    const map = {};
                    segSnap.docs.forEach(d => {
                        const data = d.data();
                        const key = `${data.alumnoId}|${data.semana}|${data.dia}|${data.ejercicioNombre}`;
                        map[key] = { id: d.id, texto: data.texto };
                    });
                    setSeguimientos(map);
                } else {
                    setNoEncontrado(true);
                }
            } catch (err) {
                console.error(err);
                setNoEncontrado(true);
            } finally {
                setCargando(false);
            }
        };
        buscarAlumno();
    }, [token]);

    const handleEnviarComentario = async () => {
        if (!comentario.trim()) return;
        setEnviando(true);
        try {
            const semana = alumno.rutina.semanas[semanaActiva];
            const dia = semana?.dias[diaActivo];
            await addDoc(collection(db, "comentarios"), {
                alumnoId: alumno.id,
                alumnoNombre: `${alumno.nombre} ${alumno.apellido}`,
                semana: semana?.nombre || `Semana ${semanaActiva + 1}`,
                dia: dia?.nombre || `Día ${diaActivo + 1}`,
                texto: comentario.trim(),
                leido: false,
                fecha: serverTimestamp(),
            });
            setComentario("");
            setEnviado(true);
            setTimeout(() => setEnviado(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setEnviando(false);
        }
    };

    const handleGuardarSeguimiento = async (ejercicioNombre, texto) => {
        const semana = alumno.rutina.semanas[semanaActiva];
        const dia = semana?.dias[diaActivo];
        const semNombre = semana?.nombre || `Semana ${semanaActiva + 1}`;
        const diaNombre = dia?.nombre || `Día ${diaActivo + 1}`;
        const key = `${alumno.id}|${semNombre}|${diaNombre}|${ejercicioNombre}`;

        try {
            if (seguimientos[key]) {
                // Ya existe → sobreescribir
                await updateDoc(doc(db, "seguimientos", seguimientos[key].id), {
                    texto,
                    fecha: serverTimestamp(),
                    leido: false,
                });
                setSeguimientos(prev => ({ ...prev, [key]: { ...prev[key], texto } }));
            } else {
                // Nuevo registro
                const docRef = await addDoc(collection(db, "seguimientos"), {
                    alumnoId: alumno.id,
                    alumnoNombre: `${alumno.nombre} ${alumno.apellido}`,
                    semana: semNombre,
                    dia: diaNombre,
                    ejercicioNombre,
                    texto,
                    leido: false,
                    fecha: serverTimestamp(),
                });
                setSeguimientos(prev => ({ ...prev, [key]: { id: docRef.id, texto } }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleBorrarSeguimiento = async (ejercicioNombre) => {
        const semana = alumno.rutina.semanas[semanaActiva];
        const dia = semana?.dias[diaActivo];
        const semNombre = semana?.nombre || `Semana ${semanaActiva + 1}`;
        const diaNombre = dia?.nombre || `Día ${diaActivo + 1}`;
        const key = `${alumno.id}|${semNombre}|${diaNombre}|${ejercicioNombre}`;
        const seg = seguimientos[key];
        if (!seg) return;
        try {
            await deleteDoc(doc(db, "seguimientos", seg.id));
            setSeguimientos(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (cargando) {
        return (
            <div style={S.centrado}>
                <div style={S.spinner} />
                <p style={{ color: "#009d71", fontSize: 14, marginTop: 16 }}>Cargando rutina...</p>
            </div>
        );
    }

    if (noEncontrado || !alumno) {
        return (
            <div style={S.centrado}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5ccda7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontSize: 18, fontWeight: 600, color: "#026842", marginTop: 16 }}>Rutina no encontrada</p>
                <p style={{ fontSize: 14, color: "#009d71" }}>El link puede ser incorrecto o la rutina fue eliminada.</p>
            </div>
        );
    }

    const { rutina } = alumno;
    const semanas = rutina.semanas || [];
    const semanaActual = semanas[semanaActiva] || semanas[0];
    const dias = semanaActual?.dias || [];
    const diaActual = dias[diaActivo] || dias[0];
    const semNombre = semanaActual?.nombre || `Semana ${semanaActiva + 1}`;
    const diaNombre = diaActual?.nombre || `Día ${diaActivo + 1}`;

    return (
        <div style={S.page}>

            {/* HEADER */}
            <div style={S.header}>
                <div style={S.headerInner}>
                    <img src="/logo_blanco.png" alt="Logo" style={S.logo} />
                    <div>
                        <p style={S.headerTitle}>
                            <span style={{ fontWeight: 800 }}>RAÍZ &amp;</span>
                            <span style={{ fontWeight: 300, letterSpacing: "0.1em", marginLeft: 5 }}>MOVIMIENTO</span>
                        </p>
                        <p style={S.headerSub}>Rutina de {alumno.nombre} {alumno.apellido}</p>
                    </div>
                </div>
            </div>

            <div style={S.body}>

                <div style={S.rutinaHeader}>
                    <h1 style={S.rutinaNombre}>{rutina.nombre}</h1>
                    <p style={S.rutinaMeta}>{semanas.length} semana{semanas.length !== 1 ? "s" : ""}</p>
                </div>

                {/* SELECTOR SEMANAS */}
                <div style={S.selectorWrap}>
                    <p style={S.selectorLabel}>Semana</p>
                    <div style={S.pills}>
                        {semanas.map((s, i) => (
                            <button key={s.id}
                                style={{ ...S.pill, ...(semanaActiva === i ? S.pillActive : {}) }}
                                onClick={() => { setSemanaActiva(i); setDiaActivo(0); }}
                            >{s.nombre}</button>
                        ))}
                    </div>
                </div>

                {/* SELECTOR DÍAS */}
                {dias.length > 1 && (
                    <div style={S.selectorWrap}>
                        <p style={S.selectorLabel}>Día</p>
                        <div style={S.pills}>
                            {dias.map((d, i) => (
                                <button key={d.id}
                                    style={{ ...S.pill, ...(diaActivo === i ? S.pillActive : {}) }}
                                    onClick={() => setDiaActivo(i)}
                                >{d.nombre}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ETAPAS */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {diaActual?.etapas?.map((etapa, idx) => (
                        <EtapaAccordion
                            key={etapa.nombre + idx}
                            etapa={etapa}
                            colores={ETAPA_COLORES[etapa.nombre] || ETAPA_COLORES["Movilidad"]}
                            defaultOpen={idx === 0}
                            alumnoId={alumno.id}
                            semNombre={semNombre}
                            diaNombre={diaNombre}
                            seguimientos={seguimientos}
                            onGuardar={handleGuardarSeguimiento}
                            onBorrar={handleBorrarSeguimiento}
                        />
                    ))}
                </div>

                {/* COMENTARIO GENERAL */}
                <div style={S.comentarioBox}>
                    <div style={S.comentarioHeader}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009d71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p style={S.comentarioTitle}>¿Cómo te fue hoy?</p>
                    </div>
                    <p style={S.comentarioSub}>Dejale un comentario general sobre {semNombre} — {diaNombre}</p>

                    {enviado ? (
                        <div style={S.comentarioOk}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#026842" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            ¡Comentario enviado! Lo van a ver pronto.
                        </div>
                    ) : (
                        <>
                            <textarea
                                style={S.comentarioInput}
                                rows={3}
                                placeholder="Ej: Llegué bien a los pesos, pero el último set me costó bastante..."
                                value={comentario}
                                onChange={e => setComentario(e.target.value)}
                            />
                            <button
                                style={{ ...S.comentarioBtn, opacity: enviando ? 0.7 : 1 }}
                                onClick={handleEnviarComentario}
                                disabled={enviando || !comentario.trim()}
                            >
                                {enviando ? "Enviando..." : "Enviar comentario"}
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

// ── ETAPA ACCORDION ───────────────────────────────────────────────────────────
function EtapaAccordion({ etapa, colores, defaultOpen, alumnoId, semNombre, diaNombre, seguimientos, onGuardar, onBorrar }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    if (!etapa.ejercicios?.length) return null;

    return (
        <div style={{ ...S.etapaSection, borderColor: colores.border }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{ ...S.etapaHeader, background: colores.bg, border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", color: colores.color }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                    <span style={{ ...S.etapaNombre, color: colores.color }}>{etapa.nombre}</span>
                </div>
                <span style={{ ...S.etapaCount, color: colores.color }}>
                    {etapa.ejercicios.length} ejercicio{etapa.ejercicios.length !== 1 ? "s" : ""}
                </span>
            </button>

            {isOpen && (
                <div style={S.ejGrid}>
                    {etapa.ejercicios.map(ej => {
                        const key = `${alumnoId}|${semNombre}|${diaNombre}|${ej.nombre}`;
                        const segExistente = seguimientos[key];
                        return (
                            <EjercicioCard
                                key={ej.id}
                                ej={ej}
                                colores={colores}
                                textoExistente={segExistente?.texto || ""}
                                onGuardar={(texto) => onGuardar(ej.nombre, texto)}
                                onBorrar={() => onBorrar(ej.nombre)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── EJERCICIO CARD ────────────────────────────────────────────────────────────
function EjercicioCard({ ej, colores, textoExistente, onGuardar, onBorrar }) {
    const [showInput, setShowInput] = useState(false);
    const [texto, setTexto] = useState(textoExistente);
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState(false);

    // Sincronizar cuando cambia semana/día
    useEffect(() => {
        setTexto(textoExistente);
        setShowInput(false);
        setGuardado(false);
    }, [textoExistente]);

    const handleGuardar = async () => {
        if (!texto.trim()) return;
        setGuardando(true);
        await onGuardar(texto.trim());
        setGuardando(false);
        setGuardado(true);
        setShowInput(false);
        setTimeout(() => setGuardado(false), 3000);
    };

    return (
        <div style={S.ejCard}>
            {/* Video */}
            {ej.youtubeUrl && getYoutubeEmbedUrl(ej.youtubeUrl) ? (
                <div style={S.videoWrap}>
                    <iframe
                        src={getYoutubeEmbedUrl(ej.youtubeUrl)}
                        title={ej.nombre}
                        style={S.iframe}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            ) : (
                <div style={S.videoPlaceholder}>
                    <div style={{ textAlign: "center" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colores.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 11.75a29 29 0 0 0-.46-5.33z" />
                            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill={colores.border} />
                        </svg>
                        <p style={{ fontSize: 10, color: colores.color, marginTop: 4, fontWeight: 500 }}>Sin video</p>
                    </div>
                </div>
            )}

            {/* Info */}
            <div style={S.ejInfo}>
                <p style={S.ejNombre}>{ej.nombre}</p>
                <div style={S.ejMeta}>
                    {ej.series && ej.reps && (
                        <span style={{ ...S.ejBadge, background: colores.bg, color: colores.color }}>
                            {ej.series} series × {ej.reps} reps
                        </span>
                    )}
                </div>
                {ej.observacion && (
                    <p style={{ ...S.ejObs, color: colores.color }}>📌 {ej.observacion}</p>
                )}

                {/* Registro guardado */}
                {textoExistente && !showInput && (
                    <div style={{ ...S.registroBox, borderColor: colores.border, background: colores.bg }}>
                        <p style={{ ...S.registroTexto, color: colores.color }}>✏️ {textoExistente}</p>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                                style={{ ...S.btnEditar, color: colores.color, borderColor: colores.border }}
                                onClick={() => { setTexto(textoExistente); setShowInput(true); }}
                            >
                                Editar
                            </button>
                            <button
                                style={S.btnBorrarReg}
                                onClick={onBorrar}
                                title="Borrar registro"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Confirmación */}
                {guardado && !textoExistente && (
                    <div style={S.guardadoOk}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#026842" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        ¡Registrado!
                    </div>
                )}

                {/* Input de registro */}
                {showInput ? (
                    <div style={{ marginTop: 10 }}>
                        <input
                            style={{ ...S.inputReg, borderColor: colores.border }}
                            placeholder="Ej: 40kg, se me hizo fácil..."
                            value={texto}
                            onChange={e => setTexto(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <button
                                style={{ ...S.btnGuardarReg, background: colores.color, opacity: guardando ? 0.7 : 1 }}
                                onClick={handleGuardar}
                                disabled={guardando || !texto.trim()}
                            >
                                {guardando ? "..." : "Guardar"}
                            </button>
                            <button
                                style={S.btnCancelarReg}
                                onClick={() => { setShowInput(false); setTexto(textoExistente); }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : !textoExistente && !guardado && (
                    <button
                        style={{ ...S.btnRegistrar, background: colores.bg, color: colores.color, borderColor: colores.border }}
                        onClick={() => { setTexto(""); setShowInput(true); }}
                    >
                        + Registrar peso / nota
                    </button>
                )}
            </div>
        </div>
    );
}

const S = {
    page: { minHeight: "100vh", background: "#f4fdf8", fontFamily: "system-ui, sans-serif" },
    centrado: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f4fdf8" },
    spinner: { width: 36, height: 36, border: "3px solid #d0f0e4", borderTop: "3px solid #009d71", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
    header: { background: "#026842", padding: "12px 20px", position: "sticky", top: 0, zIndex: 10 },
    headerInner: { maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 },
    logo: { height: 44, width: "auto", objectFit: "contain", flexShrink: 0 },
    headerTitle: { fontSize: 16, color: "white", margin: 0, letterSpacing: "0.04em" },
    headerSub: { fontSize: 12, color: "#5ccda7", margin: 0, fontWeight: 500 },
    body: { maxWidth: 760, margin: "0 auto", padding: "1.5rem 1rem 4rem" },
    rutinaHeader: { marginBottom: "1.75rem", textAlign: "center" },
    rutinaNombre: { fontSize: 28, fontWeight: 800, color: "#026842", margin: "0 0 6px", letterSpacing: "-0.02em" },
    rutinaMeta: { fontSize: 14, color: "#009d71", fontWeight: 500, margin: 0 },
    selectorWrap: { marginBottom: "1.25rem" },
    selectorLabel: { fontSize: 11, fontWeight: 700, color: "#009d71", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" },
    pills: { display: "flex", gap: 10, flexWrap: "wrap" },
    pill: { padding: "8px 18px", borderRadius: 24, border: "2px solid #5ccda7", background: "white", color: "#026842", fontSize: 14, fontWeight: 600, cursor: "pointer" },
    pillActive: { background: "#026842", color: "white", borderColor: "#026842" },
    etapaSection: { border: "1.5px solid", borderRadius: 16, overflow: "hidden", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
    etapaHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" },
    etapaNombre: { fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" },
    etapaCount: { fontSize: 12, fontWeight: 600, opacity: 0.8 },
    ejGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, padding: 16, background: "#fafdfc" },
    ejCard: { background: "white", borderRadius: 12, overflow: "hidden", border: "1px solid #e8f5ee", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
    videoWrap: { width: "100%", aspectRatio: "16/9", background: "black" },
    iframe: { width: "100%", height: "100%", border: "none", display: "block" },
    videoPlaceholder: { width: "100%", aspectRatio: "16/9", background: "#f8fdfb", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #e8f5ee" },
    ejInfo: { padding: "12px 14px" },
    ejNombre: { fontSize: 15, fontWeight: 700, color: "#026842", margin: "0 0 8px" },
    ejMeta: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 },
    ejBadge: { display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
    ejObs: { fontSize: 12, margin: "8px 0 0", lineHeight: 1.5, fontWeight: 500, opacity: 0.9 },
    // Registro por ejercicio
    btnRegistrar: { marginTop: 10, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", border: "1.5px solid" },
    registroBox: { marginTop: 10, padding: "8px 12px", borderRadius: 8, border: "1.5px solid" },
    registroTexto: { fontSize: 12, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.5 },
    btnEditar: { padding: "4px 12px", background: "white", border: "1.5px solid", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" },
    inputReg: { width: "100%", padding: "8px 12px", border: "1.5px solid", borderRadius: 8, fontSize: 13, color: "#013d27", background: "#f6fdf9", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    btnGuardarReg: { padding: "7px 18px", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", flex: 1 },
    btnCancelarReg: { padding: "7px 14px", background: "white", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 13, color: "#666", cursor: "pointer" },
    btnBorrarReg: { padding: "4px 9px", background: "white", border: "1.5px solid #f9a8a8", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#c0392b", cursor: "pointer", lineHeight: 1 },
    guardadoOk: { marginTop: 8, display: "flex", alignItems: "center", gap: 6, color: "#026842", fontSize: 12, fontWeight: 600 },
    // Comentario general
    comentarioBox: { background: "white", borderRadius: 16, border: "2px solid #5ccda7", padding: "1.5rem", marginTop: "2rem", boxShadow: "0 4px 20px rgba(92,205,167,0.1)" },
    comentarioHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
    comentarioTitle: { fontSize: 16, fontWeight: 700, color: "#026842", margin: 0 },
    comentarioSub: { fontSize: 13, color: "#009d71", margin: "0 0 16px", fontWeight: 500 },
    comentarioInput: { width: "100%", padding: "12px 16px", border: "1.5px solid #5ccda7", borderRadius: 10, fontSize: 14, color: "#013d27", background: "#f6fdf9", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    comentarioBtn: { marginTop: 12, padding: "12px 24px", background: "#efb810", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" },
    comentarioOk: { display: "flex", alignItems: "center", gap: 12, background: "#eafaf4", border: "1.5px solid #5ccda7", borderRadius: 10, padding: "14px 18px", color: "#026842", fontSize: 14, fontWeight: 600 },
};
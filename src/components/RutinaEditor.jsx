import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { generateId } from "../utils/uuid";
import "./RutinaEditor.css";

const ETAPAS = ["Movilidad", "Activación", "Trabajo Central"];
const GRUPOS_PICKER = ["Pecho", "Hombro", "Espalda", "Tríceps", "Bíceps", "Antebrazo", "Cadera", "Cuádriceps", "Isquiotibiales", "Pantorrillas", "Abdomen", "Otros"];

const emptyEjercicio = { nombre: "", series: "", reps: "", observacion: "", youtubeUrl: "" };

export function crearDia(numDia) {
    return {
        id: generateId(),
        nombre: `Día ${numDia}`,
        etapas: ETAPAS.map(e => ({ nombre: e, ejercicios: [] })),
    };
}

export function crearSemana(numSemana, diasPorSemana) {
    return {
        id: generateId(),
        nombre: `Semana ${numSemana}`,
        dias: Array.from({ length: diasPorSemana }, (_, i) => crearDia(i + 1)),
    };
}

export function emptyRutina() {
    return { nombre: "", semanas: [crearSemana(1, 3)] };
}

function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    try {
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

function ChevronIcon({ open }) {
    return (
        <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        >
            <polyline points="6 9 12 15 18 9" />
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

function YoutubeIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
        </svg>
    );
}

export default function RutinaEditor({ rutinaInicial, titulo, onClose, onSave }) {
    const [rutina, setRutina] = useState(rutinaInicial || emptyRutina());
    const [ejerciciosBanco, setEjerciciosBanco] = useState([]);
    const [colapsadas, setColapsadas] = useState({});
    const [picker, setPicker] = useState(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerFiltroEtapa, setPickerFiltroEtapa] = useState("");
    const [pickerFiltroGrupo, setPickerFiltroGrupo] = useState("");
    const [previewEj, setPreviewEj] = useState(null);

    // Fetch solo ejercicios
    useEffect(() => {
        const fetchEjercicios = async () => {
            const eSnap = await getDocs(collection(db, "ejercicios"));
            setEjerciciosBanco(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchEjercicios();
    }, []);

    const ejerciciosBancoFiltrados = ejerciciosBanco.filter(e => {
        const matchNombre = e.nombre?.toLowerCase().includes(pickerSearch.toLowerCase());
        const matchEtapa = pickerFiltroEtapa ? e.etapas?.includes(pickerFiltroEtapa) : true;
        const matchGrupo = pickerFiltroGrupo ? e.grupos?.includes(pickerFiltroGrupo) : true;
        return matchNombre && matchEtapa && matchGrupo;
    });

    const toggleColapso = (id) => setColapsadas(prev => ({ ...prev, [id]: !prev[id] }));
    const isColapsado = (id) => !!colapsadas[id];

    const handleGuardar = () => {
        if (!rutina.nombre.trim()) return;
        onSave(rutina);
    };

    const setNombreRutina = (v) => setRutina(r => ({ ...r, nombre: v }));

    const addSemana = () =>
        setRutina(r => ({
            ...r,
            semanas: [...r.semanas, crearSemana(r.semanas.length + 1, 1)],
        }));

    const removeSemana = (semanaId) =>
        setRutina(r => ({ ...r, semanas: r.semanas.filter(s => s.id !== semanaId) }));

    const addDia = (semanaId) =>
        setRutina(r => ({
            ...r,
            semanas: r.semanas.map(s =>
                s.id !== semanaId ? s : { ...s, dias: [...s.dias, crearDia(s.dias.length + 1)] }
            ),
        }));

    const removeDia = (semanaId, diaId) =>
        setRutina(r => ({
            ...r,
            semanas: r.semanas.map(s =>
                s.id !== semanaId ? s : { ...s, dias: s.dias.filter(d => d.id !== diaId) }
            ),
        }));

    const updateDiaNombre = (semanaId, diaId, nombre) =>
        setRutina(r => ({
            ...r,
            semanas: r.semanas.map(s =>
                s.id !== semanaId ? s : {
                    ...s, dias: s.dias.map(d => d.id !== diaId ? d : { ...d, nombre })
                }
            ),
        }));

    const addEjercicio = (semanaId, diaId, etapaNombre, ejercicioBase) => {
        const nuevo = { 
            ...emptyEjercicio, 
            nombre: ejercicioBase?.nombre || "", 
            youtubeUrl: ejercicioBase?.youtubeUrl || "", 
            id: generateId() 
        };
        setRutina(r => ({
            ...r,
            semanas: r.semanas.map(s =>
                s.id !== semanaId ? s : {
                    ...s, dias: s.dias.map(d =>
                        d.id !== diaId ? d : {
                            ...d, etapas: d.etapas.map(e =>
                                e.nombre !== etapaNombre ? e : { ...e, ejercicios: [...e.ejercicios, nuevo] }
                            ),
                        }
                    ),
                }
            ),
        }));
    };

    const updateEjercicio = (semanaId, diaId, etapaNombre, ejId, campo, valor) =>
        setRutina(r => ({
            ...r,
            semanas: r.semanas.map(s =>
                s.id !== semanaId ? s : {
                    ...s, dias: s.dias.map(d =>
                        d.id !== diaId ? d : {
                            ...d, etapas: d.etapas.map(e =>
                                e.nombre !== etapaNombre ? e : {
                                    ...e, ejercicios: e.ejercicios.map(ej =>
                                        ej.id !== ejId ? ej : { ...ej, [campo]: valor }
                                    ),
                                }
                            ),
                        }
                    ),
                }
            ),
        }));

    const removeEjercicio = (semanaId, diaId, etapaNombre, ejId) =>
        setRutina(r => ({
            ...r,
            semanas: r.semanas.map(s =>
                s.id !== semanaId ? s : {
                    ...s, dias: s.dias.map(d =>
                        d.id !== diaId ? d : {
                            ...d, etapas: d.etapas.map(e =>
                                e.nombre !== etapaNombre ? e : {
                                    ...e, ejercicios: e.ejercicios.filter(ej => ej.id !== ejId),
                                }
                            ),
                        }
                    ),
                }
            ),
        }));

    const abrirPicker = (semanaId, diaId, etapaNombre) => {
        setPickerSearch("");
        setPickerFiltroEtapa("");
        setPickerFiltroGrupo("");
        setPicker({ semanaId, diaId, etapaNombre });
    };

    const seleccionarDelBanco = (ej) => {
        addEjercicio(picker.semanaId, picker.diaId, picker.etapaNombre, ej);
        setPicker(null);
    };

    const agregarManual = () => {
        addEjercicio(picker.semanaId, picker.diaId, picker.etapaNombre, { nombre: pickerSearch });
        setPicker(null);
    };

    return (
        <div className="rutina-editor-overlay">
            <div className="rutina-editor-container" style={S.editor}>
                <div style={S.editorHeader}>
                    <h2 style={S.editorTitle}>{titulo}</h2>
                    <button style={S.btnClose} onClick={onClose}>✕</button>
                </div>

                <div style={S.field}>
                    <label style={S.label}>Nombre de la rutina *</label>
                    <input
                        style={S.input}
                        value={rutina.nombre}
                        onChange={e => setNombreRutina(e.target.value)}
                        placeholder="Ej: Full Body — 5 días"
                    />
                </div>

                {rutina.semanas.map((semana) => {
                    const semanaColapsada = isColapsado(semana.id);
                    return (
                        <div key={semana.id} className="semana-box" style={S.semanaBox}>
                            <div style={S.semanaHeader}>
                                <button style={S.semanaToggle} onClick={() => toggleColapso(semana.id)}>
                                    <ChevronIcon open={!semanaColapsada} />
                                    <span style={S.semanaTitle}>{semana.nombre}</span>
                                    {semanaColapsada && (
                                        <span style={S.semanaResumen}>
                                            · {semana.dias.length} día{semana.dias.length !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                </button>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    {!semanaColapsada && (
                                        <button style={S.btnAddDia} onClick={() => addDia(semana.id)}>+ Día</button>
                                    )}
                                    {rutina.semanas.length > 1 && (
                                        <button style={{ ...S.iconBtn, color: "#c0392b" }} onClick={() => removeSemana(semana.id)}>
                                            <DeleteIcon size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!semanaColapsada && (
                                <div className="dias-wrap" style={S.diasWrap}>
                                    {semana.dias.map((dia) => {
                                        const diaColapsado = isColapsado(dia.id);
                                        const totalEj = dia.etapas.reduce((acc, e) => acc + e.ejercicios.length, 0);
                                        return (
                                            <div key={dia.id} className="dia-card" style={S.diaCard}>
                                                <div style={S.diaHeader}>
                                                    <button style={S.diaToggle} onClick={() => toggleColapso(dia.id)}>
                                                        <ChevronIcon open={!diaColapsado} />
                                                        <DiaNombreEditable
                                                            nombre={dia.nombre}
                                                            onChange={(v) => updateDiaNombre(semana.id, dia.id, v)}
                                                        />
                                                        {diaColapsado && totalEj > 0 && (
                                                            <span style={S.diaResumen}>· {totalEj} ejercicio{totalEj !== 1 ? "s" : ""}</span>
                                                        )}
                                                    </button>
                                                    {semana.dias.length > 1 && (
                                                        <button style={{ ...S.iconBtn, color: "#c0392b" }} onClick={() => removeDia(semana.id, dia.id)}>
                                                            <DeleteIcon size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                {!diaColapsado && dia.etapas.map(etapa => (
                                                    <div key={etapa.nombre} style={S.etapaBox}>
                                                        <p style={S.etapaLabel}>{etapa.nombre}</p>

                                                        {etapa.ejercicios.map(ej => (
                                                            <div key={ej.id} className="ej-wrap" style={S.ejWrap}>
                                                                <div className="ej-grid-container">
                                                                    <div className="ej-main-inputs">
                                                                        <div className="ej-col-nombre">
                                                                            <input
                                                                                style={{ ...S.ejInput, width: "100%" }}
                                                                                placeholder="Nombre del ejercicio"
                                                                                value={ej.nombre}
                                                                                onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "nombre", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="ej-col-series">
                                                                            <div className="ej-series-reps">
                                                                                <input
                                                                                    style={S.ejInput}
                                                                                    placeholder="Series"
                                                                                    value={ej.series}
                                                                                    onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "series", e.target.value)}
                                                                                />
                                                                                <span style={S.ejSep}>×</span>
                                                                                <input
                                                                                    style={S.ejInput}
                                                                                    placeholder="Reps"
                                                                                    value={ej.reps}
                                                                                    onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "reps", e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="ej-col-delete">
                                                                            <button
                                                                                style={{ ...S.iconBtn, color: "#c0392b" }}
                                                                                onClick={() => removeEjercicio(semana.id, dia.id, etapa.nombre, ej.id)}
                                                                            >
                                                                                <DeleteIcon size={13} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="ej-row-observacion">
                                                                        <input
                                                                            style={{ ...S.ejInput, width: "100%", boxSizing: "border-box" }}
                                                                            placeholder="Observación (opcional)..."
                                                                            value={ej.observacion}
                                                                            onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "observacion", e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <button style={S.btnAddEj} onClick={() => abrirPicker(semana.id, dia.id, etapa.nombre)}>
                                                            + ejercicio
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                <button style={S.btnAddSemana} onClick={addSemana}>
                    + Agregar semana {rutina.semanas.length + 1}
                </button>

                <div style={S.editorFooter}>
                    <button style={S.btnCancelar} onClick={onClose}>Cancelar</button>
                    <button style={S.btnGuardar} onClick={handleGuardar}>Guardar rutina</button>
                </div>
            </div>

            {/* PICKER */}
            {picker && (
                <div style={{ ...S.overlay, zIndex: 300 }}>
                    <div style={S.pickerModal}>
                        <div style={S.editorHeader}>
                            <h2 style={S.editorTitle}>Agregar ejercicio — {picker.etapaNombre}</h2>
                            <button style={S.btnClose} onClick={() => setPicker(null)}>✕</button>
                        </div>
                        <input
                            style={{ ...S.input, marginBottom: 10 }}
                            placeholder="Buscar por nombre..."
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                            autoFocus
                        />
                        <PickerFiltros
                            filtroEtapa={pickerFiltroEtapa}
                            filtroGrupo={pickerFiltroGrupo}
                            onEtapa={setPickerFiltroEtapa}
                            onGrupo={setPickerFiltroGrupo}
                            onLimpiar={() => { setPickerFiltroEtapa(""); setPickerFiltroGrupo(""); }}
                        />
                        <div style={S.pickerList}>
                            {ejerciciosBancoFiltrados.length === 0 && (
                                <div style={S.pickerEmpty}>
                                    <p style={{ color: "var(--color-text-muted)", fontSize: 13, margin: "0 0 10px" }}>
                                        {pickerSearch ? "No encontrado en el banco." : "No hay ejercicios cargados aún."}
                                    </p>
                                    {pickerSearch && (
                                        <button style={S.btnGuardar} onClick={agregarManual}>
                                            Agregar "{pickerSearch}" manualmente
                                        </button>
                                    )}
                                </div>
                            )}
                            {ejerciciosBancoFiltrados.map(ej => (
                                <div key={ej.id} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                                    <button style={S.pickerItem} onClick={() => seleccionarDelBanco(ej)}>
                                        <div style={{ flex: 1, textAlign: "left" }}>
                                            <span style={S.pickerNombre}>{ej.nombre}</span>
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                                                {ej.etapas?.map(e => <span key={e} style={S.tag}>{e}</span>)}
                                                {ej.grupos?.map(g => <span key={g} style={S.tagSmall}>{g}</span>)}
                                            </div>
                                        </div>
                                    </button>
                                    {ej.youtubeUrl && (
                                        <button style={S.btnPreview} title="Ver video" onClick={() => setPreviewEj(ej)}>
                                            <YoutubeIcon />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW VIDEO */}
            {previewEj && (
                <div style={{ ...S.overlay, zIndex: 400 }}>
                    <div style={{ ...S.pickerModal, maxWidth: 560 }}>
                        <div style={S.editorHeader}>
                            <h2 style={S.editorTitle}>{previewEj.nombre}</h2>
                            <button style={S.btnClose} onClick={() => setPreviewEj(null)}>✕</button>
                        </div>
                        {getYoutubeEmbedUrl(previewEj.youtubeUrl) ? (
                            <div style={{ aspectRatio: "16/9", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                <iframe
                                    src={getYoutubeEmbedUrl(previewEj.youtubeUrl)}
                                    title={previewEj.nombre}
                                    style={{ width: "100%", height: "100%", border: "none" }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        ) : (
                            <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Sin video disponible.</p>
                        )}
                        <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {previewEj.etapas?.map(e => <span key={e} style={S.tag}>{e}</span>)}
                            {previewEj.grupos?.map(g => <span key={g} style={S.tagSmall}>{g}</span>)}
                        </div>
                        <div style={S.editorFooter}>
                            <button style={S.btnCancelar} onClick={() => setPreviewEj(null)}>Cerrar</button>
                            <button style={S.btnGuardar} onClick={() => { seleccionarDelBanco(previewEj); setPreviewEj(null); }}>
                                Agregar este ejercicio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DiaNombreEditable({ nombre, onChange }) {
    const [editando, setEditando] = useState(false);
    const [temp, setTemp] = useState(nombre);

    if (editando) {
        return (
            <input
                style={{ fontSize: 13, fontWeight: 600, border: "none", borderBottom: "1.5px solid var(--color-border)", outline: "none", background: "transparent", color: "var(--color-primary)", width: 130 }}
                value={temp}
                onChange={e => setTemp(e.target.value)}
                onBlur={() => { onChange(temp); setEditando(false); }}
                onClick={e => e.stopPropagation()}
                autoFocus
            />
        );
    }
    return (
        <span
            style={S.diaTitulo}
            onClick={e => { e.stopPropagation(); setEditando(true); }}
            title="Clic para renombrar"
        >
            {nombre}
        </span>
    );
}

function PickerFiltros({ filtroEtapa, filtroGrupo, onEtapa, onGrupo, onLimpiar }) {
    const [open, setOpen] = useState(false);
    const hay = filtroEtapa || filtroGrupo;

    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: open ? 10 : 0 }}>
                <button
                    style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", border: "1.5px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        background: hay ? "var(--color-primary)" : "white",
                        color: hay ? "white" : "var(--color-primary)",
                        fontSize: 13, fontWeight: 500, cursor: "pointer",
                    }}
                    onClick={() => setOpen(v => !v)}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filtros {hay && "· activos"}
                </button>
                {hay && (
                    <button onClick={onLimpiar} style={{ fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer" }}>
                        Limpiar
                    </button>
                )}
            </div>
            {open && (
                <div style={{ background: "#f6fdf9", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Etapa</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {["Movilidad", "Activación", "Trabajo Central"].map(e => (
                                <button key={e}
                                    style={{ padding: "4px 12px", borderRadius: 20, border: "1.5px solid var(--color-border)", fontSize: 12, fontWeight: 500, cursor: "pointer", background: filtroEtapa === e ? "var(--color-primary)" : "white", color: filtroEtapa === e ? "white" : "var(--color-primary)" }}
                                    onClick={() => onEtapa(filtroEtapa === e ? "" : e)}
                                >{e}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grupo muscular</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {GRUPOS_PICKER.map(g => (
                                <button key={g}
                                    style={{ padding: "4px 12px", borderRadius: 20, border: "1.5px solid var(--color-border)", fontSize: 12, fontWeight: 500, cursor: "pointer", background: filtroGrupo === g ? "var(--color-primary)" : "white", color: filtroGrupo === g ? "white" : "var(--color-primary)" }}
                                    onClick={() => onGrupo(filtroGrupo === g ? "" : g)}
                                >{g}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, overflowY: "auto", padding: "60px 1rem 2rem" },
    editor: { background: "white", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: 1100, marginTop: "auto", marginBottom: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    editorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
    editorTitle: { fontSize: 18, fontWeight: 600, color: "var(--color-primary)", margin: 0 },
    btnClose: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-muted)", lineHeight: 1 },
    editorFooter: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: "1.5rem" },
    btnCancelar: { padding: "10px 20px", background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, cursor: "pointer", color: "var(--color-text)" },
    btnGuardar: { padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
    field: { marginBottom: "1rem" },
    label: { display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-primary)", marginBottom: 5, letterSpacing: "0.03em" },
    input: { width: "100%", padding: "10px 14px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, color: "var(--color-text)", background: "#f6fdf9", boxSizing: "border-box", outline: "none" },
    semanaBox: { border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", marginBottom: 16, overflow: "hidden" },
    semanaHeader: { background: "#eafaf4", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    semanaToggle: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", flex: 1, padding: 0 },
    semanaTitle: { fontSize: 14, fontWeight: 600, color: "var(--color-primary)" },
    semanaResumen: { fontSize: 12, color: "var(--color-text-muted)", fontWeight: 400 },
    btnAddDia: { fontSize: 12, color: "var(--color-primary-2)", background: "white", border: "1.5px solid var(--color-border)", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 500 },
    diasWrap: { display: "flex", flexDirection: "column", gap: 10, padding: "8px" },
    diaCard: { background: "#f9fffe", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "12px 14px", width: "100%" },
    diaHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    diaToggle: { display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", flex: 1, padding: 0 },
    diaTitulo: { fontSize: 13, fontWeight: 600, color: "var(--color-primary)", borderBottom: "1px dashed var(--color-border)", cursor: "pointer" },
    diaResumen: { fontSize: 11, color: "var(--color-text-muted)", fontWeight: 400 },
    etapaBox: { background: "white", borderRadius: 6, padding: "10px 12px", marginBottom: 8, border: "1px solid #e8f5ee" },
    etapaLabel: { fontSize: 10, fontWeight: 600, color: "var(--color-primary-2)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" },
    ejWrap: { background: "#f6fdf9", borderRadius: 6, padding: "8px 10px", marginBottom: 6, border: "1px solid #e0f5ec" },
    ejFila1: { display: "flex", gap: 6, alignItems: "center" },
    ejInput: { padding: "7px 10px", border: "1px solid var(--color-border)", borderRadius: 5, fontSize: 13, color: "var(--color-text)", background: "white", outline: "none", minWidth: 0 },
    ejSep: { fontSize: 13, color: "var(--color-text-muted)", flexShrink: 0 },
    btnAddEj: { fontSize: 12, color: "var(--color-primary-2)", background: "none", border: "1px dashed var(--color-border)", borderRadius: 5, padding: "5px 12px", cursor: "pointer", width: "100%", marginTop: 4 },
    btnAddSemana: { width: "100%", padding: "10px", background: "none", border: "1.5px dashed var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-primary-2)", fontSize: 13, cursor: "pointer", marginBottom: 8 },
    pickerModal: { background: "white", borderRadius: "var(--radius-lg)", padding: "1.75rem", width: "100%", maxWidth: 520, marginTop: "auto", marginBottom: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
    pickerList: { maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
    pickerItem: { display: "flex", alignItems: "center", padding: "10px 14px", background: "#f6fdf9", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left", gap: 8, flex: 1 },
    pickerNombre: { fontSize: 14, fontWeight: 500, color: "var(--color-primary)" },
    pickerEmpty: { textAlign: "center", padding: "1.5rem 0" },
    btnPreview: { background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", cursor: "pointer", color: "#c0392b", display: "flex", alignItems: "center", flexShrink: 0 },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
    tag: { display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#eafaf4", color: "var(--color-primary)", marginRight: 4 },
    tagSmall: { display: "inline-block", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 500, background: "#fff8e1", color: "#a07000" },
};

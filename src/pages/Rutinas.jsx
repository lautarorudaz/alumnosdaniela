import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase/firestore";

const ETAPAS = ["Movilidad", "Activación", "Trabajo Central"];
const GRUPOS_PICKER = ["Pecho", "Hombro", "Espalda", "Tríceps", "Bíceps", "Antebrazo", "Cadera", "Cuádriceps", "Isquiotibiales", "Pantorrillas", "Abdomen", "Otros"];

const emptyEjercicio = { nombre: "", series: "", reps: "", observacion: "" };

function crearDia(numDia) {
    return {
        id: crypto.randomUUID(),
        nombre: `Día ${numDia}`,
        etapas: ETAPAS.map(e => ({ nombre: e, ejercicios: [] })),
    };
}

function crearSemana(numSemana, diasPorSemana) {
    return {
        id: crypto.randomUUID(),
        nombre: `Semana ${numSemana}`,
        dias: Array.from({ length: diasPorSemana }, (_, i) => crearDia(i + 1)),
    };
}

function emptyRutina() {
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

export default function Rutinas() {
    const [rutinas, setRutinas] = useState([]);
    const [rutinasActivas, setRutinasActivas] = useState(0);
    const [ejerciciosBanco, setEjerciciosBanco] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editando, setEditando] = useState(null);
    const [rutina, setRutina] = useState(emptyRutina());
    const [confirmDel, setConfirmDel] = useState(null);
    const [colapsadas, setColapsadas] = useState({});
    const [picker, setPicker] = useState(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerFiltroEtapa, setPickerFiltroEtapa] = useState("");
    const [pickerFiltroGrupo, setPickerFiltroGrupo] = useState("");
    const [previewEj, setPreviewEj] = useState(null);

    const toggleColapso = (id) =>
        setColapsadas(prev => ({ ...prev, [id]: !prev[id] }));

    const isColapsado = (id) => !!colapsadas[id];

    const fetchData = async () => {
        const [rSnap, aSnap, eSnap] = await Promise.all([
            getDocs(collection(db, "rutinas")),
            getDocs(collection(db, "alumnos")),
            getDocs(collection(db, "ejercicios")),
        ]);
        setRutinas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRutinasActivas(aSnap.docs.filter(d => d.data().rutina).length);
        setEjerciciosBanco(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { fetchData(); }, []);

    const ejerciciosBancoFiltrados = ejerciciosBanco.filter(e => {
        const matchNombre = e.nombre?.toLowerCase().includes(pickerSearch.toLowerCase());
        const matchEtapa = pickerFiltroEtapa ? e.etapas?.includes(pickerFiltroEtapa) : true;
        const matchGrupo = pickerFiltroGrupo ? e.grupos?.includes(pickerFiltroGrupo) : true;
        return matchNombre && matchEtapa && matchGrupo;
    });

    const openNueva = () => {
        setRutina(emptyRutina());
        setEditando(null);
        setColapsadas({});
        setShowEditor(true);
    };

    const openEditar = (r) => {
        setRutina({ nombre: r.nombre, semanas: r.semanas });
        setEditando(r.id);
        setColapsadas({});
        setShowEditor(true);
    };

    const openDuplicar = (r) => {
        setRutina({
            nombre: `${r.nombre} (copia)`,
            semanas: JSON.parse(JSON.stringify(r.semanas)).map(s => ({
                ...s, id: crypto.randomUUID(),
                dias: s.dias.map(d => ({ ...d, id: crypto.randomUUID() })),
            })),
        });
        setEditando(null);
        setColapsadas({});
        setShowEditor(true);
    };

    const handleGuardar = async () => {
        if (!rutina.nombre.trim()) return;
        if (editando) {
            await updateDoc(doc(db, "rutinas", editando), rutina);
        } else {
            await addDoc(collection(db, "rutinas"), rutina);
        }
        setShowEditor(false);
        fetchData();
    };

    const handleEliminar = async (id) => {
        await deleteDoc(doc(db, "rutinas", id));
        setConfirmDel(null);
        fetchData();
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
        const nuevo = { ...emptyEjercicio, nombre: ejercicioBase?.nombre || "", id: crypto.randomUUID() };
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

            {/* EDITOR */}
            {showEditor && (
                <div style={S.overlay}>
                    <div style={S.editor}>
                        <div style={S.editorHeader}>
                            <h2 style={S.editorTitle}>{editando ? "Editar rutina" : "Nueva rutina genérica"}</h2>
                            <button style={S.btnClose} onClick={() => setShowEditor(false)}>✕</button>
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
                                <div key={semana.id} style={S.semanaBox}>
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
                                        <div style={S.diasWrap}>
                                            {semana.dias.map((dia) => {
                                                const diaColapsado = isColapsado(dia.id);
                                                const totalEj = dia.etapas.reduce((acc, e) => acc + e.ejercicios.length, 0);
                                                return (
                                                    <div key={dia.id} style={S.diaCard}>
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
                                                                    <div key={ej.id} style={S.ejWrap}>
                                                                        <div style={S.ejFila1}>
                                                                            <input
                                                                                style={{ ...S.ejInput, flex: 3, minWidth: 0 }}
                                                                                placeholder="Nombre del ejercicio"
                                                                                value={ej.nombre}
                                                                                onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "nombre", e.target.value)}
                                                                            />
                                                                            <input
                                                                                style={{ ...S.ejInput, flex: 1, minWidth: 80 }}
                                                                                placeholder="Series"
                                                                                value={ej.series}
                                                                                onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "series", e.target.value)}
                                                                            />
                                                                            <span style={S.ejSep}>×</span>
                                                                            <input
                                                                                style={{ ...S.ejInput, flex: 1, minWidth: 80 }}
                                                                                placeholder="Reps"
                                                                                value={ej.reps}
                                                                                onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "reps", e.target.value)}
                                                                            />
                                                                            <button
                                                                                style={{ ...S.iconBtn, color: "#c0392b", flexShrink: 0 }}
                                                                                onClick={() => removeEjercicio(semana.id, dia.id, etapa.nombre, ej.id)}
                                                                            >
                                                                                <DeleteIcon size={13} />
                                                                            </button>
                                                                        </div>
                                                                        <input
                                                                            style={{ ...S.ejInput, width: "100%", marginTop: 6, boxSizing: "border-box" }}
                                                                            placeholder="Observación (opcional)..."
                                                                            value={ej.observacion}
                                                                            onChange={e => updateEjercicio(semana.id, dia.id, etapa.nombre, ej.id, "observacion", e.target.value)}
                                                                        />
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
                            <button style={S.btnCancelar} onClick={() => setShowEditor(false)}>Cancelar</button>
                            <button style={S.btnGuardar} onClick={handleGuardar}>Guardar rutina</button>
                        </div>
                    </div>
                </div>
            )}

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

// ── DIA NOMBRE EDITABLE ───────────────────────────────────────────────────────
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

// ── PICKER FILTROS ────────────────────────────────────────────────────────────
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
function YoutubeIcon() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" /></svg>;
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
    tagSmall: { display: "inline-block", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 500, background: "#fff8e1", color: "#a07000" },
    empty: { textAlign: "center", color: "var(--color-text-muted)", fontSize: 14, padding: "3rem 0" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, overflowY: "auto", padding: "2rem 1rem" },
    editor: { background: "white", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: 900, marginTop: "auto", marginBottom: "auto" },
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
    diasWrap: { display: "flex", flexDirection: "column", gap: 10, padding: "12px" },
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
    pickerModal: { background: "white", borderRadius: "var(--radius-lg)", padding: "1.75rem", width: "100%", maxWidth: 520, marginTop: "auto", marginBottom: "auto" },
    pickerList: { maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
    pickerItem: { display: "flex", alignItems: "center", padding: "10px 14px", background: "#f6fdf9", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left", gap: 8, flex: 1 },
    pickerNombre: { fontSize: 14, fontWeight: 500, color: "var(--color-primary)" },
    pickerEmpty: { textAlign: "center", padding: "1.5rem 0" },
    btnPreview: { background: "white", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", cursor: "pointer", color: "#c0392b", display: "flex", alignItems: "center", flexShrink: 0 },
};
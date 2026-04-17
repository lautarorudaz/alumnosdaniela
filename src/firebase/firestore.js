import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import app from "./config";

export const db = getFirestore(app);

const TURNOS_COL = "turnos";

// Obtener todos los turnos ordenados por fecha
export async function getTurnos() {
    const q = query(collection(db, TURNOS_COL), orderBy("fecha", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Agregar un turno nuevo
export async function addTurno(turno) {
    return addDoc(collection(db, TURNOS_COL), {
        ...turno,
        creadoEn: Timestamp.now(),
    });
}

// Actualizar un turno existente
export async function updateTurno(id, data) {
    return updateDoc(doc(db, TURNOS_COL, id), data);
}

// Eliminar un turno
export async function deleteTurno(id) {
    return deleteDoc(doc(db, TURNOS_COL, id));
}

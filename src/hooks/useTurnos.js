import { useState, useEffect, useCallback } from "react";
import { getTurnos, addTurno, updateTurno, deleteTurno } from "../firebase/firestore";

export function useTurnos() {
    const [turnos, setTurnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTurnos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getTurnos();
            setTurnos(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTurnos(); }, [fetchTurnos]);

    const crear = async (turno) => {
        await addTurno(turno);
        await fetchTurnos();
    };

    const editar = async (id, data) => {
        await updateTurno(id, data);
        await fetchTurnos();
    };

    const eliminar = async (id) => {
        await deleteTurno(id);
        await fetchTurnos();
    };

    return { turnos, loading, error, crear, editar, eliminar, refetch: fetchTurnos };
}

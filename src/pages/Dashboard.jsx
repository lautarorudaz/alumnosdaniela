import Navbar from "../components/Navbar";
import Turnos from "./Turnos";

export default function Dashboard() {
    return (
        <div style={styles.shell}>
            <Navbar />
            <main style={styles.main}>
                <Turnos />
            </main>
        </div>
    );
}

const styles = {
    shell: { minHeight: "100vh", background: "var(--color-bg)" },
    main: { padding: "1rem 0" },
};

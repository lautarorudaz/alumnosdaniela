export function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for insecure contexts (HTTP)
    return "id-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString(36);
}

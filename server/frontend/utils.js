// Funções utilitárias
export function isOnline(lastSeen) {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / (1000 * 60);
    return diffMinutes < 5;
}

export function formatDateTime(dateString, includeSeconds = false) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' })
    };
    return date.toLocaleString('pt-BR', options);
}

export function formatDate(timestamp) {
    return timestamp.toDate().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
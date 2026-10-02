export function formatDate(timestamp: string | number | Date): string {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
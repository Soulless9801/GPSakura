export function loadValue<T>(key: string, defaultValue: T): T {
    let value = defaultValue;
    try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {value = JSON.parse(raw) as T;}
    } catch {
        // Corrupt or blocked storage must not prevent a component from mounting.
    }
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // A valid read remains useful even when persistence is unavailable.
    }
    return value;
}

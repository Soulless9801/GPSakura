export function loadValue<T>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(key);
	const val: T = (raw !== null ? JSON.parse(raw) as T : defaultValue);
	localStorage.setItem(key, JSON.stringify(val));
	return val;
}
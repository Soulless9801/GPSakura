export function loadValue(key, defaultValue) {
    const raw = localStorage.getItem(key);
    const val = (raw !== null ? JSON.parse(raw) : defaultValue);
	localStorage.setItem(key, JSON.stringify(val));
	if (typeof defaultValue === "number") return Number(val);
	if (typeof defaultValue === "boolean") return Boolean(val);
	return val;
}
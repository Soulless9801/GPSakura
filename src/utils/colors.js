export function hexToRGB(hex) {
    const parsed = hex.replace("#", "");
	if (!/^[0-9a-fA-F]{6}$/.test(parsed)) return null;
    const bigint = parseInt(parsed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

const toHex = (value) => value.toString(16).padStart(2, "0");

export function clamp(value) {
	const numeric = Number(value);
	if (Number.isNaN(numeric)) return 0;
	return Math.max(0, Math.min(255, Math.round(numeric)));
};

function pruneRGB(rgb) {
    return rgb.map(v => clamp(v));
}

export function rgbToHex(rgb) {
    const [r, g, b] = pruneRGB(rgb);
    console.log("Pruned RGB:", `#${toHex(r)}${toHex(g)}${toHex(b)}`);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function normalizeHex(value) {
	if (typeof value !== "string") return null;
	const parsed = value.trim().replace(/^#/, "").toLowerCase();
	if (!/^[0-9a-f]{6}$/.test(parsed)) return null;
	return `#${parsed}`;
}

export function rgbToCss(rgb) {
    const [r, g, b] = pruneRGB(rgb);
    return `rgb(${r}, ${g}, ${b})`;
}

export function readColor() {
	return [
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim()),
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim())
	];
}
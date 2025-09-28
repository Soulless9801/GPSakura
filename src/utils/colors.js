export function hexToRGB(hex) {
    const parsed = hex.replace("#", "");
    const bigint = parseInt(parsed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

export function rgbToCss(rgb) {
    const [r, g, b] = rgb.map(v => Math.round(Math.max(0, Math.min(255, v))));
    return `rgb(${r}, ${g}, ${b})`;
}

export function readColor() {
	return [
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim()),
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim())
	];
}
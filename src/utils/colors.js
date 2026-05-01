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

export function clampRGB(value) {
	const numeric = Number(value);
	if (Number.isNaN(numeric)) return 0;
	return Math.max(0, Math.min(255, Math.round(numeric)));
};

function pruneRGB(rgb) {
    return rgb.map(v => clampRGB(v));
}

export function rgbToHex(rgb) {
    const [r, g, b] = pruneRGB(rgb);
    // console.log("Pruned RGB:", `#${toHex(r)}${toHex(g)}${toHex(b)}`);
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

export function hsvToRGB(h, s, v) {
    const hue = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = v - c;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (hue < 60) {
        rPrime = c;
        gPrime = x;
    } else if (hue < 120) {
        rPrime = x;
        gPrime = c;
    } else if (hue < 180) {
        gPrime = c;
        bPrime = x;
    } else if (hue < 240) {
        gPrime = x;
        bPrime = c;
    } else if (hue < 300) {
        rPrime = x;
        bPrime = c;
    } else {
        rPrime = c;
        bPrime = x;
    }

    return [
        Math.round((rPrime + m) * 255),
        Math.round((gPrime + m) * 255),
        Math.round((bPrime + m) * 255),
    ];
}

export function rgbToHsv([r, g, b]) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
        else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
        else h = 60 * ((rn - gn) / delta + 4);
    }

    const normalizedHue = (h + 360) % 360;
    const s = max === 0 ? 0 : delta / max;
    const v = max;

    return [normalizedHue, s, v];
}

export function hexToHsv(hex) {
    const rgb = hexToRGB(hex);
    if (!rgb) return [210, 0.76, 0.96];
    return rgbToHsv(rgb);
}

export function readColor() {
	return [
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim()),
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim())
	];
}
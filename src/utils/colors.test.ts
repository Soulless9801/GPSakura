import { afterEach, describe, expect, it, vi } from "vitest";

import {
    clampRGB,
    hexToHsv,
    hexToRGB,
    hsvToRGB,
    normalizeHex,
    readColor,
    rgbToCss,
    rgbToHex,
    rgbToHsv,
} from "./colors";
import type { RGB } from "./colors";

describe("hexToRGB", () => {
    it("parses 6-digit hex with or without the hash", () => {
        expect(hexToRGB("#ff8000")).toEqual([255, 128, 0]);
        expect(hexToRGB("ff8000")).toEqual([255, 128, 0]);
    });

    it("expands 3-digit shorthand", () => {
        expect(hexToRGB("#f80")).toEqual([255, 136, 0]);
    });

    it("is case-insensitive and trims whitespace", () => {
        expect(hexToRGB("  #FfAa00 ")).toEqual([255, 170, 0]);
    });

    it.each(["", "#", "#12", "#1234", "#12345", "#1234567", "#gggggg", "rgb(1,2,3)"])(
        "rejects %j",
        (value) => {
            expect(hexToRGB(value)).toBeNull();
        },
    );

    it("rejects non-string input at runtime", () => {
        expect(hexToRGB(undefined as unknown as string)).toBeNull();
        expect(hexToRGB(123456 as unknown as string)).toBeNull();
    });
});

describe("normalizeHex", () => {
    it("lower-cases and prefixes the hash", () => {
        expect(normalizeHex("FF00AA")).toBe("#ff00aa");
        expect(normalizeHex("#FF00AA")).toBe("#ff00aa");
    });

    it("does not accept shorthand (unlike hexToRGB)", () => {
        expect(normalizeHex("#f80")).toBeNull();
    });

    it("rejects garbage", () => {
        expect(normalizeHex("zzzzzz")).toBeNull();
        expect(normalizeHex(null as unknown as string)).toBeNull();
    });
});

describe("clampRGB", () => {
    it("clamps to 0..255 and rounds", () => {
        expect(clampRGB(-5)).toBe(0);
        expect(clampRGB(300)).toBe(255);
        expect(clampRGB(12.4)).toBe(12);
        expect(clampRGB(12.5)).toBe(13);
    });

    it("maps NaN to 0", () => {
        expect(clampRGB(Number.NaN)).toBe(0);
    });

    it("saturates infinities", () => {
        expect(clampRGB(Infinity)).toBe(255);
        expect(clampRGB(-Infinity)).toBe(0);
    });
});

describe("rgbToHex / rgbToCss", () => {
    it("zero-pads each channel", () => {
        expect(rgbToHex([0, 5, 255])).toBe("#0005ff");
    });

    it("clamps out-of-range channels", () => {
        expect(rgbToHex([-10, 999, 1.6])).toBe("#00ff02");
        expect(rgbToCss([-10, 999, 1.6])).toBe("rgb(0, 255, 2)");
    });

    it("treats missing channels as 0", () => {
        expect(rgbToHex([255])).toBe("#ff0000");
        expect(rgbToCss([])).toBe("rgb(0, 0, 0)");
    });

    it("round-trips with hexToRGB", () => {
        for (const rgb of [[0, 0, 0], [255, 255, 255], [18, 52, 86], [1, 2, 3]] as RGB[]) {
            expect(hexToRGB(rgbToHex(rgb))).toEqual(rgb);
        }
    });
});

describe("hsvToRGB", () => {
    it.each([
        [0, 1, 1, [255, 0, 0]],
        [60, 1, 1, [255, 255, 0]],
        [120, 1, 1, [0, 255, 0]],
        [180, 1, 1, [0, 255, 255]],
        [240, 1, 1, [0, 0, 255]],
        [300, 1, 1, [255, 0, 255]],
        [0, 0, 1, [255, 255, 255]],
        [123, 1, 0, [0, 0, 0]],
    ] as [number, number, number, RGB][])("hsv(%d, %d, %d)", (h, s, v, expected) => {
        expect(hsvToRGB(h, s, v)).toEqual(expected);
    });

    it("wraps hue modulo 360, including negatives", () => {
        expect(hsvToRGB(360, 1, 1)).toEqual(hsvToRGB(0, 1, 1));
        expect(hsvToRGB(-120, 1, 1)).toEqual(hsvToRGB(240, 1, 1));
        expect(hsvToRGB(720 + 60, 1, 1)).toEqual(hsvToRGB(60, 1, 1));
    });
});

describe("rgbToHsv", () => {
    it("returns hue 0 and saturation 0 for greys", () => {
        expect(rgbToHsv([128, 128, 128])).toEqual([0, 0, 128 / 255]);
        expect(rgbToHsv([0, 0, 0])).toEqual([0, 0, 0]);
    });

    it("keeps hue in [0, 360) when the red channel dominates with b > g", () => {
        const [h] = rgbToHsv([255, 0, 128]);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
        expect(h).toBeCloseTo(329.88, 1);
    });

    it("round-trips with hsvToRGB across the colour wheel", () => {
        for (let r = 0; r <= 255; r += 51) {
            for (let g = 0; g <= 255; g += 51) {
                for (let b = 0; b <= 255; b += 51) {
                    const [h, s, v] = rgbToHsv([r, g, b]);
                    expect(hsvToRGB(h, s, v)).toEqual([r, g, b]);
                }
            }
        }
    });
});

describe("hexToHsv", () => {
    it("falls back to the default blue for invalid input", () => {
        expect(hexToHsv("nope")).toEqual([210, 0.76, 0.96]);
    });

    it("converts valid hex", () => {
        const [h, s, v] = hexToHsv("#00ff00");
        expect([h, s, v]).toEqual([120, 1, 1]);
    });
});

describe("readColor", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function stubStyles(values: Record<string, string>): void {
        vi.stubGlobal("document", { documentElement: {} });
        vi.stubGlobal("getComputedStyle", () => ({
            getPropertyValue: (name: string) => values[name] ?? "",
        }));
    }

    it("reads the primary and secondary CSS variables", () => {
        stubStyles({ "--primary-color": "#112233", "--secondary-color": " #abc " });
        expect(readColor()).toEqual([[17, 34, 51], [170, 187, 204]]);
    });

    it("falls back to white for each missing variable, with independent arrays", () => {
        stubStyles({});
        const [a, b] = readColor();
        expect(a).toEqual([255, 255, 255]);
        expect(b).toEqual([255, 255, 255]);
        a[0] = 0;
        expect(b[0]).toBe(255);
        expect(readColor()[0]).toEqual([255, 255, 255]);
    });
});

/** Preserve the zero-based step grid, then clamp so rounding cannot escape the bounds. */
export function clampToStep(value: number, min: number, max: number, step: number, places: number): number {
    const snapped = step > 0 ? Math.round(value / step) * step : value;
    return Math.min(max, Math.max(min, Number(snapped.toFixed(places))));
}

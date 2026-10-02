import type { RGB } from "/src/utils/colors";

export function randomColor(): RGB {
    return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255)];
}

export function defaultColor(): RGB {
    return [0, 0, 0];
}
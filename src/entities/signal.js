// utils/signal.js
export function generateTimeArray(n = 512, tMax = 1) {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        arr[i] = (i / (n - 1)) * tMax;
    }
    return arr;
}

export function sineComponent(a, f, t) {
    return a * Math.sin(2 * Math.PI * f * t);
}

export function composeSignal(components, tArray) {
    const out = new Float32Array(tArray.length);
    for (let i = 0; i < tArray.length; i++) {
        let sum = 0;
        for (const { a, f } of components) {
            sum += sineComponent(a, f, tArray[i]);
        }
        out[i] = sum;
    }
    return out;
}

export function randomComponent() {
    return {
        a: Math.floor(Math.random() * 3) + 1,
        f: Math.floor(Math.random() * 10) + 1,
    };
}

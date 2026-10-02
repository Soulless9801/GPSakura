export interface SignalComponent {
    a: number;
    f: number;
}

export function generateTimeArray(n: number = 512, tMax: number = 1): Float32Array {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        arr[i] = (i / (n - 1)) * tMax;
    }
    return arr;
}

export function sineComponent(a: number, f: number, t: number): number {
    return a * Math.sin(2 * Math.PI * f * t);
}

export function composeSignal(components: readonly SignalComponent[], tArray: Float32Array): Float32Array {
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

export function randomComponent(): SignalComponent {
    return {
        a: Math.floor(Math.random() * 3) + 1,
        f: Math.floor(Math.random() * 10) + 1,
    };
}

export function defaultComponent(): SignalComponent {
    return {
        a: 1,
        f: 1,
    };
}
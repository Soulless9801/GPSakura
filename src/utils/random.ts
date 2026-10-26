import RNG from '../entities/rng';

/** A fresh, repeatable stream using the project's existing RNG implementation. */
export function seededRandom(seed: number | string): () => number {
    let value = typeof seed === 'number' ? seed : 2166136261;
    if (typeof seed === 'string') {
        for (let i = 0; i < seed.length; i++) {
            value = Math.imul(value ^ seed.charCodeAt(i), 16777619);
        }
    }
    const rng = new RNG(value);
    return () => rng.next();
}

import { expect, it } from 'vitest';
import RNG from '../entities/rng';
import { seededRandom } from './random';

it('reuses RNG for numeric seeds and creates independent repeatable named streams', () => {
    const existing = new RNG(42);
    const numeric = seededRandom(42);
    const first = seededRandom('sakura:leaf:0');
    const second = seededRandom('sakura:leaf:0');
    const other = seededRandom('oak:leaf:0');
    for (let i = 0; i < 20; i++) {
        expect(numeric()).toBe(existing.next());
        const value = first();
        expect(second()).toBe(value);
        expect(other()).not.toBe(value);
    }
});

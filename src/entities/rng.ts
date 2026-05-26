export default class RNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    next(): number {
        // xorshift32
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return (x >>> 0) / 2 ** 32;
    }

    int(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pick<T>(arr: T[]): T {
        return arr[this.int(0, arr.length - 1)];
    }

    chance(p: number): boolean {
        return this.next() < p;
    }

    shuffle<T>(arr: T[]): T[] {
        const shuffled = arr.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.int(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

export function findIndex<T extends string | number>(val: T | null | undefined, list: readonly { value: T }[], defaultIndex: number): number {
    if (val === null || val === undefined) {return defaultIndex;}
    const idx = list.findIndex(item => String(item.value) === String(val));
    return idx !== -1 ? idx : defaultIndex;
}

export function toggleVal<T>(list: readonly T[], val: T): T[] {
    if (list.includes(val)) {
        return list.filter(item => item !== val);
    } else {
        return [...list, val];
    }
}

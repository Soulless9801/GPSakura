export function findIndex<T extends { value: unknown }>(val: unknown, list: readonly T[], defaultIndex: number): number {
    const idx = list.findIndex(item => item.value === String(val));
    return idx !== -1 ? idx : defaultIndex;
}

export function toggleVal<T>(list: readonly T[], val: T): T[] {
    if (list.includes(val)) {
        return list.filter(item => item !== val);
    } else {
        return [...list, val];
    }
}
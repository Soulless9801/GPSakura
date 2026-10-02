export function findIndex(val, list, defaultIndex) {
    const idx = list.findIndex(item => item.value === String(val));
    return idx !== -1 ? idx : defaultIndex;
}

export function toggleVal(list, val) {
    if (list.includes(val)) {
        return list.filter(item => item !== val);
    } else {
        return [...list, val];
    }
}
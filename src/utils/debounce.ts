export interface DebouncedFunction<Args extends readonly unknown[]> {
    (...args: Args): void;
    cancel: () => void;
}

export function debounce<Args extends readonly unknown[]>(func: (...args: Args) => void, delay: number): DebouncedFunction<Args> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const debounced = function(...args: Args): void {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
    debounced.cancel = () => {
        clearTimeout(timeoutId);
    };
    return debounced;
}

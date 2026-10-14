export function convertToPixels(input: number | string, context: HTMLElement = document.body): number {
    if (typeof input === "number") {return input;} // already px

    const match = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(input);
    if (!match) {return NaN;}
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case "px":
            return value;

        case "vw":
            return window.innerWidth * (value / 100);

        case "vh":
            return window.innerHeight * (value / 100);

        case "%":
            return context.getBoundingClientRect().width * (value / 100);

        case "em":
            return value * parseFloat(getComputedStyle(context).fontSize);

        case "rem":
            return value * parseFloat(getComputedStyle(document.documentElement).fontSize);

        default:
            return value; 
    }
}

// Canvas backing stores must follow layout changes as well as window resizes.
export function observeElementSize(element: Element | null, onResize: () => void): () => void {
    if (!element || typeof ResizeObserver === "undefined") {return () => {};}
    const observer = new ResizeObserver(() => { onResize(); });
    observer.observe(element);
    return () => { observer.disconnect(); };
}

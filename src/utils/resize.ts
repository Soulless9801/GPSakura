export function convertToPixels(input: number | string, context: HTMLElement = document.body): number {
    if (typeof input === "number") {return input;} // already px

    const value = parseFloat(input);
    const unit = input.replace(String(value), "").trim();

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

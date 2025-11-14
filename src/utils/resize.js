export function convertToPixels(input, context = document.body) {
    if (typeof input === "number") return input; // already px

    const value = parseFloat(input);
    const unit = input.replace(value, "").trim();

    switch (unit) {
        case "px":
            return value;

        case "vw":
            return window.innerWidth * (value / 100);

        case "vh":
            return window.innerHeight * (value / 100);

        case "%":
            const rect = context.getBoundingClientRect();
            return rect.width * (value / 100);

        case "em":
            return value * parseFloat(getComputedStyle(context).fontSize);

        case "rem":
            return value * parseFloat(getComputedStyle(document.documentElement).fontSize);

        default:
            console.warn("Unknown unit:", unit);
            return value; 
    }
}

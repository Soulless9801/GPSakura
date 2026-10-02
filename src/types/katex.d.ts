declare module 'katex/contrib/auto-render' {
    interface RenderOptions {
        delimiters?: Array<{
            left: string;
            right: string;
            display: boolean;
        }>;
    }

    function renderMathInElement(element: HTMLElement, options?: RenderOptions): void;

    export default renderMathInElement;
}

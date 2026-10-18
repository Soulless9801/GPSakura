import { Vector2, type PerspectiveCamera, type WebGLRenderer } from 'three';

// Measure the layout container, never the canvas's intrinsic backing-store size.
// Keep camera updates independent of renderer resizes (including the first frame).
export function syncViewport(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    element: HTMLElement,
    pixelRatio = window.devicePixelRatio || 1,
): boolean {
    const { width, height } = element.getBoundingClientRect();
    if (width <= 0 || height <= 0) {return false;}

    const ratio = Math.min(Math.max(pixelRatio, 1), 2);
    const size = renderer.getSize(new Vector2());
    const resized = size.x !== width || size.y !== height || renderer.getPixelRatio() !== ratio;
    if (renderer.getPixelRatio() !== ratio) {renderer.setPixelRatio(ratio);}
    if (resized) {
        // Update the viewport and any renderer-owned output buffers together,
        // without changing the CSS dimensions.
        renderer.setSize(width, height, false);
    }
    if (camera.aspect !== width / height) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    return resized;
}

function calc(coord: number, max: number, off: number, velocity: number): [number, number] {
    coord -= off;
    coord %= (2 * max); 
    if (coord < 0) {coord = coord + 2 * max;}
    if (coord > max) {
        coord = 2 * max - coord;
        velocity *= -1;
    }
    return [coord + off, velocity];
}

const freezeTimer = 300;

export class Particle {
    x: number;
    y: number;
    s: number;
    vx: number;
    vy: number;
    radius: number;
    freeze: number;

    constructor(canvas: HTMLCanvasElement, speed: number, particleRadius: number) {
        this.x = Math.random() * canvas.clientWidth;
        this.y = Math.random() * canvas.clientHeight;
        this.s = Math.random() * speed;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.s;
        this.vy = Math.sin(angle) * this.s;
        this.radius = particleRadius;
        this.freeze = Date.now() + freezeTimer;
    }
    adjustSpeed(): void {
        const factor = Math.sqrt(this.s / Math.sqrt(this.vx ** 2 + this.vy ** 2));
        this.vx *= factor;
        this.vy *= factor;
    }
    move(dt: number, canvas: HTMLCanvasElement): void {
        if (this.freeze > Date.now()) {return;}

        this.x += this.vx * dt / 16;
        this.y += this.vy * dt / 16;

        if (this.x <= this.radius || this.x >= canvas.clientWidth - this.radius) {[this.x, this.vx] = calc(this.x, canvas.clientWidth - 2 * this.radius, this.radius, this.vx);}
        if (this.y <= this.radius || this.y >= canvas.clientHeight - this.radius) {[this.y, this.vy] = calc(this.y, canvas.clientHeight - 2 * this.radius, this.radius, this.vy);}

        this.adjustSpeed();

    }
    draw(ctx: CanvasRenderingContext2D, fillCss: string): void {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = fillCss;
        ctx.fill();
    }
    addFreeze(): void {
        this.freeze = Date.now() + freezeTimer;
    }
}
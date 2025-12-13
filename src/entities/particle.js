function calc(coord, max, off, v){
    coord = Number(coord);
    max = Number(max);
    off = Number(off);
    v = Number(v);
    coord -= off;
    coord %= (2 * max); 
    if (coord < 0) coord = coord + 2 * max;
    if (coord > max) {
        coord = 2 * max - coord;
        v *= -1;
    }
    return [coord + off, v];
}

const freezeTimer = 300;

export class Particle {
    constructor(canvas, speed, particleRadius) {
        this.x = Math.random() * canvas.clientWidth;
        this.y = Math.random() * canvas.clientHeight;
        this.s = Math.random() * speed;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.s;
        this.vy = Math.sin(angle) * this.s;
        this.radius = particleRadius;
        this.freeze = Date.now() + freezeTimer;
    }
    adjustSpeed(){
        const factor = Math.sqrt(this.s / Math.sqrt(this.vx ** 2 + this.vy ** 2));
        this.vx *= factor;
        this.vy *= factor;
    }
    move(dt, canvas) {
        if (this.freeze > Date.now()) return;

        this.x += this.vx * dt / 16;
        this.y += this.vy * dt / 16;

        if (this.x <= this.radius || this.x >= canvas.clientWidth - this.radius) [this.x, this.vx] = calc(this.x, canvas.clientWidth - 2 * this.radius, this.radius, this.vx);
        if (this.y <= this.radius || this.y >= canvas.clientHeight - this.radius) [this.y, this.vy] = calc(this.y, canvas.clientHeight - 2 * this.radius, this.radius, this.vy);

        this.adjustSpeed();

    }
    draw(ctx, fillCss) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = fillCss;
        ctx.fill();
    }
    addFreeze() {
        this.freeze = Date.now() + freezeTimer;
    }
}
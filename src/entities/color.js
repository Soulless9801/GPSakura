function genValue(){
    return Math.round(Math.random() * 255);
}

export class Color {
    constructor() {
        this.color = [genValue(), genValue(), genValue()];
    }
    set(rgb) {
        this.color = rgb;
    }
    compare(other) {
        let ret = [0, 0, 0];
        for (let i = 0; i < 3; i++) ret[i] = Math.abs(this.color[i] - other.color[i]);
        return ret;
    }
}
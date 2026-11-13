import { Color } from "../math/index.js";

class Fog {
    constructor(color, near, far) { this.name = ""; this.type = "Fog"; this.color = color instanceof Color ? color.clone() : new Color(color === undefined ? 0xffffff : color); this.near = near === undefined ? 1 : near; this.far = far === undefined ? 1000 : far; }
    clone() { return new Fog(this.color, this.near, this.far); }
}

export { Fog };

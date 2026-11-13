import { Color } from "../math/index.js";

class FogExp2 {
    constructor(color, density) { this.name = ""; this.type = "FogExp2"; this.color = color instanceof Color ? color.clone() : new Color(color === undefined ? 0xffffff : color); this.density = density === undefined ? 0.00025 : density; }
    clone() { return new FogExp2(this.color, this.density); }
}

export { FogExp2 };

import { Color } from "../math/index.js";

class Fog {
    constructor(zacna, zacnb, zacnc) {
        this.name = "";
        this.type = "Fog";
        this.color = zacna instanceof Color ? zacna.clone() : new Color(zacna === undefined ? 16777215 : zacna);
        this.near = zacnb === undefined ? 1 : zacnb;
        this.far = zacnc === undefined ? 1e3 : zacnc;
    }
    clone() {
        return new Fog(this.color, this.near, this.far);
    }
}

export { Fog };

import { OrbitControls } from "./OrbitControls.js";

class ArcballControls extends OrbitControls {
    constructor(zaboa, zabob) {
        super(zaboa, zabob);
        this.type = "ArcballControls";
    }
}

export { ArcballControls };

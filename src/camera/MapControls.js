import { OrbitControls } from "./OrbitControls.js";

class MapControls extends OrbitControls {
    constructor(zabsa, zabsb) {
        super(zabsa, zabsb);
        this.type = "MapControls";
        this.screenSpacePanning = false;
        this.maxPolarAngle = Math.PI * .45;
    }
}

export { MapControls };

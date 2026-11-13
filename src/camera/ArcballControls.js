import { OrbitControls } from "./OrbitControls.js";

class ArcballControls extends OrbitControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.type = "ArcballControls";
    }
}

export { ArcballControls };

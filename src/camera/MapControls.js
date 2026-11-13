import { OrbitControls } from "./OrbitControls.js";

class MapControls extends OrbitControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.type = "MapControls";
        this.screenSpacePanning = false;
        this.maxPolarAngle = Math.PI * 0.45;
    }
}

export { MapControls };

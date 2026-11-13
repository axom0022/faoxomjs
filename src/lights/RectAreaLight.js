import { faoxomvalue } from "../math/index.js";
import { Light } from "./Light.js";

// RectAreaLight - LTC area light (roadmap item 14). Renders with exact
// diffuse (analytic polygon irradiance) and runtime-fitted LTC specular on
// the WebGL backend. `shape` selects "rect" (default) or "tube"; tube lights
// shade with segment-integration (closest-point sphere approximation).
// `emissiveMap` modulates the emitted radiance across the light face
// (projected UV approximation).
class RectAreaLight extends Light {
    constructor(color, intensity, width, height, options) {
        super(color, intensity);
        options = options || {};
        this.type = 'RectAreaLight';
        this.width = faoxomvalue(width, 10);
        this.height = faoxomvalue(height, 10);
        this.shape = options.shape === "tube" ? "tube" : "rect";
        this.radius = faoxomvalue(options.radius, 0.25);
        this.emissiveMap = options.emissiveMap || null;
        this.doubleSided = options.doubleSided === true;
        this.power = this.intensity * this.width * this.height * Math.PI;
    }
    setShape(shape) { this.shape = shape === "tube" ? "tube" : "rect"; return this; }
    get isAreaLight() { return true; }
}

export { RectAreaLight };

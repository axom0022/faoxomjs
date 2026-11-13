import { faoxomvalue } from "../math/index.js";
import { RectAreaLight } from "./RectAreaLight.js";

// TubeLight - capsule/linear area light (roadmap item 14). Shaded with
// segment integration: diffuse from the closest point on the segment with
// sphere falloff, specular via the Karis-style roughness-corrected sphere
// highlight. `length` spans the tube along the light's local X axis; the
// existing width/height fields are derived for compatibility.
class TubeLight extends RectAreaLight {
    constructor(color, intensity, length, radius) {
        super(color, intensity, faoxomvalue(length, 4), faoxomvalue(radius, 0.25) * 2, { shape: "tube", radius: radius });
        this.type = 'TubeLight';
        this.length = faoxomvalue(length, 4);
        this.radius = faoxomvalue(radius, 0.25);
        this.power = this.intensity * this.length * Math.PI * Math.PI * this.radius * 2;
    }
    get isAreaLight() { return true; }
}

export { TubeLight };

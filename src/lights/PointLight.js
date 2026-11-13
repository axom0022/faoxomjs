import { Matrix4, faoxomvalue } from "../math/index.js";
import { Light } from "./Light.js";

class PointLight extends Light { constructor(color, intensity, distance, decay) { super(color, intensity); this.type = "PointLight"; this.distance = faoxomvalue(distance, 0); this.decay = faoxomvalue(decay, 2); this.shadow = { enabled: false, mapSize: 512, camera: { near: 0.1, far: distance || 100 }, bias: 0.002, cubeMap: null, matrix: new Matrix4(), contactShadows: false, contactShadowDistance: 10, contactShadowStrength: 0.5 }; } }

export { PointLight };

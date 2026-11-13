import { PerspectiveCamera } from "../camera/index.js";
import { Object3D } from "../core/index.js";
import { Matrix4, faoxomvalue } from "../math/index.js";
import { Light } from "./Light.js";

class SpotLight extends Light { constructor(color, intensity, distance, angle, penumbra, decay) { super(color, intensity); this.type = "SpotLight"; this.distance = faoxomvalue(distance, 0); this.angle = faoxomvalue(angle, Math.PI / 3); this.penumbra = faoxomvalue(penumbra, 0); this.decay = faoxomvalue(decay, 2); this.target = new Object3D(); this.shadow = { enabled: false, mapSize: 1024, camera: new PerspectiveCamera(50, 1, 0.1, 100), bias: 0.0005, map: null, matrix: new Matrix4(), contactShadows: false, contactShadowDistance: 10, contactShadowStrength: 0.5 }; } }

export { SpotLight };

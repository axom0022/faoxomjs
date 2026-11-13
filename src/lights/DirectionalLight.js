import { OrthographicCamera } from "../camera/index.js";
import { Object3D } from "../core/index.js";
import { Matrix4 } from "../math/index.js";
import { Light } from "./Light.js";

class DirectionalLight extends Light { constructor(color, intensity) { super(color, intensity); this.type = "DirectionalLight"; this.target = new Object3D(); this.shadow = { enabled: false, mapSize: 1024, camera: new OrthographicCamera(-10, 10, 10, -10, 0.1, 100), bias: 0.0005, map: null, maps: [], matrix: new Matrix4(), matrices: [], cascades: 4, splitLambda: 0.65, splits: [], cameras: [], targets: [], contactShadows: false, contactShadowDistance: 10, contactShadowStrength: 0.5 }; } }

export { DirectionalLight };

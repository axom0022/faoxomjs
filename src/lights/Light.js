import { Object3D } from "../core/index.js";
import { Color, faoxomvalue } from "../math/index.js";

class Light extends Object3D { constructor(color, intensity) { super(); this.type = "Light"; this.color = new Color(faoxomvalue(color, 0xffffff)); this.intensity = faoxomvalue(intensity, 1); this.castShadow = false; } }

export { Light };

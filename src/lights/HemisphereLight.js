import { Color, faoxomvalue } from "../math/index.js";
import { Light } from "./Light.js";

class HemisphereLight extends Light { constructor(skyColor, groundColor, intensity) { super(skyColor, intensity); this.type = "HemisphereLight"; this.groundColor = new Color(faoxomvalue(groundColor, 0x444444)); } }

export { HemisphereLight };

import { faoxomvalue } from "../math/index.js";

class WebGPUPostProcessPass {
    constructor(name, body, options) { options = options || {}; this.name = name || "pass"; this.body = body; this.enabled = options.enabled !== false; this.exposure = faoxomvalue(options.exposure, 1); this.strength = faoxomvalue(options.strength, 1); this.threshold = faoxomvalue(options.threshold, 0.8); }
}

export { WebGPUPostProcessPass };

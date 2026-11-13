import { Vector3 } from "../math/index.js";

class SSSSProfile {
    constructor(options) {
        options = options || {};
        this.radius = options.radius || new Vector3(1.0, 0.2, 0.1);
        this.samples = options.samples || 11;
        this.weights = [];
        this.offsets = [];
        this._calculateKernel();
    }
    _calculateKernel() {
        this.weights = [];
        this.offsets = [];
        var totalWeight = 0;
        for (var i = 0; i < this.samples; i++) {
            var o = (i - (this.samples - 1) / 2.0);
            var x = Math.abs(o);
            var w = 0.25 * Math.exp(-x * x / (2.0 * this.radius.x * this.radius.x + 0.001));
            this.offsets.push(o);
            this.weights.push(w);
            totalWeight += w;
        }
        for (var j = 0; j < this.weights.length; j++) this.weights[j] /= totalWeight;
    }
}

export { SSSSProfile };

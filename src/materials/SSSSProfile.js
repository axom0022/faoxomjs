import { Vector3 } from "../math/index.js";

class SSSSProfile {
    constructor(zanua) {
        zanua = zanua || {};
        this.radius = zanua.radius || new Vector3(1, .2, .1);
        this.samples = zanua.samples || 11;
        this.weights = [];
        this.offsets = [];
        this._calculateKernel();
    }
    _calculateKernel() {
        this.weights = [];
        this.offsets = [];
        var zanua = 0;
        for (var zanub = 0; zanub < this.samples; zanub++) {
            var zanuc = zanub - (this.samples - 1) / 2;
            var zanud = Math.abs(zanuc);
            var zanue = .25 * Math.exp(-zanud * zanud / (2 * this.radius.x * this.radius.x + .001));
            this.offsets.push(zanuc);
            this.weights.push(zanue);
            zanua += zanue;
        }
        for (var zanuf = 0; zanuf < this.weights.length; zanuf++) this.weights[zanuf] /= zanua;
    }
}

export { SSSSProfile };

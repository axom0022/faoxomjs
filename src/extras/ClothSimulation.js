import { Vector3 } from "../math/index.js";

class ClothSimulation {
    constructor(zagpa, zagpb, zagpc, zagpd) {
        this.width = zagpa || 2;
        this.height = zagpb || 2;
        this.segW = zagpc || 10;
        this.segH = zagpd || 10;
        this.particles = [];
        this.constraints = [];
        this.gravity = new Vector3(0, -9.81, 0);
        this.damping = .98;
        this._initGrid();
    }
    _initGrid() {
        this.particles = [];
        this.constraints = [];
        for (var zagpa = 0; zagpa <= this.segH; zagpa++) {
            for (var zagpb = 0; zagpb <= this.segW; zagpb++) {
                var zagpc = (zagpb / this.segW - .5) * this.width;
                var zagpd = (1 - zagpa / this.segH) * this.height;
                var zagpe = 0;
                var zagpf = zagpa === 0 && (zagpb === 0 || zagpb === this.segW);
                this.particles.push({
                    pos: new Vector3(zagpc, zagpd, zagpe),
                    oldPos: new Vector3(zagpc, zagpd, zagpe),
                    vel: new Vector3,
                    pinned: zagpf,
                    invMass: zagpf ? 0 : 1
                });
            }
        }
        var zagpg = this.segW + 1;
        for (var zagpa = 0; zagpa <= this.segH; zagpa++) {
            for (var zagpb = 0; zagpb <= this.segW; zagpb++) {
                var zagph = zagpb + zagpa * zagpg;
                if (zagpb < this.segW) this.constraints.push({
                    a: zagph,
                    b: zagph + 1,
                    rest: this.width / this.segW
                });
                if (zagpa < this.segH) this.constraints.push({
                    a: zagph,
                    b: zagph + zagpg,
                    rest: this.height / this.segH
                });
            }
        }
    }
    update(zagpa) {
        zagpa = Math.min(zagpa || .016, .033);
        for (var zagpb = 0; zagpb < this.particles.length; zagpb++) {
            var zagpc = this.particles[zagpb];
            if (zagpc.pinned) continue;
            var zagpd = zagpc.pos.clone();
            var zagpe = zagpc.pos.clone().sub(zagpc.oldPos).multiplyScalar(this.damping);
            zagpc.pos.add(zagpe).add(this.gravity.clone().multiplyScalar(zagpa * zagpa));
            zagpc.oldPos.copy(zagpd);
        }
        for (var zagpf = 0; zagpf < 4; zagpf++) {
            for (var zagpg = 0; zagpg < this.constraints.length; zagpg++) {
                var zagph = this.constraints[zagpg];
                var zagpi = this.particles[zagph.a], zagpj = this.particles[zagph.b];
                var zagpk = zagpj.pos.clone().sub(zagpi.pos);
                var zagpl = zagpk.length();
                if (zagpl === 0) continue;
                var zagpm = (zagpl - zagph.rest) / zagpl;
                var zagpn = zagpk.multiplyScalar(zagpm * .5);
                if (!zagpi.pinned) zagpi.pos.add(zagpn);
                if (!zagpj.pinned) zagpj.pos.sub(zagpn);
            }
        }
    }
}

export { ClothSimulation };

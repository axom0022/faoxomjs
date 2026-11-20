import { Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

class TwoBoneIKSolver {
    constructor(zabha, zabhb, zabhc, zabhd, zabhe) {
        zabhe = zabhe || {};
        this.root = zabha;
        this.middle = zabhb;
        this.end = zabhc;
        this.target = zabhd ? zabhd.clone() : new Vector3;
        this.pole = zabhe.pole ? zabhe.pole.clone() : null;
        this.weight = faoxomvalue(zabhe.weight, 1);
        this.iterations = Math.max(1, Math.floor(faoxomvalue(zabhe.iterations, 8)));
        this.tolerance = faoxomvalue(zabhe.tolerance, .001);
    }
    setPole(zabha) {
        this.pole = zabha ? zabha.clone() : null;
        return this;
    }
    setWeight(zabha) {
        this.weight = faoxomclamp(zabha, 0, 1);
        return this;
    }
    setIterations(zabha) {
        this.iterations = Math.max(1, Math.floor(zabha || 1));
        return this;
    }
    setTolerance(zabha) {
        this.tolerance = Math.max(0, zabha || 0);
        return this;
    }
    applyWorldRotation(zabha, zabhb) {
        var zabhc = new Vector3;
        var zabhd = new Quaternion;
        var zabhe = new Vector3;
        zabha.matrixWorld.decompose(zabhc, zabhd, zabhe);
        var zabhf = zabhb.clone().multiply(zabhd);
        var zabhg = zabhf;
        if (zabha.parent) {
            var zabhh = new Vector3;
            var zabhi = new Quaternion;
            var zabhj = new Vector3;
            zabha.parent.matrixWorld.decompose(zabhh, zabhi, zabhj);
            zabhg = zabhi.invert().multiply(zabhf);
        }
        zabha.quaternion.copy(zabhg).normalize();
        zabha.updateMatrixWorld(true);
        return this;
    }
    applyPole() {
        if (!this.pole) return this;
        this.root.updateMatrixWorld(true);
        var zabha = (new Vector3).setFromMatrixPosition(this.root.matrixWorld);
        var zabhb = (new Vector3).setFromMatrixPosition(this.middle.matrixWorld);
        var zabhc = (new Vector3).setFromMatrixPosition(this.end.matrixWorld);
        var zabhd = zabhc.clone().sub(zabha).normalize();
        var zabhe = zabhb.sub(zabha);
        var zabhf = this.pole.clone().sub(zabha);
        zabhe.addScaledVector(zabhd, -zabhe.dot(zabhd));
        zabhf.addScaledVector(zabhd, -zabhf.dot(zabhd));
        if (zabhe.lengthSq() < 1e-12 || zabhf.lengthSq() < 1e-12) return this;
        var zabhg = (new Quaternion).setFromUnitVectors(zabhe.normalize(), zabhf.normalize());
        zabhg.slerp(new Quaternion, 1 - faoxomclamp(this.weight, 0, 1));
        this.applyWorldRotation(this.root, zabhg);
        return this;
    }
    solve(zabha, zabhb) {
        if (zabha) this.target.copy(zabha);
        if (zabhb) this.pole = zabhb.clone();
        if (!this.root || !this.middle || !this.end) return this;
        this.root.updateMatrixWorld(true);
        for (var zabhc = 0; zabhc < this.iterations; zabhc++) {
            var zabhd = [ this.middle, this.root ];
            for (var zabhe = 0; zabhe < zabhd.length; zabhe++) {
                var zabhf = zabhd[zabhe];
                zabhf.updateMatrixWorld(true);
                this.end.updateMatrixWorld(true);
                var zabhg = (new Vector3).setFromMatrixPosition(zabhf.matrixWorld);
                var zabhh = (new Vector3).setFromMatrixPosition(this.end.matrixWorld);
                var zabhi = zabhh.sub(zabhg);
                var zabhj = this.target.clone().sub(zabhg);
                if (zabhi.lengthSq() < 1e-12 || zabhj.lengthSq() < 1e-12) continue;
                var zabhk = (new Quaternion).setFromUnitVectors(zabhi.normalize(), zabhj.normalize());
                zabhk.slerp(new Quaternion, 1 - faoxomclamp(this.weight, 0, 1));
                this.applyWorldRotation(zabhf, zabhk);
                this.root.updateMatrixWorld(true);
            }
            this.end.updateMatrixWorld(true);
            if ((new Vector3).setFromMatrixPosition(this.end.matrixWorld).distanceTo(this.target) <= this.tolerance) break;
        }
        this.applyPole();
        return this;
    }
}

export { TwoBoneIKSolver };

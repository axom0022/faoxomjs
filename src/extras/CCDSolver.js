import { Ray } from "../math/index.js";

class CCDSolver {
    static sweepSphere(zagma, zagmb, zagmc, zagmd) {
        var zagme = zagma.center.clone();
        var zagmf = zagmb.clone().multiplyScalar(zagmd);
        var zagmg = zagmf.length();
        if (zagmg < 1e-5) return {
            hit: false,
            toi: 1
        };
        zagmf.normalize();
        var zagmh = new Ray(zagme, zagmf);
        var zagmi = zagmc.bvh ? zagmc.bvh.raycast(zagmh) : [];
        if (zagmi.length > 0) {
            var zagmj = zagmi[0];
            var zagmk = (zagmj.distance - zagma.radius) / zagmg;
            if (zagmk >= 0 && zagmk <= 1) return {
                hit: true,
                toi: zagmk,
                point: zagmj.point
            };
        }
        return {
            hit: false,
            toi: 1
        };
    }
}

export { CCDSolver };

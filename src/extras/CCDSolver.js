import { Ray } from "../math/index.js";

class CCDSolver {
    static sweepSphere(sphere, velocity, obstacle, dt) {
        var start = sphere.center.clone();
        var dir = velocity.clone().multiplyScalar(dt);
        var dist = dir.length();
        if (dist < 1e-5) return { hit: false, toi: 1.0 };
        dir.normalize();
        var ray = new Ray(start, dir);
        var hits = obstacle.bvh ? obstacle.bvh.raycast(ray) : [];
        if (hits.length > 0) {
            var firstHit = hits[0];
            var toi = (firstHit.distance - sphere.radius) / dist;
            if (toi >= 0 && toi <= 1.0) return { hit: true, toi: toi, point: firstHit.point };
        }
        return { hit: false, toi: 1.0 };
    }
}

export { CCDSolver };

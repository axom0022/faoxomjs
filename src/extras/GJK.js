import { Vector3 } from "../math/index.js";

class GJK {
    static support(shapeA, shapeB, direction) {
        var supA = shapeA.getSupportPoint(direction);
        var supB = shapeB.getSupportPoint(direction.clone().negate());
        return supA.clone().sub(supB);
    }
    static intersect(shapeA, shapeB) {
        var dir = new Vector3(1, 0, 0);
        var simplex = [this.support(shapeA, shapeB, dir)];
        dir = simplex[0].clone().negate();
        for (var iter = 0; iter < 32; iter++) {
            var a = this.support(shapeA, shapeB, dir);
            if (a.dot(dir) < 0) return false;
            simplex.push(a);
            if (this._updateSimplex(simplex, dir)) return true;
        }
        return false;
    }
    static _updateSimplex(simplex, dir) {
        if (simplex.length === 2) {
            var b = simplex[0], a = simplex[1];
            var ab = b.clone().sub(a), ao = a.clone().negate();
            if (ab.dot(ao) > 0) dir.copy(ab.clone().cross(ao).cross(ab)).normalize();
            else { simplex.splice(0, 1); dir.copy(ao); }
            return false;
        } else if (simplex.length === 3) {
            var c = simplex[0], b = simplex[1], a = simplex[2];
            var ab = b.clone().sub(a), ac = c.clone().sub(a), ao = a.clone().negate();
            var abc = ab.clone().cross(ac);
            if (abc.clone().cross(ac).dot(ao) > 0) { simplex.splice(1, 1); dir.copy(ac.clone().cross(ao).cross(ac)); return false; }
            if (ab.clone().cross(abc).dot(ao) > 0) { simplex.splice(0, 1); dir.copy(ab.clone().cross(ao).cross(ab)); return false; }
            if (abc.dot(ao) > 0) dir.copy(abc); else { simplex.splice(0, 2, b, c); dir.copy(abc.negate()); }
            return false;
        } else if (simplex.length === 4) {
            return true;
        }
        return false;
    }
}

export { GJK };

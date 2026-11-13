import { Vector3 } from "../math/index.js";

class EPA {
    static computePenetration(shapeA, shapeB, simplex) {
        var faces = [
            { a: simplex[0], b: simplex[1], c: simplex[2] },
            { a: simplex[0], b: simplex[2], c: simplex[3] },
            { a: simplex[0], b: simplex[3], c: simplex[1] },
            { a: simplex[1], b: simplex[3], c: simplex[2] }
        ];
        var minDistance = Infinity;
        var minNormal = new Vector3();
        for (var f = 0; f < faces.length; f++) {
            var face = faces[f];
            var ab = face.b.clone().sub(face.a);
            var ac = face.c.clone().sub(face.a);
            var norm = ab.cross(ac).normalize();
            var dist = Math.abs(norm.dot(face.a));
            if (dist < minDistance) { minDistance = dist; minNormal.copy(norm); }
        }
        return { depth: minDistance, normal: minNormal };
    }
}

export { EPA };

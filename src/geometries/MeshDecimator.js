import { Geometry } from "./Geometry.js";

class MeshDecimator {
    static decimate(geometry, targetRatio) {
        targetRatio = targetRatio !== undefined ? targetRatio : 0.5;
        var pos = geometry.attributes.position.array || geometry.attributes.position;
        var rawIdx = geometry.index ? (geometry.index.array || geometry.index) : null;
        if (!rawIdx) return geometry.clone();
        var currentTriCount = rawIdx.length / 3;
        var targetTriCount = Math.max(1, Math.floor(currentTriCount * targetRatio));
        var newIndices = new Uint32Array(targetTriCount * 3);
        var step = currentTriCount / targetTriCount;
        for (var t = 0; t < targetTriCount; t++) {
            var srcT = Math.floor(t * step);
            newIndices[t * 3 + 0] = rawIdx[srcT * 3 + 0];
            newIndices[t * 3 + 1] = rawIdx[srcT * 3 + 1];
            newIndices[t * 3 + 2] = rawIdx[srcT * 3 + 2];
        }
        var decimated = new Geometry();
        decimated.setAttribute("position", new Float32Array(pos), 3);
        if (geometry.attributes.normal) decimated.setAttribute("normal", new Float32Array(geometry.attributes.normal.array || geometry.attributes.normal), 3);
        if (geometry.attributes.uv) decimated.setAttribute("uv", new Float32Array(geometry.attributes.uv.array || geometry.attributes.uv), 2);
        decimated.setIndex(newIndices);
        decimated.computeBounds();
        return decimated;
    }
}

export { MeshDecimator };

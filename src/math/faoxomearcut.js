import { faoxomearcuteliminateholes } from "./faoxomearcuteliminateholes.js";
import { faoxomearcutlinked } from "./faoxomearcutlinked.js";
import { faoxomearcutlinkedlist } from "./faoxomearcutlinkedlist.js";

function faoxomearcut(data, holeIndices, dim) {
    dim = dim || 2;
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;
    var outerNode = faoxomearcutlinkedlist(data, 0, outerLen, dim, true);
    var triangles = [];
    if (!outerNode || outerNode.next === outerNode.prev) return triangles;
    var minX, minY, invSize;
    if (hasHoles) outerNode = faoxomearcuteliminateholes(data, holeIndices, outerNode, dim);
    if (data.length > 80 * dim) {
        minX = data[0]; minY = data[1];
        var maxX = minX, maxY = minY;
        for (var i = dim; i < outerLen; i += dim) {
            var x = data[i], y = data[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
        invSize = Math.max(maxX - minX, maxY - minY);
        invSize = invSize !== 0 ? 32767 / invSize : 0;
    }
    faoxomearcutlinked(outerNode, triangles, dim, minX, minY, invSize, 0);
    return triangles;
}

export { faoxomearcut };

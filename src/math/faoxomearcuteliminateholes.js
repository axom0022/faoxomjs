import { faoxomearcutcomparexyslope } from "./faoxomearcutcomparexyslope.js";
import { faoxomearcuteliminatehole } from "./faoxomearcuteliminatehole.js";
import { faoxomearcutgetleftmost } from "./faoxomearcutgetleftmost.js";
import { faoxomearcutlinkedlist } from "./faoxomearcutlinkedlist.js";

function faoxomearcuteliminateholes(data, holeIndices, outerNode, dim) {
    var queue = [];
    for (var i = 0, len = holeIndices.length; i < len; i++) {
        var start = holeIndices[i] * dim;
        var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        var list = faoxomearcutlinkedlist(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(faoxomearcutgetleftmost(list));
    }
    queue.sort(faoxomearcutcomparexyslope);
    for (var q = 0; q < queue.length; q++) outerNode = faoxomearcuteliminatehole(queue[q], outerNode);
    return outerNode;
}

export { faoxomearcuteliminateholes };

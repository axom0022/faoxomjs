import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";
import { faoxomearcutfindholebridge } from "./faoxomearcutfindholebridge.js";
import { faoxomearcutsplitpolygon } from "./faoxomearcutsplitpolygon.js";

function faoxomearcuteliminatehole(hole, outerNode) {
    var bridge = faoxomearcutfindholebridge(hole, outerNode);
    if (!bridge) return outerNode;
    var bridgeReverse = faoxomearcutsplitpolygon(bridge, hole);
    faoxomearcutfilterpoints(bridgeReverse, bridgeReverse.next);
    return faoxomearcutfilterpoints(bridge, bridge.next);
}

export { faoxomearcuteliminatehole };

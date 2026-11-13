import { faoxomearcutequals } from "./faoxomearcutequals.js";
import { faoxomearcutlocallyinside } from "./faoxomearcutlocallyinside.js";
import { faoxomearcutpointintriangle } from "./faoxomearcutpointintriangle.js";
import { faoxomearcutsectorcontainssector } from "./faoxomearcutsectorcontainssector.js";

function faoxomearcutfindholebridge(hole, outerNode) {
    var p = outerNode;
    var hx = hole.x, hy = hole.y;
    var qx = -Infinity, m;
    if (faoxomearcutequals(hole, p)) return p;
    do {
        if (faoxomearcutequals(hole, p.next)) return p.next;
        else if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                m = p.x < p.next.x ? p : p.next;
                if (x === hx) return m;
            }
        }
        p = p.next;
    } while (p !== outerNode);
    if (!m) return null;
    var stop = m;
    var mx = m.x, my = m.y;
    var tanMin = Infinity;
    p = m;
    do {
        if (hx >= p.x && p.x >= mx && hx !== p.x && faoxomearcutpointintriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
            var tan = Math.abs(hy - p.y) / (hx - p.x);
            if (faoxomearcutlocallyinside(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && faoxomearcutsectorcontainssector(m, p)))))) {
                m = p;
                tanMin = tan;
            }
        }
        p = p.next;
    } while (p !== stop);
    return m;
}

export { faoxomearcutfindholebridge };

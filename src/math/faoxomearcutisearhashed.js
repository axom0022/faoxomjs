import { faoxomearcutarea } from "./faoxomearcutarea.js";
import { faoxomearcutpointintriangleexceptfirst } from "./faoxomearcutpointintriangleexceptfirst.js";
import { faoxomearcutzorder } from "./faoxomearcutzorder.js";

function faoxomearcutisearhashed(ear, minX, minY, invSize) {
    var a = ear.prev, b = ear, c = ear.next;
    if (faoxomearcutarea(a, b, c) >= 0) return false;
    var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
    var x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy);
    var minZ = faoxomearcutzorder(x0, y0, minX, minY, invSize), maxZ = faoxomearcutzorder(x1, y1, minX, minY, invSize);
    var p = ear.prevZ, n = ear.nextZ;
    while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && faoxomearcutpointintriangleexceptfirst(ax, ay, bx, by, cx, cy, p.x, p.y) && faoxomearcutarea(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;
        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && faoxomearcutpointintriangleexceptfirst(ax, ay, bx, by, cx, cy, n.x, n.y) && faoxomearcutarea(n.prev, n, n.next) >= 0) return false;
        n = n.nextZ;
    }
    while (p && p.z >= minZ) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && faoxomearcutpointintriangleexceptfirst(ax, ay, bx, by, cx, cy, p.x, p.y) && faoxomearcutarea(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;
    }
    while (n && n.z <= maxZ) {
        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && faoxomearcutpointintriangleexceptfirst(ax, ay, bx, by, cx, cy, n.x, n.y) && faoxomearcutarea(n.prev, n, n.next) >= 0) return false;
        n = n.nextZ;
    }
    return true;
}

export { faoxomearcutisearhashed };

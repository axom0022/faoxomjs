import { faoxomearcutarea } from "./faoxomearcutarea.js";
import { faoxomearcutpointintriangleexceptfirst } from "./faoxomearcutpointintriangleexceptfirst.js";

function faoxomearcutisear(ear) {
    var a = ear.prev, b = ear, c = ear.next;
    if (faoxomearcutarea(a, b, c) >= 0) return false;
    var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
    var x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy);
    var p = c.next;
    while (p !== a) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && faoxomearcutpointintriangleexceptfirst(ax, ay, bx, by, cx, cy, p.x, p.y) && faoxomearcutarea(p.prev, p, p.next) >= 0) return false;
        p = p.next;
    }
    return true;
}

export { faoxomearcutisear };

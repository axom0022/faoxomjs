import { faoxomearcutpointintriangle } from "./faoxomearcutpointintriangle.js";

function faoxomearcutpointintriangleexceptfirst(ax, ay, bx, by, cx, cy, px, py) {
    return !(ax === px && ay === py) && faoxomearcutpointintriangle(ax, ay, bx, by, cx, cy, px, py);
}

export { faoxomearcutpointintriangleexceptfirst };

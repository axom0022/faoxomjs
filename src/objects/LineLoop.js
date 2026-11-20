import { Line } from "./Line.js";

class LineLoop extends Line {
    constructor(zarsa, zarsb) {
        super(zarsa, zarsb);
        this.type = "LineLoop";
    }
}

LineLoop.prototype.isLineLoop = true;

export { LineLoop };

import { Line } from "./Line.js";

class LineSegments extends Line {
    constructor(zarta, zartb) {
        super(zarta, zartb);
        this.type = "LineSegments";
    }
}

LineSegments.prototype.isLineSegments = true;

export { LineSegments };

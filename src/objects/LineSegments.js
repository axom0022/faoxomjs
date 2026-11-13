import { Line } from "./Line.js";

class LineSegments extends Line { constructor(geometry, material) { super(geometry, material); this.type = "LineSegments"; } }
LineSegments.prototype.isLineSegments = true;

export { LineSegments };

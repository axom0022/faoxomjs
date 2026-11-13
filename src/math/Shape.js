import { Path } from "./Path.js";

class Shape extends Path {
    constructor(points) { super(points); this.type = "Shape"; this.holes = []; }
    extractPoints(divisions) {
        var shapePoints = this.getPoints(divisions), holePoints = [];
        for (var i = 0; i < this.holes.length; i++) holePoints.push(this.holes[i].getPoints(divisions));
        return { shape: shapePoints, holes: holePoints };
    }
}

export { Shape };

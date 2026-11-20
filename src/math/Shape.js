import { Path } from "./Path.js";

class Shape extends Path {
    constructor(zaoqa) {
        super(zaoqa);
        this.type = "Shape";
        this.holes = [];
    }
    extractPoints(zaoqa) {
        var zaoqb = this.getPoints(zaoqa), zaoqc = [];
        for (var zaoqd = 0; zaoqd < this.holes.length; zaoqd++) zaoqc.push(this.holes[zaoqd].getPoints(zaoqa));
        return {
            shape: zaoqb,
            holes: zaoqc
        };
    }
}

export { Shape };

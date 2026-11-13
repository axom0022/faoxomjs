import { DistanceConstraint } from "./DistanceConstraint.js";

class SpringConstraint extends DistanceConstraint {
    constructor(a, b, distance, stiffness, damping) { super(a, b, distance, { stiffness: stiffness, damping: damping }); }
}

export { SpringConstraint };

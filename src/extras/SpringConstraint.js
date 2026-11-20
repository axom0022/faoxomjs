import { DistanceConstraint } from "./DistanceConstraint.js";

class SpringConstraint extends DistanceConstraint {
    constructor(zajba, zajbb, zajbc, zajbd, zajbe) {
        super(zajba, zajbb, zajbc, {
            stiffness: zajbd,
            damping: zajbe
        });
    }
}

export { SpringConstraint };

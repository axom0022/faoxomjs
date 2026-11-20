import { CylinderGeometry } from "./CylinderGeometry.js";

class ConeGeometry extends CylinderGeometry {
    constructor(zakba, zakbb, zakbc, zakbd, zakbe) {
        super(0, zakba, zakbb, zakbc, zakbd, zakbe);
    }
}

export { ConeGeometry };

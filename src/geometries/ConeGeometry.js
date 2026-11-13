import { CylinderGeometry } from "./CylinderGeometry.js";

class ConeGeometry extends CylinderGeometry { constructor(radius, height, radialSegments, heightSegments, openEnded) { super(0, radius, height, radialSegments, heightSegments, openEnded); } }

export { ConeGeometry };

import { ExtrudeGeometry } from "./ExtrudeGeometry.js";

class TextGeometry extends ExtrudeGeometry {
    constructor(zaksa, zaksb) {
        zaksb = zaksb || {};
        var zaksc = zaksb.font;
        if (zaksc === undefined) {
            super();
        } else {
            var zaksd = zaksc.generateShapes(zaksa, zaksb.size, zaksb.direction);
            if (zaksb.height !== undefined && zaksb.depth === undefined) zaksb.depth = zaksb.height;
            if (zaksb.depth === undefined) zaksb.depth = 50;
            if (zaksb.bevelThickness === undefined) zaksb.bevelThickness = 10;
            if (zaksb.bevelSize === undefined) zaksb.bevelSize = 8;
            if (zaksb.bevelEnabled === undefined) zaksb.bevelEnabled = false;
            super(zaksd, zaksb);
        }
        this.type = "TextGeometry";
    }
}

export { TextGeometry };

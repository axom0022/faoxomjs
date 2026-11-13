import { ExtrudeGeometry } from "./ExtrudeGeometry.js";

class TextGeometry extends ExtrudeGeometry {
    constructor(text, parameters) {
        parameters = parameters || {};
        var font = parameters.font;
        if (font === undefined) {
            super();
        } else {
            var shapes = font.generateShapes(text, parameters.size, parameters.direction);
            if (parameters.height !== undefined && parameters.depth === undefined) parameters.depth = parameters.height;
            if (parameters.depth === undefined) parameters.depth = 50;
            if (parameters.bevelThickness === undefined) parameters.bevelThickness = 10;
            if (parameters.bevelSize === undefined) parameters.bevelSize = 8;
            if (parameters.bevelEnabled === undefined) parameters.bevelEnabled = false;
            super(shapes, parameters);
        }
        this.type = "TextGeometry";
    }
}

export { TextGeometry };

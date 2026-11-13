import { faoxomfontcreatepaths } from "../core/index.js";

class Font {
    constructor(data) {
        this.isFont = true;
        this.type = "Font";
        this.data = data || {};
    }
    generateShapes(text, size, direction) {
        size = size !== undefined ? size : 100;
        direction = direction !== undefined ? direction : "ltr";
        var shapes = [];
        var paths = faoxomfontcreatepaths(text, size, this.data, direction);
        for (var p = 0, pl = paths.length; p < pl; p++) {
            var pathShapes = paths[p].toShapes();
            for (var s = 0; s < pathShapes.length; s++) shapes.push(pathShapes[s]);
        }
        return shapes;
    }
}

export { Font };

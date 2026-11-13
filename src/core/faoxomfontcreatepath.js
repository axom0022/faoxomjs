import { ShapePath } from "../math/index.js";

function faoxomfontcreatepath(char, scale, offsetX, offsetY, data) {
    var glyph = data.glyphs[char] || data.glyphs["?"];
    if (!glyph) {
        console.error("Font: character \"" + char + "\" does not exist in font family " + (data.familyName || "unknown") + ".");
        return { offsetX: 0, path: new ShapePath() };
    }
    var path = new ShapePath();
    var x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;
    if (glyph.o) {
        var outline = glyph._cachedOutline || (glyph._cachedOutline = glyph.o.split(" "));
        var i = 0, l = outline.length;
        while (i < l) {
            var action = outline[i++];
            switch (action) {
                case "m":
                    x = outline[i++] * scale + offsetX;
                    y = outline[i++] * scale + offsetY;
                    path.moveTo(x, y);
                    break;
                case "l":
                    x = outline[i++] * scale + offsetX;
                    y = outline[i++] * scale + offsetY;
                    path.lineTo(x, y);
                    break;
                case "q":
                    cpx = outline[i++] * scale + offsetX;
                    cpy = outline[i++] * scale + offsetY;
                    cpx1 = outline[i++] * scale + offsetX;
                    cpy1 = outline[i++] * scale + offsetY;
                    path.quadraticCurveTo(cpx1, cpy1, cpx, cpy);
                    break;
                case "b":
                    cpx = outline[i++] * scale + offsetX;
                    cpy = outline[i++] * scale + offsetY;
                    cpx1 = outline[i++] * scale + offsetX;
                    cpy1 = outline[i++] * scale + offsetY;
                    cpx2 = outline[i++] * scale + offsetX;
                    cpy2 = outline[i++] * scale + offsetY;
                    path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, cpx, cpy);
                    break;
            }
        }
    }
    return { offsetX: glyph.ha * scale, path: path };
}

export { faoxomfontcreatepath };

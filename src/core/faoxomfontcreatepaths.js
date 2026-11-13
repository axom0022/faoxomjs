import { faoxomfontcreatepath } from "./faoxomfontcreatepath.js";

function faoxomfontcreatepaths(text, size, data, direction) {
    var chars = Array.from(String(text));
    var scale = size / (data.resolution || 1000);
    var boundingBox = data.boundingBox || { yMin: 0, yMax: 0 };
    var underlineThickness = data.underlineThickness !== undefined ? data.underlineThickness : 0;
    var line_height = (boundingBox.yMax - boundingBox.yMin + underlineThickness) * scale;
    var paths = [];
    var offsetX = 0, offsetY = 0;
    if (direction == "rtl" || direction == "tb") chars.reverse();
    for (var i = 0; i < chars.length; i++) {
        var char = chars[i];
        if (char === "\n") {
            offsetX = 0;
            offsetY -= line_height;
        } else {
            var ret = faoxomfontcreatepath(char, scale, offsetX, offsetY, data);
            if (direction == "tb") {
                offsetX = 0;
                offsetY += (data.ascender || 0) * scale;
            } else {
                offsetX += ret.offsetX;
            }
            paths.push(ret.path);
        }
    }
    return paths;
}

export { faoxomfontcreatepaths };

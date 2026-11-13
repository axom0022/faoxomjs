import { Color } from "../math/index.js";

function faoxomsvgstopstorgba(stops, t) {
    if (!stops || !stops.length) return [0, 0, 0, 1];
    var color = new Color(), lower = stops[0], upper = stops[stops.length - 1];
    for (var i = 0; i < stops.length; i++) {
        if (stops[i].offset <= t + 1e-9) lower = stops[i];
        if (stops[i].offset >= t - 1e-9) { upper = stops[i]; break; }
    }
    if (t <= lower.offset) {
        color.setStyle(lower.color, "srgb");
        return [color.r, color.g, color.b, lower.opacity];
    }
    if (t >= upper.offset) {
        color.setStyle(upper.color, "srgb");
        return [color.r, color.g, color.b, upper.opacity];
    }
    var span = upper.offset - lower.offset;
    var k = span > 0 ? (t - lower.offset) / span : 0;
    color.setStyle(lower.color, "srgb");
    var lowerColor = new Color().copy(color);
    color.setStyle(upper.color, "srgb");
    var upperColor = color;
    return [lowerColor.r + (upperColor.r - lowerColor.r) * k, lowerColor.g + (upperColor.g - lowerColor.g) * k, lowerColor.b + (upperColor.b - lowerColor.b) * k, lower.opacity + (upper.opacity - lower.opacity) * k];
}

export { faoxomsvgstopstorgba };

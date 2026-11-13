import { faoxomclamp } from "./faoxomclamp.js";
import { faoxomcolorkeywords } from "./faoxomcolorkeywords.js";
import { faoxomhuetorgb } from "./faoxomhuetorgb.js";
import { faoxomsrgbtolinear } from "./faoxomsrgbtolinear.js";
import { faoxomvalue } from "./faoxomvalue.js";

class Color {
    constructor(r, g, b) { this.r = 1; this.g = 1; this.b = 1; if (r !== undefined) this.set(r, g, b); }
    set(value, g, b) { if (value instanceof Color) return this.copy(value); if (typeof value === "string" && g === undefined) return this.setStyle(value); if (typeof value === "number" && g === undefined) return this.setHex(value); this.r = faoxomvalue(value, 1); this.g = faoxomvalue(g, 1); this.b = faoxomvalue(b, 1); return this; }
    setRGB(r, g, b) { return this.set(r, g, b); }
    setHex(hex) { this.r = ((hex >> 16) & 255) / 255; this.g = ((hex >> 8) & 255) / 255; this.b = (hex & 255) / 255; return this; }
    clone() { return new Color(this.r, this.g, this.b); }
    copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
    add(c) { this.r += c.r; this.g += c.g; this.b += c.b; return this; }
    multiply(c) { this.r *= c.r; this.g *= c.g; this.b *= c.b; return this; }
    multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
    lerp(c, alpha) { this.r += (c.r - this.r) * alpha; this.g += (c.g - this.g) * alpha; this.b += (c.b - this.b) * alpha; return this; }
    fromArray(a, offset) { var i = faoxomvalue(offset, 0); this.r = a[i]; this.g = a[i + 1]; this.b = a[i + 2]; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomvalue(offset, 0); out[i] = this.r; out[i + 1] = this.g; out[i + 2] = this.b; return out; }
    getHex() { return ((this.r * 255) << 16) ^ ((this.g * 255) << 8) ^ ((this.b * 255) << 0); }
    getHexString() { return ("000000" + this.getHex().toString(16)).slice(-6); }
    setHSL(h, s, l, colorSpace) { h = ((h % 1) + 1) % 1; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); if (s === 0) { this.r = this.g = this.b = l; } else { var p = l <= 0.5 ? l * (1 + s) : l + s - l * s, q = 2 * l - p; this.r = faoxomhuetorgb(q, p, h + 1 / 3); this.g = faoxomhuetorgb(q, p, h); this.b = faoxomhuetorgb(q, p, h - 1 / 3); } if (colorSpace === "srgb") { this.r = faoxomsrgbtolinear(this.r); this.g = faoxomsrgbtolinear(this.g); this.b = faoxomsrgbtolinear(this.b); } return this; }
}
Color.prototype.setStyle = function(style, colorSpace) {
    if (typeof style !== "string") return this;
    var self = this;
    var apply = function(r, g, b) { if (colorSpace === "srgb") { self.r = faoxomsrgbtolinear(r); self.g = faoxomsrgbtolinear(g); self.b = faoxomsrgbtolinear(b); } else { self.r = r; self.g = g; self.b = b; } return self; };
    var value = style.trim().toLowerCase();
    if (value === "transparent") return apply(0, 0, 0);
    if (value[0] === "#") {
        var hex = value.slice(1);
        if (hex.length === 3 || hex.length === 4) hex = hex.split("").map(function(c) { return c + c; }).join("");
        if (hex.length === 8) hex = hex.slice(0, 6);
        if (hex.length !== 6 || /[^0-9a-f]/.test(hex)) return this;
        var hexValue = parseInt(hex, 16);
        return apply(((hexValue >> 16) & 255) / 255, ((hexValue >> 8) & 255) / 255, (hexValue & 255) / 255);
    }
    var toUnit = function(part, scaleMax) {
        if (part === undefined || part === null || part === "") return null;
        if (typeof part === "string" && part.indexOf("%") !== -1) {
            var percent = parseFloat(part);
            if (!isFinite(percent)) return null;
            return Math.min(1, Math.max(0, percent / 100)) * scaleMax;
        }
        var numeric = parseFloat(part);
        return isFinite(numeric) ? numeric : null;
    };
    var match = value.match(/^rgba?\(([^)]+)\)/);
    if (match) {
        var parts = match[1].replace(/\//g, ",").split(/[\s,]+/).filter(function(p) { return p !== ""; });
        if (parts.length < 3) return this;
        var r = toUnit(parts[0], 255), g = toUnit(parts[1], 255), b = toUnit(parts[2], 255);
        if (r === null || g === null || b === null) return this;
        return apply(r / 255, g / 255, b / 255);
    }
    match = value.match(/^hsla?\(([^)]+)\)/);
    if (match) {
        var hslParts = match[1].replace(/\//g, ",").split(/[\s,]+/).filter(function(p) { return p !== ""; });
        if (hslParts.length < 3) return this;
        var hue = parseFloat(hslParts[0]);
        if (!isFinite(hue)) hue = 0;
        hue = ((hue % 360) + 360) % 360;
        var saturation = toUnit(hslParts[1], 1), lightness = toUnit(hslParts[2], 1);
        if (saturation === null || lightness === null) return this;
        var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        var huePrime = hue / 60;
        var x = chroma * (1 - Math.abs(huePrime % 2 - 1));
        var rgb = huePrime < 1 ? [chroma, x, 0] : huePrime < 2 ? [x, chroma, 0] : huePrime < 3 ? [0, chroma, x] : huePrime < 4 ? [0, x, chroma] : huePrime < 5 ? [x, 0, chroma] : [chroma, 0, x];
        var m = lightness - chroma * 0.5;
        return apply(rgb[0] + m, rgb[1] + m, rgb[2] + m);
    }
    var named = faoxomcolorkeywords[value];
    if (named !== undefined) return apply(((named >> 16) & 255) / 255, ((named >> 8) & 255) / 255, (named & 255) / 255);
    return this;
};
Color.prototype.getStyle = function() { return "rgb(" + Math.round(this.r * 255) + "," + Math.round(this.g * 255) + "," + Math.round(this.b * 255) + ")"; };
Color.prototype.setScalar = function(s) { this.r = s; this.g = s; this.b = s; return this; };
Color.prototype.sub = function(c) { this.r -= c.r; this.g -= c.g; this.b -= c.b; return this; };
Color.prototype.equals = function(c) { return this.r === c.r && this.g === c.g && this.b === c.b; };
Color.prototype.getRGB = function(target) { var out = target || {}; out.r = this.r; out.g = this.g; out.b = this.b; return out; };
Color.prototype.getHSL = function(target) { var out = target || {}, r = this.r, g = this.g, b = this.b, max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (min + max) * 0.5; if (max !== min) { var d = max - min; s = l <= 0.5 ? d / (max + min) : d / (2 - max - min); if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; } out.h = h; out.s = s; out.l = l; return out; };
Color.prototype.setHSL = function(h, s, l) { h = ((h % 1) + 1) % 1; s = faoxomclamp(s, 0, 1); l = faoxomclamp(l, 0, 1); if (s === 0) return this.setScalar(l); var p = l <= 0.5 ? l * (1 + s) : l + s - l * s, q = 2 * l - p, hue = function(t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return q + (p - q) * 6 * t; if (t < 1 / 2) return p; if (t < 2 / 3) return q + (p - q) * (2 / 3 - t) * 6; return q; }; this.r = hue(h + 1 / 3); this.g = hue(h); this.b = hue(h - 1 / 3); return this; };
Color.prototype.lerpColors = function(a, b, alpha) { return this.copy(a).lerp(b, alpha); };
Color.prototype.offsetHSL = function(h, s, l) { var hsl = this.getHSL({}); return this.setHSL(hsl.h + h, hsl.s + s, hsl.l + l); };

export { Color };

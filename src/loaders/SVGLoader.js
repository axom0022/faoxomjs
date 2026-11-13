import { DoubleSide } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Color, Matrix3, Path, ShapePath, Vector2 } from "../math/index.js";
import { DataTexture } from "../textures/DataTexture.js";

var GRADIENT_REFERENCE = /^\s*url\(\s*(?:["']\s*)?#([^)'"\s]+)(?:\s*["'])?\s*\)\s*$/;
var UNIT_INCHES = { pt: 1 / 72, pc: 1 / 6, mm: 1 / 25.4, cm: 1 / 2.54, "in": 1 };
var CORNER_KAPPA = 1 - 0.551915024494;
var TWO_PI = Math.PI * 2;

function scanNumbers(text) {
    var values = [];
    var pattern = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
    var match;
    while ((match = pattern.exec(text))) values.push(parseFloat(match[0]));
    return values;
}

function readLength(raw, dpi, fallbackUnit) {
    if (raw === null || raw === undefined) return 0;
    var text = String(raw).trim();
    var unit = "px";
    for (var name in UNIT_INCHES) {
        if (text.endsWith(name)) { unit = name; text = text.slice(0, -name.length); break; }
    }
    var value = parseFloat(text);
    if (isNaN(value)) return 0;
    if (unit === "px" && fallbackUnit === "px") return value;
    var inches = unit === "px" ? 1 / dpi : UNIT_INCHES[unit];
    var scale = fallbackUnit === "px" ? inches * dpi : inches / UNIT_INCHES[fallbackUnit];
    return scale * value;
}

function signedAngle(ux, uy, vx, vy) {
    var lengths = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    var angle = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / lengths)));
    return ux * vy - uy * vx < 0 ? -angle : angle;
}

function parseTransformList(text) {
    var total = new Matrix3();
    var pattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
    var match;
    while ((match = pattern.exec(text))) {
        var name = match[1];
        var values = scanNumbers(match[2]);
        var step = new Matrix3();
        if (name === "translate" && values.length >= 1) step.makeTranslation(values[0], values.length >= 2 ? values[1] : 0);
        else if (name === "scale" && values.length >= 1) step.makeScale(values[0], values.length >= 2 ? values[1] : values[0]);
        else if (name === "rotate" && values.length >= 1) {
            var radians = values[0] * Math.PI / 180;
            if (values.length >= 3) {
                var pivot = new Matrix3().makeTranslation(values[1], values[2]);
                var spin = new Matrix3().makeRotation(radians);
                var unpivot = new Matrix3().makeTranslation(-values[1], -values[2]);
                step.multiplyMatrices(pivot, spin).multiply(unpivot);
            } else step.makeRotation(radians);
        } else if (name === "skewX" && values.length === 1) step.set(1, Math.tan(values[0] * Math.PI / 180), 0, 0, 1, 0, 0, 0, 1);
        else if (name === "skewY" && values.length === 1) step.set(1, 0, 0, Math.tan(values[0] * Math.PI / 180), 1, 0, 0, 0, 1);
        else if (name === "matrix" && values.length >= 6) step.set(values[0], values[2], values[4], values[1], values[3], values[5], 0, 0, 1);
        total.multiply(step);
    }
    return total;
}

function symmetricEigen(a, b, c) {
    var angle = 0.5 * Math.atan2(2 * b, a - c);
    var cos = Math.cos(angle), sin = Math.sin(angle);
    var major = a * cos * cos + 2 * b * cos * sin + c * sin * sin;
    var minor = a * sin * sin - 2 * b * cos * sin + c * cos * cos;
    if (a > c ? cos > 0 : sin < 0) { cos = -cos; sin = -sin; }
    return { lambda1: major, lambda2: minor, axis1: [cos, sin], axis2: [-sin, cos] };
}

function mapPoint(m, x, y) { var e = m.elements; return { x: e[0] * x + e[3] * y + e[6], y: e[1] * x + e[4] * y + e[7] }; }

function mapVector(m, x, y) { var e = m.elements; return [e[0] * x + e[3] * y, e[1] * x + e[4] * y]; }

function transformScale(m) { var e = m.elements; return Math.sqrt(Math.abs(e[0] * e[4] - e[1] * e[3])); }

function transformFlipped(m) { var e = m.elements; return e[0] * e[4] - e[1] * e[3] < 0; }

function transformSkewed(m) {
    var e = m.elements;
    var basisDot = e[0] * e[3] + e[1] * e[4];
    if (basisDot === 0) return false;
    var sx = Math.sqrt(e[0] * e[0] + e[1] * e[1]), sy = Math.sqrt(e[3] * e[3] + e[4] * e[4]);
    return Math.abs(basisDot / (sx * sy)) > 1e-6;
}

function applyMatrixToPath(path, m) {
    function stamp(vector) {
        var mapped = mapPoint(m, vector.x, vector.y);
        vector.set(mapped.x, mapped.y);
    }
    function refitEllipse(curve) {
        var cosR = Math.cos(curve.rotation), sinR = Math.sin(curve.rotation);
        var axisU = mapVector(m, cosR * curve.xRadius, sinR * curve.xRadius);
        var axisV = mapVector(m, -sinR * curve.yRadius, cosR * curve.yRadius);
        var w11 = axisU[0], w21 = axisU[1], w12 = axisV[0], w22 = axisV[1];
        var det = w11 * w22 - w12 * w21;
        if (Math.abs(det) < 1e-14) { curve.xRadius = 0; curve.yRadius = 0; return; }
        var i11 = w22 / det, i12 = -w12 / det, i21 = -w21 / det, i22 = w11 / det;
        var gA = i11 * i11 + i21 * i21;
        var gB = i11 * i12 + i21 * i22;
        var gC = i12 * i12 + i22 * i22;
        var eigen = symmetricEigen(gA, gB, gC);
        var radius1 = 1 / Math.sqrt(Math.max(eigen.lambda1, 1e-14));
        var radius2 = 1 / Math.sqrt(Math.max(eigen.lambda2, 1e-14));
        curve.xRadius = radius1;
        curve.yRadius = radius2;
        curve.rotation = Math.atan2(eigen.axis1[1], eigen.axis1[0]);
        var isFull = (curve.endAngle - curve.startAngle) % TWO_PI < Number.EPSILON;
        if (!isFull) {
            function remap(phi) {
                var image = [w11 * Math.cos(phi) + w12 * Math.sin(phi), w21 * Math.cos(phi) + w22 * Math.sin(phi)];
                var along1 = eigen.axis1[0] * image[0] + eigen.axis1[1] * image[1];
                var along2 = eigen.axis2[0] * image[0] + eigen.axis2[1] * image[1];
                return Math.atan2(along2 / radius2, along1 / radius1);
            }
            curve.startAngle = remap(curve.startAngle);
            curve.endAngle = remap(curve.endAngle);
            if (transformFlipped(m)) curve.clockwise = !curve.clockwise;
        }
    }
    function rescaleEllipse(curve) {
        var e = m.elements;
        var sx = Math.sqrt(e[0] * e[0] + e[1] * e[1]), sy = Math.sqrt(e[3] * e[3] + e[4] * e[4]);
        curve.xRadius *= sx;
        curve.yRadius *= sy;
        curve.rotation += sx > Number.EPSILON ? Math.atan2(e[1], e[0]) : Math.atan2(-e[3], e[4]);
        if (transformFlipped(m)) {
            curve.startAngle *= -1;
            curve.endAngle *= -1;
            curve.clockwise = !curve.clockwise;
        }
    }
    for (var i = 0; i < path.subPaths.length; i++) {
        var curves = path.subPaths[i].curves;
        for (var j = 0; j < curves.length; j++) {
            var curve = curves[j];
            if (curve.type === "line") { stamp(curve.v1); stamp(curve.v2); }
            else if (curve.type === "quadratic") { stamp(curve.v0); stamp(curve.v1); stamp(curve.v2); }
            else if (curve.type === "bezier") { stamp(curve.v0); stamp(curve.v1); stamp(curve.v2); stamp(curve.v3); }
            else if (curve.type === "arc") {
                var center = mapPoint(m, curve.cx, curve.cy);
                curve.cx = center.x;
                curve.cy = center.y;
                if (transformSkewed(m)) refitEllipse(curve);
                else rescaleEllipse(curve);
            }
        }
    }
}

function appendArc(path, from, to, rx, ry, rotationDegrees, largeArc, sweep) {
    if (rx === 0 || ry === 0) { path.lineTo(to.x, to.y); return; }
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    var phi = rotationDegrees * Math.PI / 180;
    var cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
    var halfX = (from.x - to.x) / 2, halfY = (from.y - to.y) / 2;
    var px = cosPhi * halfX + sinPhi * halfY;
    var py = -sinPhi * halfX + cosPhi * halfY;
    var stretch = Math.sqrt(Math.max(0, (px * px) / (rx * rx) + (py * py) / (ry * ry)));
    if (stretch > 1) { rx *= stretch; ry *= stretch; }
    var numerator = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
    var denominator = rx * rx * py * py + ry * ry * px * px;
    var factor = Math.sqrt(Math.max(0, numerator / denominator));
    if (largeArc === sweep) factor = -factor;
    var stepX = factor * rx * py / ry;
    var stepY = -factor * ry * px / rx;
    var centerX = cosPhi * stepX - sinPhi * stepY + (from.x + to.x) / 2;
    var centerY = sinPhi * stepX + cosPhi * stepY + (from.y + to.y) / 2;
    var startUnitX = (px - stepX) / rx, startUnitY = (py - stepY) / ry;
    var endUnitX = (-px - stepX) / rx, endUnitY = (-py - stepY) / ry;
    var startAngle = signedAngle(1, 0, startUnitX, startUnitY);
    var sweepAngle = signedAngle(startUnitX, startUnitY, endUnitX, endUnitY) % TWO_PI;
    if (!path.currentPath) path.moveTo(from.x, from.y);
    path.currentPath.absellipse(centerX, centerY, rx, ry, startAngle, startAngle + sweepAngle, sweep === 0, phi);
}

var PATH_ARITY = { M: 2, L: 2, T: 2, S: 4, Q: 4, C: 6, A: 7, H: 1, V: 1 };

function buildPathFromData(data) {
    if (data === "" || data === "none" || data === null || data === undefined) return null;
    var path = new ShapePath();
    var cursor = new Vector2();
    var control = new Vector2();
    var anchor = new Vector2();
    var awaitingAnchor = true;
    var index = 0;
    var length = data.length;
    var numberPattern = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
    function skipFiller() { while (index < length && (data[index] === " " || data[index] === "\t" || data[index] === "\r" || data[index] === "\n" || data[index] === ",")) index++; }
    function readNumber() {
        skipFiller();
        numberPattern.lastIndex = index;
        var hit = numberPattern.exec(data);
        if (!hit) return null;
        index = numberPattern.lastIndex;
        return parseFloat(hit[0]);
    }
    function readFlag() {
        skipFiller();
        var glyph = data[index];
        if (glyph === "0" || glyph === "1") { index++; return glyph === "1" ? 1 : 0; }
        return null;
    }
    function noteAnchor(x, y) { if (awaitingAnchor) { anchor.set(x, y); awaitingAnchor = false; } }
    while (index < length) {
        skipFiller();
        if (index >= length) break;
        var kind = data[index];
        if (!/[a-zA-Z]/.test(kind)) { index++; continue; }
        index++;
        if (kind === "Z" || kind === "z") {
            if (path.currentPath) {
                path.currentPath.autoClose = true;
                if (path.currentPath.curves.length > 0) {
                    cursor.copy(anchor);
                    path.currentPath.currentPoint.copy(cursor);
                    awaitingAnchor = true;
                }
            }
            continue;
        }
        var arity = PATH_ARITY[kind.toUpperCase()];
        if (!arity) { console.warn("SVGLoader: unknown path command " + kind); continue; }
        var relative = kind.toLowerCase() === kind;
        var runIndex = 0;
        while (true) {
            var values = [];
            var usable = true;
            for (var a = 0; a < arity; a++) {
                if (arity === 7 && (a === 3 || a === 4)) {
                    var flag = readFlag();
                    if (flag === null) { usable = false; break; }
                    values.push(flag);
                } else {
                    var number = readNumber();
                    if (number === null) { usable = false; break; }
                    values.push(number);
                }
            }
            if (!usable) break;
            switch (kind) {
                case "M": case "m": {
                    var mx = relative ? cursor.x + values[0] : values[0];
                    var my = relative ? cursor.y + values[1] : values[1];
                    if (runIndex === 0) path.moveTo(mx, my);
                    else path.lineTo(mx, my);
                    cursor.set(mx, my);
                    control.copy(cursor);
                    anchor.set(mx, my);
                    awaitingAnchor = false;
                    break;
                }
                case "L": case "l": {
                    var lx = relative ? cursor.x + values[0] : values[0];
                    var ly = relative ? cursor.y + values[1] : values[1];
                    path.lineTo(lx, ly);
                    cursor.set(lx, ly);
                    control.copy(cursor);
                    noteAnchor(lx, ly);
                    break;
                }
                case "H": case "h": {
                    var hx = relative ? cursor.x + values[0] : values[0];
                    path.lineTo(hx, cursor.y);
                    cursor.x = hx;
                    control.copy(cursor);
                    noteAnchor(hx, cursor.y);
                    break;
                }
                case "V": case "v": {
                    var vy = relative ? cursor.y + values[0] : values[0];
                    path.lineTo(cursor.x, vy);
                    cursor.y = vy;
                    control.copy(cursor);
                    noteAnchor(cursor.x, vy);
                    break;
                }
                case "C": case "c": {
                    var c1x = relative ? cursor.x + values[0] : values[0];
                    var c1y = relative ? cursor.y + values[1] : values[1];
                    var c2x = relative ? cursor.x + values[2] : values[2];
                    var c2y = relative ? cursor.y + values[3] : values[3];
                    var cex = relative ? cursor.x + values[4] : values[4];
                    var cey = relative ? cursor.y + values[5] : values[5];
                    path.bezierCurveTo(c1x, c1y, c2x, c2y, cex, cey);
                    control.set(c2x, c2y);
                    cursor.set(cex, cey);
                    noteAnchor(cex, cey);
                    break;
                }
                case "S": case "s": {
                    var r1x = 2 * cursor.x - control.x;
                    var r1y = 2 * cursor.y - control.y;
                    var scx = relative ? cursor.x + values[0] : values[0];
                    var scy = relative ? cursor.y + values[1] : values[1];
                    var sex = relative ? cursor.x + values[2] : values[2];
                    var sey = relative ? cursor.y + values[3] : values[3];
                    path.bezierCurveTo(r1x, r1y, scx, scy, sex, sey);
                    control.set(scx, scy);
                    cursor.set(sex, sey);
                    noteAnchor(sex, sey);
                    break;
                }
                case "Q": case "q": {
                    var qcx = relative ? cursor.x + values[0] : values[0];
                    var qcy = relative ? cursor.y + values[1] : values[1];
                    var qex = relative ? cursor.x + values[2] : values[2];
                    var qey = relative ? cursor.y + values[3] : values[3];
                    path.quadraticCurveTo(qcx, qcy, qex, qey);
                    control.set(qcx, qcy);
                    cursor.set(qex, qey);
                    noteAnchor(qex, qey);
                    break;
                }
                case "T": case "t": {
                    var tcx = 2 * cursor.x - control.x;
                    var tcy = 2 * cursor.y - control.y;
                    var tex = relative ? cursor.x + values[0] : values[0];
                    var tey = relative ? cursor.y + values[1] : values[1];
                    path.quadraticCurveTo(tcx, tcy, tex, tey);
                    control.set(tcx, tcy);
                    cursor.set(tex, tey);
                    noteAnchor(tex, tey);
                    break;
                }
                case "A": case "a": {
                    var aex = relative ? cursor.x + values[5] : values[5];
                    var aey = relative ? cursor.y + values[6] : values[6];
                    if (relative ? (values[5] === 0 && values[6] === 0) : (aex === cursor.x && aey === cursor.y)) break;
                    var start = cursor.clone();
                    cursor.set(aex, aey);
                    control.copy(cursor);
                    appendArc(path, start, cursor, values[0], values[1], values[2], values[3], values[4]);
                    noteAnchor(aex, aey);
                    break;
                }
            }
            runIndex++;
        }
    }
    if (!path.subPaths.length) return null;
    return path;
}

function stopsToRGBA(stops, t) {
    if (!stops || !stops.length) return [0, 0, 0, 1];
    var lower = stops[0], upper = stops[stops.length - 1];
    for (var i = 0; i < stops.length; i++) {
        if (stops[i].offset <= t + 1e-9) lower = stops[i];
        if (stops[i].offset >= t - 1e-9) { upper = stops[i]; break; }
    }
    if (t <= lower.offset) { var first = new Color().setStyle(lower.color, "srgb"); return [first.r, first.g, first.b, lower.opacity]; }
    if (t >= upper.offset) { var last = new Color().setStyle(upper.color, "srgb"); return [last.r, last.g, last.b, upper.opacity]; }
    var span = upper.offset - lower.offset;
    var k = span > 0 ? (t - lower.offset) / span : 0;
    var a = new Color().setStyle(lower.color, "srgb");
    var b = new Color().setStyle(upper.color, "srgb");
    return [a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k, lower.opacity + (upper.opacity - lower.opacity) * k];
}

function localBounds(shapePath, worldTransform) {
    var inverse = worldTransform ? new Matrix3().copy(worldTransform).invert() : null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < shapePath.subPaths.length; i++) {
        var pts = shapePath.subPaths[i].getPoints();
        for (var p = 0; p < pts.length; p++) {
            var x = pts[p].x, y = pts[p].y;
            if (inverse) {
                var mapped = mapPoint(inverse, x, y);
                x = mapped.x;
                y = mapped.y;
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (minX === Infinity) return null;
    return { minX: minX, minY: minY, width: maxX - minX, height: maxY - minY };
}

function bakeGradientTexture(gradient, shapePath, resolution) {
    if (!gradient || !Array.isArray(gradient.stops) || gradient.stops.length === 0) return null;
    resolution = resolution || 256;
    var world = shapePath.userData.transform;
    var boxUnits = gradient.gradientUnits === "objectBoundingBox";
    var bounds = null;
    if (boxUnits) {
        bounds = localBounds(shapePath, world);
        if (bounds === null) return null;
    }
    function place(x, y) {
        var point = { x: x, y: y };
        if (gradient.gradientTransform) point = mapPoint(gradient.gradientTransform, point.x, point.y);
        if (boxUnits) point = { x: bounds.minX + point.x * bounds.width, y: bounds.minY + point.y * bounds.height };
        if (world) point = mapPoint(world, point.x, point.y);
        return point;
    }
    function pack(rgba) {
        return [Math.round(Math.min(1, Math.max(0, rgba[0])) * 255), Math.round(Math.min(1, Math.max(0, rgba[1])) * 255), Math.round(Math.min(1, Math.max(0, rgba[2])) * 255), Math.round(Math.min(1, Math.max(0, rgba[3])) * 255)];
    }
    var width, height, data, matrix;
    if (gradient.type === "linearGradient") {
        width = resolution;
        height = 1;
        data = new Uint8Array(width * 4);
        for (var x = 0; x < width; x++) {
            var rgba = pack(stopsToRGBA(gradient.stops, x / (resolution - 1)));
            data[x * 4] = rgba[0];
            data[x * 4 + 1] = rgba[1];
            data[x * 4 + 2] = rgba[2];
            data[x * 4 + 3] = rgba[3];
        }
        var p1 = place(gradient.x1, gradient.y1);
        var p2 = place(gradient.x2, gradient.y2);
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        var squared = dx * dx + dy * dy || 1e-20;
        var a = dx / squared, b = dy / squared;
        matrix = new Matrix3().set(a, b, -(a * p1.x + b * p1.y), 0, 0, 0.5, 0, 0, 1);
    } else {
        var cx = gradient.cx, cy = gradient.cy, fx = gradient.fx, fy = gradient.fy, r = gradient.r;
        if (gradient.gradientTransform) {
            var c = mapPoint(gradient.gradientTransform, cx, cy);
            var f = mapPoint(gradient.gradientTransform, fx, fy);
            cx = c.x; cy = c.y; fx = f.x; fy = f.y;
        }
        if (boxUnits) {
            cx = bounds.minX + cx * bounds.width;
            cy = bounds.minY + cy * bounds.height;
            fx = bounds.minX + fx * bounds.width;
            fy = bounds.minY + fy * bounds.height;
            r = r * Math.sqrt((bounds.width * bounds.width + bounds.height * bounds.height) / 2);
        }
        if (r <= 0) return null;
        var fdx = fx - cx, fdy = fy - cy;
        var fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fdist >= r) {
            var pull = (r - 1e-6) / fdist;
            fx = cx + fdx * pull;
            fy = cy + fdy * pull;
        }
        width = resolution;
        height = resolution;
        data = new Uint8Array(width * height * 4);
        var originX = cx - r, originY = cy - r, span = 2 * r;
        for (var py = 0; py < height; py++) {
            for (var px = 0; px < width; px++) {
                var sampleX = originX + (px / (resolution - 1)) * span;
                var sampleY = originY + (py / (resolution - 1)) * span;
                var rayX = sampleX - fx, rayY = sampleY - fy;
                var t = 0;
                var rayLength2 = rayX * rayX + rayY * rayY;
                if (rayLength2 > 0) {
                    var offX = fx - cx, offY = fy - cy;
                    var b2 = offX * rayX + offY * rayY;
                    var c2 = offX * offX + offY * offY - r * r;
                    var disc = b2 * b2 - rayLength2 * c2;
                    if (disc <= 0) t = 1;
                    else t = rayLength2 / (-b2 + Math.sqrt(disc));
                    if (t < 0) t = 0;
                    if (t > 1) t = 1;
                }
                var rgba2 = pack(stopsToRGBA(gradient.stops, t));
                var offset = (py * width + px) * 4;
                data[offset] = rgba2[0];
                data[offset + 1] = rgba2[1];
                data[offset + 2] = rgba2[2];
                data[offset + 3] = rgba2[3];
            }
        }
        var inverseWorld = world ? new Matrix3().copy(world).invert() : new Matrix3();
        var normalize = new Matrix3().set(1 / span, 0, -originX / span, 0, 1 / span, -originY / span, 0, 0, 1);
        matrix = normalize.multiply(inverseWorld);
    }
    var texture = new DataTexture(data, width, height, { minFilter: "linear", magFilter: "linear", colorSpace: "srgb" });
    texture.matrixAutoUpdate = false;
    texture.matrix = matrix;
    texture.wrapS = gradient.spreadMethod === "reflect" ? "mirror" : gradient.spreadMethod === "repeat" ? "repeat" : "clamp";
    texture.wrapT = texture.wrapS;
    return texture;
}

class SVGLoader {
    constructor(manager) { this.manager = manager; this.defaultDPI = 90; this.defaultUnit = "px"; }
    parse(text) {
        var scope = this;
        var document = new DOMParser().parseFromString(text, "image/svg+xml");
        var gradients = {};
        var selectors = {};
        var paths = [];
        var stack = [new Matrix3()];
        var STYLE_PROPERTIES = [
            ["fill", "fill", null],
            ["fill-opacity", "fillOpacity", "fraction"],
            ["fill-rule", "fillRule", null],
            ["opacity", "opacity", "fraction"],
            ["stroke", "stroke", null],
            ["stroke-opacity", "strokeOpacity", "fraction"],
            ["stroke-width", "strokeWidth", "positive"],
            ["stroke-linejoin", "strokeLineJoin", null],
            ["stroke-linecap", "strokeLineCap", null],
            ["stroke-miterlimit", "strokeMiterLimit", "positive"],
            ["visibility", "visibility", null]
        ];
        function adjust(value, mode) {
            if (mode === "fraction") return Math.max(0, Math.min(1, readLength(value, scope.defaultDPI, scope.defaultUnit)));
            if (mode === "positive") return Math.max(0, readLength(value, scope.defaultDPI, scope.defaultUnit));
            return value;
        }
        function collectStylesheets(root) {
            var nodes = root.getElementsByTagName("style");
            for (var i = 0; i < nodes.length; i++) {
                var sheet = nodes[i].sheet;
                if (!sheet || !sheet.cssRules) continue;
                for (var r = 0; r < sheet.cssRules.length; r++) {
                    var rule = sheet.cssRules[r];
                    if (rule.type !== 1 || !rule.selectorText || !rule.style) continue;
                    var names = rule.selectorText.split(",").map(function(part) { return part.trim(); }).filter(Boolean);
                    for (var n = 0; n < names.length; n++) {
                        if (!selectors[names[n]]) selectors[names[n]] = {};
                        var captured = {};
                        for (var propName in rule.style) {
                            var propValue = rule.style[propName];
                            if (propValue !== "") captured[propName] = propValue;
                        }
                        Object.assign(selectors[names[n]], captured);
                    }
                }
            }
        }
        function resolveStyle(node, inherited) {
            var style = Object.assign({}, inherited);
            var matched = {};
            if (node.hasAttribute("class")) {
                var classes = node.getAttribute("class").split(/\s+/).filter(Boolean);
                for (var c = 0; c < classes.length; c++) Object.assign(matched, selectors["." + classes[c]] || {});
            }
            if (node.hasAttribute("id")) Object.assign(matched, selectors["#" + node.getAttribute("id")] || {});
            for (var p = 0; p < STYLE_PROPERTIES.length; p++) {
                var cssName = STYLE_PROPERTIES[p][0], jsName = STYLE_PROPERTIES[p][1], mode = STYLE_PROPERTIES[p][2];
                if (node.hasAttribute(cssName)) style[jsName] = adjust(node.getAttribute(cssName), mode);
                if (matched[jsName] !== undefined) style[jsName] = adjust(matched[jsName], mode);
                var inline = node.style ? node.style.getPropertyValue(cssName) : "";
                if (inline !== "") style[jsName] = adjust(inline, mode);
            }
            return style;
        }
        function collectGradients(root) {
            var raw = {};
            var families = ["linearGradient", "radialGradient"];
            for (var f = 0; f < families.length; f++) {
                var nodes = root.getElementsByTagName(families[f]);
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];
                    var id = node.getAttribute("id");
                    if (!id) continue;
                    var entry = { type: families[f], attrs: {}, stops: null, parentId: null };
                    var href = (node.getAttributeNS && node.getAttributeNS("http://www.w3.org/1999/xlink", "href")) || node.getAttribute("href") || "";
                    if (href.charAt(0) === "#") entry.parentId = href.slice(1);
                    var names = ["x1", "y1", "x2", "y2", "cx", "cy", "r", "fx", "fy", "gradientUnits", "gradientTransform", "spreadMethod"];
                    for (var a = 0; a < names.length; a++) if (node.hasAttribute(names[a])) entry.attrs[names[a]] = node.getAttribute(names[a]);
                    var stopNodes = node.getElementsByTagName("stop");
                    if (stopNodes.length) {
                        entry.stops = [];
                        for (var s = 0; s < stopNodes.length; s++) {
                            var stop = stopNodes[s];
                            var color = stop.getAttribute("stop-color");
                            if ((color === null || color === "") && stop.style) color = stop.style["stop-color"];
                            if (color === null || color === "") color = "#000";
                            var opacityText = stop.getAttribute("stop-opacity");
                            if ((opacityText === null || opacityText === "") && stop.style) opacityText = stop.style["stop-opacity"];
                            var opacity = opacityText === null || opacityText === "" || opacityText === undefined ? 1 : Math.max(0, Math.min(1, parseFloat(opacityText)));
                            var offsetText = stop.getAttribute("offset") || "0";
                            var offset = offsetText.indexOf("%") !== -1 ? parseFloat(offsetText) / 100 : parseFloat(offsetText);
                            entry.stops.push({ offset: Math.max(0, Math.min(1, offset)), color: color, opacity: opacity });
                        }
                    }
                    raw[id] = entry;
                }
            }
            function resolveEntry(id, seen) {
                var entry = raw[id];
                if (!entry || seen.indexOf(id) !== -1) return entry;
                seen.push(id);
                if (entry.parentId && raw[entry.parentId]) {
                    var parent = resolveEntry(entry.parentId, seen);
                    if (parent) {
                        if (!entry.stops) entry.stops = parent.stops;
                        for (var key in parent.attrs) if (!(key in entry.attrs)) entry.attrs[key] = parent.attrs[key];
                    }
                }
                return entry;
            }
            for (var id in raw) resolveEntry(id, []);
            function coordinate(text) {
                if (typeof text !== "string") return 0;
                if (text.charAt(text.length - 1) === "%") return parseFloat(text) / 100;
                return readLength(text, scope.defaultDPI, scope.defaultUnit);
            }
            for (var gid in raw) {
                var entry = raw[gid];
                var attrs = entry.attrs;
                var units = attrs.gradientUnits === "userSpaceOnUse" ? "userSpaceOnUse" : "objectBoundingBox";
                var spread = attrs.spreadMethod === "reflect" || attrs.spreadMethod === "repeat" ? attrs.spreadMethod : "pad";
                var gradient = { type: entry.type, gradientUnits: units, spreadMethod: spread, gradientTransform: null, stops: (entry.stops || []).slice().sort(function(x, y) { return x.offset - y.offset; }) };
                if (attrs.gradientTransform) gradient.gradientTransform = parseTransformList(attrs.gradientTransform);
                if (entry.type === "linearGradient") {
                    gradient.x1 = attrs.x1 !== undefined ? coordinate(attrs.x1) : 0;
                    gradient.y1 = attrs.y1 !== undefined ? coordinate(attrs.y1) : 0;
                    gradient.x2 = attrs.x2 !== undefined ? coordinate(attrs.x2) : (units === "objectBoundingBox" ? 1 : 0);
                    gradient.y2 = attrs.y2 !== undefined ? coordinate(attrs.y2) : 0;
                } else {
                    var middle = units === "objectBoundingBox" ? 0.5 : 0;
                    gradient.cx = attrs.cx !== undefined ? coordinate(attrs.cx) : middle;
                    gradient.cy = attrs.cy !== undefined ? coordinate(attrs.cy) : middle;
                    gradient.r = attrs.r !== undefined ? coordinate(attrs.r) : middle;
                    gradient.fx = attrs.fx !== undefined ? coordinate(attrs.fx) : gradient.cx;
                    gradient.fy = attrs.fy !== undefined ? coordinate(attrs.fy) : gradient.cy;
                }
                gradients[gid] = gradient;
            }
        }
        function nodeTransform(node) {
            var hasXY = node.nodeName === "use" && (node.hasAttribute("x") || node.hasAttribute("y"));
            var hasTransform = node.hasAttribute("transform");
            if (!hasXY && !hasTransform) return null;
            var local = new Matrix3();
            if (hasXY) local.makeTranslation(readLength(node.getAttribute("x") || 0, scope.defaultDPI, scope.defaultUnit), readLength(node.getAttribute("y") || 0, scope.defaultDPI, scope.defaultUnit));
            if (hasTransform) local.premultiply(parseTransformList(node.getAttribute("transform")));
            return local;
        }
        function buildRect(node) {
            var x = readLength(node.getAttribute("x") || 0, scope.defaultDPI, scope.defaultUnit);
            var y = readLength(node.getAttribute("y") || 0, scope.defaultDPI, scope.defaultUnit);
            var w = readLength(node.getAttribute("width"), scope.defaultDPI, scope.defaultUnit);
            var h = readLength(node.getAttribute("height"), scope.defaultDPI, scope.defaultUnit);
            var rx = readLength(node.getAttribute("rx") || node.getAttribute("ry") || 0, scope.defaultDPI, scope.defaultUnit);
            var ry = readLength(node.getAttribute("ry") || node.getAttribute("rx") || 0, scope.defaultDPI, scope.defaultUnit);
            rx = Math.min(rx, w / 2);
            ry = Math.min(ry, h / 2);
            var path = new ShapePath();
            path.moveTo(x + rx, y);
            path.lineTo(x + w - rx, y);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x + w - rx * CORNER_KAPPA, y, x + w, y + ry * CORNER_KAPPA, x + w, y + ry);
            path.lineTo(x + w, y + h - ry);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x + w, y + h - ry * CORNER_KAPPA, x + w - rx * CORNER_KAPPA, y + h, x + w - rx, y + h);
            path.lineTo(x + rx, y + h);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x + rx * CORNER_KAPPA, y + h, x, y + h - ry * CORNER_KAPPA, x, y + h - ry);
            path.lineTo(x, y + ry);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x, y + ry * CORNER_KAPPA, x + rx * CORNER_KAPPA, y, x + rx, y);
            return path;
        }
        function buildCircle(node) {
            var cx = readLength(node.getAttribute("cx") || 0, scope.defaultDPI, scope.defaultUnit);
            var cy = readLength(node.getAttribute("cy") || 0, scope.defaultDPI, scope.defaultUnit);
            var r = readLength(node.getAttribute("r") || 0, scope.defaultDPI, scope.defaultUnit);
            var ring = new Path();
            ring.absarc(cx, cy, r, 0, TWO_PI);
            var path = new ShapePath();
            path.subPaths.push(ring);
            return path;
        }
        function buildEllipse(node) {
            var cx = readLength(node.getAttribute("cx") || 0, scope.defaultDPI, scope.defaultUnit);
            var cy = readLength(node.getAttribute("cy") || 0, scope.defaultDPI, scope.defaultUnit);
            var rx = readLength(node.getAttribute("rx") || 0, scope.defaultDPI, scope.defaultUnit);
            var ry = readLength(node.getAttribute("ry") || 0, scope.defaultDPI, scope.defaultUnit);
            var ring = new Path();
            ring.absellipse(cx, cy, rx, ry, 0, TWO_PI);
            var path = new ShapePath();
            path.subPaths.push(ring);
            return path;
        }
        function buildLine(node) {
            var x1 = readLength(node.getAttribute("x1") || 0, scope.defaultDPI, scope.defaultUnit);
            var y1 = readLength(node.getAttribute("y1") || 0, scope.defaultDPI, scope.defaultUnit);
            var x2 = readLength(node.getAttribute("x2") || 0, scope.defaultDPI, scope.defaultUnit);
            var y2 = readLength(node.getAttribute("y2") || 0, scope.defaultDPI, scope.defaultUnit);
            var path = new ShapePath();
            path.moveTo(x1, y1);
            path.lineTo(x2, y2);
            if (path.currentPath) path.currentPath.autoClose = false;
            return path;
        }
        function buildPointSeries(node, close) {
            var numbers = scanNumbers(node.getAttribute("points") || "");
            var path = new ShapePath();
            for (var i = 0; i + 1 < numbers.length; i += 2) {
                if (i === 0) path.moveTo(numbers[i], numbers[i + 1]);
                else path.lineTo(numbers[i], numbers[i + 1]);
            }
            if (path.currentPath) path.currentPath.autoClose = close;
            return path;
        }
        function walk(node, inheritedStyle) {
            if (node.nodeType !== 1) return;
            if (node.hasAttribute("filter")) console.warn("SVGLoader: Filters are not supported.");
            var tag = node.nodeName;
            var local = nodeTransform(node);
            var cumulative = stack[stack.length - 1];
            if (local) {
                cumulative = new Matrix3().copy(stack[stack.length - 1]).multiply(local);
                stack.push(cumulative);
            }
            var style = inheritedStyle;
            var built = null;
            if (tag === "svg" || tag === "g") style = resolveStyle(node, style);
            else if (tag === "path") { style = resolveStyle(node, style); if (node.hasAttribute("d")) built = buildPathFromData(node.getAttribute("d")); }
            else if (tag === "rect") { style = resolveStyle(node, style); built = buildRect(node); }
            else if (tag === "circle") { style = resolveStyle(node, style); built = buildCircle(node); }
            else if (tag === "ellipse") { style = resolveStyle(node, style); built = buildEllipse(node); }
            else if (tag === "line") { style = resolveStyle(node, style); built = buildLine(node); }
            else if (tag === "polygon") { style = resolveStyle(node, style); built = buildPointSeries(node, true); }
            else if (tag === "polyline") { style = resolveStyle(node, style); built = buildPointSeries(node, false); }
            else if (tag === "use") {
                style = resolveStyle(node, style);
                var href = (node.getAttributeNS && node.getAttributeNS("http://www.w3.org/1999/xlink", "href")) || node.getAttribute("href") || "";
                var target = null;
                if (href.charAt(0) === "#") {
                    var scopeDoc = node.viewportElement || node.ownerDocument || document;
                    target = scopeDoc.getElementById ? scopeDoc.getElementById(href.slice(1)) : null;
                }
                if (target) walk(target, style);
                else console.warn("SVGLoader: 'use node' references non-existent node id: " + href.slice(1));
            }
            if (built) {
                if (style.fill !== undefined && style.fill !== "none" && style.fill.indexOf("url") !== 0) built.color.setStyle(style.fill, "srgb");
                applyMatrixToPath(built, cumulative);
                var carried = Object.assign({}, style);
                carried.strokeWidth = style.strokeWidth * transformScale(cumulative);
                built.userData = { node: node, style: carried, transform: cumulative.clone(), gradients: gradients };
                paths.push(built);
            }
            if (tag === "defs") {
                var inner = node.childNodes;
                for (var d = 0; d < inner.length; d++) {
                    var name = inner[d].nodeName;
                    if (name === "style" || name === "defs") walk(inner[d], style);
                }
            } else {
                var children = node.childNodes;
                for (var c = 0; c < children.length; c++) walk(children[c], style);
            }
            if (local) stack.pop();
        }
        collectStylesheets(document);
        collectGradients(document);
        walk(document.documentElement, { fill: "#000", fillOpacity: 1, strokeOpacity: 1, strokeWidth: 1, strokeLineJoin: "miter", strokeLineCap: "butt", strokeMiterLimit: 4 });
        return { paths: paths, gradients: gradients, xml: document.documentElement };
    }
    static createShapes(shapePath) { return shapePath.toShapes(); }
    static createFillMaterial(shapePath) {
        var style = shapePath.userData.style;
        if (!style || style.fill === undefined || style.fill === "none") return null;
        var material = new BasicMaterial({ opacity: style.fillOpacity * (style.opacity || 1), transparent: true, side: DoubleSide, depthWrite: false });
        var reference = GRADIENT_REFERENCE.exec(style.fill);
        if (reference) {
            var gradient = shapePath.userData.gradients && shapePath.userData.gradients[reference[1]];
            var texture = bakeGradientTexture(gradient, shapePath);
            if (texture) { material.diffuseMap = texture; return material; }
        }
        material.color = shapePath.color;
        return material;
    }
    static createStrokeMaterial(shapePath) {
        var style = shapePath.userData.style;
        if (!style || style.stroke === undefined || style.stroke === "none") return null;
        if (GRADIENT_REFERENCE.test(style.stroke)) console.warn("SVGLoader: Gradient strokes are not supported.");
        var material = new BasicMaterial({ opacity: style.strokeOpacity * (style.opacity || 1), transparent: true, side: DoubleSide, depthWrite: false });
        material.color = new Color().setStyle(style.stroke, "srgb");
        return material;
    }
    static getStrokeStyle(width, color, lineJoin, lineCap, miterLimit) {
        return {
            strokeColor: color !== undefined ? color : "#000",
            strokeWidth: width !== undefined ? width : 1,
            strokeLineJoin: lineJoin !== undefined ? lineJoin : "miter",
            strokeLineCap: lineCap !== undefined ? lineCap : "butt",
            strokeMiterLimit: miterLimit !== undefined ? miterLimit : 4
        };
    }
    static pointsToStroke(points, style, arcDivisions, minDistance) {
        var vertices = [], normals = [], uvs = [];
        if (SVGLoader.pointsToStrokeWithBuffers(points, style, arcDivisions, minDistance, vertices, normals, uvs, 0) === 0) return null;
        var geometry = new Geometry();
        geometry.setAttribute("position", new Float32Array(vertices), 3);
        geometry.setAttribute("normal", new Float32Array(normals), 3);
        geometry.setAttribute("uv", new Float32Array(uvs), 2);
        return geometry;
    }
    static pointsToStrokeWithBuffers(points, style, arcDivisions, minDistance, vertices, normals, uvs, vertexOffset) {
        arcDivisions = arcDivisions !== undefined ? arcDivisions : 12;
        minDistance = minDistance !== undefined ? minDistance : 0.001;
        vertexOffset = vertexOffset !== undefined ? vertexOffset : 0;
        if (!points || points.length < 2) return 0;
        var kept = [points[0]];
        for (var d = 1; d < points.length - 1; d++) {
            if (points[d].distanceTo(kept[kept.length - 1]) >= minDistance) kept.push(points[d]);
        }
        kept.push(points[points.length - 1]);
        var count = kept.length;
        if (count < 2) return 0;
        var closed = kept[0].equals(kept[count - 1]);
        var half = style.strokeWidth / 2;
        var limit = style.strokeMiterLimit;
        var positions = [];
        var uvData = [];
        function emit(ax, ay, ua, va, bx, by, ub, vb, cx, cy, uc, vc) {
            var cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
            if (cross < 0) {
                var sx = bx, sy = by, su = ub, sv = vb;
                bx = cx; by = cy; ub = uc; vb = vc;
                cx = sx; cy = sy; uc = su; vc = sv;
            }
            positions.push(ax, ay, 0, bx, by, 0, cx, cy, 0);
            uvData.push(ua, va, ub, vb, uc, vc);
        }
        function emitSweep(centerX, centerY, fromX, fromY, span, u) {
            var steps = Math.max(1, arcDivisions - 1);
            var a0 = Math.atan2(fromY - centerY, fromX - centerX);
            var previousX = fromX, previousY = fromY;
            for (var s = 1; s <= steps; s++) {
                var angle = a0 + span * (s / steps);
                var nextX = centerX + Math.cos(angle) * half;
                var nextY = centerY + Math.sin(angle) * half;
                emit(centerX, centerY, u, 0.5, previousX, previousY, u, 0.5, nextX, nextY, u, 0.5);
                previousX = nextX;
                previousY = nextY;
            }
        }
        function meetPoint(pA, dA, pB, dB) {
            var cross = dA[0] * dB[1] - dA[1] * dB[0];
            if (Math.abs(cross) < 1e-12) return null;
            var t = ((pB.x - pA.x) * dB[1] - (pB.y - pA.y) * dB[0]) / cross;
            return { x: pA.x + dA[0] * t, y: pA.y + dA[1] * t };
        }
        var startL = [], startR = [], endL = [], endR = [], directions = [];
        for (var s = 0; s < count - 1; s++) {
            var dx = kept[s + 1].x - kept[s].x, dy = kept[s + 1].y - kept[s].y;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            var nx = -dy / len, ny = dx / len;
            directions.push([dx / len, dy / len]);
            startL.push({ x: kept[s].x + nx * half, y: kept[s].y + ny * half });
            startR.push({ x: kept[s].x - nx * half, y: kept[s].y - ny * half });
            endL.push({ x: kept[s + 1].x + nx * half, y: kept[s + 1].y + ny * half });
            endR.push({ x: kept[s + 1].x - nx * half, y: kept[s + 1].y - ny * half });
        }
        for (var j = 1; j < count - 1; j++) {
            var inDir = directions[j - 1], outDir = directions[j];
            var turn = inDir[0] * outDir[1] - inDir[1] * outDir[0];
            if (Math.abs(turn) < 1e-12) continue;
            var leftInner = turn > 0;
            var innerEnd = leftInner ? endL[j - 1] : endR[j - 1];
            var innerStart = leftInner ? startL[j] : startR[j];
            var outerEnd = leftInner ? endR[j - 1] : endL[j - 1];
            var outerStart = leftInner ? startR[j] : startL[j];
            var incoming = [-inDir[0], -inDir[1]];
            var innerMeet = meetPoint(innerEnd, incoming, innerStart, outDir);
            if (innerMeet) {
                var driftIn = (innerMeet.x - kept[j].x) * -inDir[0] + (innerMeet.y - kept[j].y) * -inDir[1];
                var driftOut = (innerMeet.x - kept[j].x) * outDir[0] + (innerMeet.y - kept[j].y) * outDir[1];
                var prevLen = Math.sqrt(Math.pow(kept[j].x - kept[j - 1].x, 2) + Math.pow(kept[j].y - kept[j - 1].y, 2));
                var nextLen = Math.sqrt(Math.pow(kept[j + 1].x - kept[j].x, 2) + Math.pow(kept[j + 1].y - kept[j].y, 2));
                if (driftIn < prevLen * 2 && driftOut < nextLen * 2) {
                    if (leftInner) { endL[j - 1] = innerMeet; startL[j] = innerMeet; }
                    else { endR[j - 1] = innerMeet; startR[j] = innerMeet; }
                }
            }
            var join = style.strokeLineJoin;
            var u = j / (count - 1);
            if (join === "round") {
                var sweep = Math.atan2(turn, inDir[0] * outDir[0] + inDir[1] * outDir[1]);
                emitSweep(kept[j].x, kept[j].y, outerEnd.x, outerEnd.y, sweep, u);
            } else if (join === "bevel") {
                emit(kept[j].x, kept[j].y, u, 0.5, outerEnd.x, outerEnd.y, u, 0.5, outerStart.x, outerStart.y, u, 0.5);
            } else {
                var miter = meetPoint(outerEnd, incoming, outerStart, outDir);
                var miterReach = miter ? Math.sqrt(Math.pow(miter.x - kept[j].x, 2) + Math.pow(miter.y - kept[j].y, 2)) : Infinity;
                if (miter && miterReach <= limit * half) {
                    if (leftInner) { endR[j - 1] = miter; startR[j] = miter; }
                    else { endL[j - 1] = miter; startL[j] = miter; }
                } else if (join === "miter-clip" && miter) {
                    var clip = limit * half / miterReach;
                    var clipped = { x: kept[j].x + (miter.x - kept[j].x) * clip, y: kept[j].y + (miter.y - kept[j].y) * clip };
                    if (leftInner) { endR[j - 1] = clipped; startR[j] = clipped; }
                    else { endL[j - 1] = clipped; startL[j] = clipped; }
                    emit(outerEnd.x, outerEnd.y, u, 1, clipped.x, clipped.y, u, 0.5, outerStart.x, outerStart.y, u, 1);
                } else {
                    emit(kept[j].x, kept[j].y, u, 0.5, outerEnd.x, outerEnd.y, u, 0.5, outerStart.x, outerStart.y, u, 0.5);
                }
            }
        }
        for (var q = 0; q < count - 1; q++) {
            var u0 = q / (count - 1), u1 = (q + 1) / (count - 1);
            emit(startL[q].x, startL[q].y, u0, 1, startR[q].x, startR[q].y, u0, 0, endL[q].x, endL[q].y, u1, 1);
            emit(startR[q].x, startR[q].y, u0, 0, endR[q].x, endR[q].y, u1, 0, endL[q].x, endL[q].y, u1, 1);
        }
        if (!closed) {
            var cap = style.strokeLineCap;
            if (cap === "round") {
                emitSweep(kept[0].x, kept[0].y, startL[0].x, startL[0].y, Math.PI, 0);
                emitSweep(kept[count - 1].x, kept[count - 1].y, endR[count - 2].x, endR[count - 2].y, Math.PI, 1);
            } else if (cap === "square") {
                var backX = -directions[0][0] * half, backY = -directions[0][1] * half;
                emit(startL[0].x, startL[0].y, 0, 1, startR[0].x, startR[0].y, 0, 0, startL[0].x + backX, startL[0].y + backY, 0, 1);
                emit(startR[0].x, startR[0].y, 0, 0, startR[0].x + backX, startR[0].y + backY, 0, 0, startL[0].x + backX, startL[0].y + backY, 0, 1);
                var head = directions[count - 2];
                var headX = head[0] * half, headY = head[1] * half;
                var lastL = endL[count - 2], lastR = endR[count - 2];
                emit(lastL.x, lastL.y, 1, 1, lastR.x, lastR.y, 1, 0, lastL.x + headX, lastL.y + headY, 1, 1);
                emit(lastR.x, lastR.y, 1, 0, lastR.x + headX, lastR.y + headY, 1, 0, lastL.x + headX, lastL.y + headY, 1, 1);
            }
        }
        var total = positions.length;
        if (vertices) {
            var base = vertexOffset * 3;
            for (var v = 0; v < total; v++) vertices[base + v] = positions[v];
            if (normals) for (var n = 0; n < total; n++) normals[base + n] = n % 3 === 2 ? 1 : 0;
            if (uvs) {
                var baseUv = vertexOffset * 2;
                for (var w = 0; w < uvData.length; w++) uvs[baseUv + w] = uvData[w];
            }
        }
        return total;
    }
}

export { SVGLoader };

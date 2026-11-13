import { faoxomsvgcomputelocalbbox, faoxomsvgstopstorgba } from "../core/index.js";
import { Matrix3 } from "../math/index.js";
import { DataTexture } from "./DataTexture.js";

function faoxomsvgbuildgradienttexture(gradient, shapePath, resolution) {
    if (!gradient || !Array.isArray(gradient.stops) || gradient.stops.length === 0) return null;
    resolution = resolution || 256;
    var worldTransform = shapePath.userData.transform;
    var isBBoxUnits = gradient.gradientUnits === "objectBoundingBox";
    var localBBox = null;
    if (isBBoxUnits) {
        localBBox = faoxomsvgcomputelocalbbox(shapePath, worldTransform);
        if (localBBox === null) return null;
    }
    function resolveX(x, y) {
        var rx = x, ry = y;
        if (gradient.gradientTransform) {
            var g = gradient.gradientTransform.elements;
            var nx = g[0] * rx + g[3] * ry + g[6];
            var ny = g[1] * rx + g[4] * ry + g[7];
            rx = nx;
            ry = ny;
        }
        if (isBBoxUnits) {
            rx = localBBox.minX + rx * localBBox.width;
            ry = localBBox.minY + ry * localBBox.height;
        }
        if (worldTransform) {
            var w = worldTransform.elements;
            var wx = w[0] * rx + w[3] * ry + w[6];
            var wy = w[1] * rx + w[4] * ry + w[7];
            rx = wx;
            ry = wy;
        }
        return { x: rx, y: ry };
    }
    var textureMatrix, width, height, data;
    if (gradient.type === "linearGradient") {
        width = resolution;
        height = 1;
        data = new Uint8Array(width * height * 4);
        for (var x = 0; x < width; x++) {
            var rgba = faoxomsvgstopstorgba(gradient.stops, x / (resolution - 1));
            data[x * 4] = Math.round(Math.min(1, Math.max(0, rgba[0])) * 255);
            data[x * 4 + 1] = Math.round(Math.min(1, Math.max(0, rgba[1])) * 255);
            data[x * 4 + 2] = Math.round(Math.min(1, Math.max(0, rgba[2])) * 255);
            data[x * 4 + 3] = Math.round(Math.min(1, Math.max(0, rgba[3])) * 255);
        }
        var p1 = resolveX(gradient.x1, gradient.y1);
        var p2 = resolveX(gradient.x2, gradient.y2);
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        var len2 = dx * dx + dy * dy || 1e-20;
        var a = dx / len2, b = dy / len2;
        var c = -(a * p1.x + b * p1.y);
        textureMatrix = new Matrix3().set(a, b, c, 0, 0, 0.5, 0, 0, 1);
    } else {
        var cx = gradient.cx, cy = gradient.cy, fx = gradient.fx, fy = gradient.fy, r = gradient.r;
        if (gradient.gradientTransform) {
            var g2 = gradient.gradientTransform.elements;
            var ncx = g2[0] * cx + g2[3] * cy + g2[6];
            var ncy = g2[1] * cx + g2[4] * cy + g2[7];
            var nfx = g2[0] * fx + g2[3] * fy + g2[6];
            var nfy = g2[1] * fx + g2[4] * fy + g2[7];
            cx = ncx;
            cy = ncy;
            fx = nfx;
            fy = nfy;
        }
        if (isBBoxUnits) {
            cx = localBBox.minX + cx * localBBox.width;
            cy = localBBox.minY + cy * localBBox.height;
            fx = localBBox.minX + fx * localBBox.width;
            fy = localBBox.minY + fy * localBBox.height;
            r = r * Math.sqrt((localBBox.width * localBBox.width + localBBox.height * localBBox.height) / 2);
        }
        if (r <= 0) return null;
        var fdx = fx - cx, fdy = fy - cy;
        var fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fdist >= r) {
            var clamp = (r - 1e-6) / fdist;
            fx = cx + fdx * clamp;
            fy = cy + fdy * clamp;
        }
        width = resolution;
        height = resolution;
        data = new Uint8Array(width * height * 4);
        var localMinX = cx - r, localMinY = cy - r, localSpan = 2 * r;
        for (var py = 0; py < height; py++) {
            for (var px = 0; px < width; px++) {
                var pixelX = localMinX + (px / (resolution - 1)) * localSpan;
                var pixelY = localMinY + (py / (resolution - 1)) * localSpan;
                var ddx = pixelX - fx, ddy = pixelY - fy;
                var t = 0;
                var dist2 = ddx * ddx + ddy * ddy;
                if (dist2 > 0) {
                    var vxx = fx - cx, vyy = fy - cy;
                    var b2 = vxx * ddx + vyy * ddy;
                    var c2 = vxx * vxx + vyy * vyy - r * r;
                    var disc = b2 * b2 - dist2 * c2;
                    if (disc <= 0) t = 1;
                    else {
                        var u = (-b2 + Math.sqrt(disc)) / dist2;
                        t = 1 / u;
                    }
                    if (t < 0) t = 0;
                    if (t > 1) t = 1;
                }
                var rgba2 = faoxomsvgstopstorgba(gradient.stops, t);
                var o = (py * width + px) * 4;
                data[o] = Math.round(Math.min(1, Math.max(0, rgba2[0])) * 255);
                data[o + 1] = Math.round(Math.min(1, Math.max(0, rgba2[1])) * 255);
                data[o + 2] = Math.round(Math.min(1, Math.max(0, rgba2[2])) * 255);
                data[o + 3] = Math.round(Math.min(1, Math.max(0, rgba2[3])) * 255);
            }
        }
        var inv = worldTransform ? new Matrix3().copy(worldTransform).invert() : new Matrix3();
        var norm = new Matrix3().set(1 / localSpan, 0, -localMinX / localSpan, 0, 1 / localSpan, -localMinY / localSpan, 0, 0, 1);
        textureMatrix = norm.multiply(inv);
    }
    var texture = new DataTexture(data, width, height, { minFilter: "linear", magFilter: "linear", colorSpace: "srgb" });
    texture.matrixAutoUpdate = false;
    texture.matrix = textureMatrix;
    texture.wrapS = gradient.spreadMethod === "reflect" ? "mirror" : gradient.spreadMethod === "repeat" ? "repeat" : "clamp";
    texture.wrapT = texture.wrapS;
    return texture;
}

export { faoxomsvgbuildgradienttexture };

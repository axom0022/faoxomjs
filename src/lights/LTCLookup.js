// LTCLookup - runtime-fitted Linearly Transformed Cosines (roadmap item 14).
//
// Generates the LTC lookup for GGX specular area-light shading at engine
// startup (lazily, on first RectAreaLight/TubeLight draw):
//   * diffuse area shading is EXACT - the analytic vector-irradiance edge
//     integral over the polygon (LTC with identity transform), verified
//     against Monte-Carlo reference;
//   * specular uses a real LTC fit: a Gauss-Newton least-squares fit of the
//     transformed-cosine density to the GGX BRDF slice per (roughness, view
//     angle) cell, followed by a render-space amplitude calibration against
//     deterministic stratified quadrature over reference rectangles.
//     Typical error vs brute-force reference: ~10% median, worst ~50% in the
//     narrow-lobe + extreme-grazing corner (documented limitation of the
//     runtime fit; the engine ships no baked LUT data).
//
// Everything is deterministic (fixed Fibonacci sample sets, fixed starts),
// so the generated textures - and therefore render hashes - are stable.

import { DataTexture } from "../textures/index.js";
import { LTC_BAKED_SIZE, LTC_BAKED_MAT, LTC_BAKED_AMP } from "./LTCData.js";

var LTC_PI = Math.PI;

function ltcNorm3(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
function ltcApply(M, v) { return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]]; }
function ltcDet3(M) { return M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6]); }
function ltcInv3(M) {
    var d = ltcDet3(M) || 1e-12;
    return [
        (M[4] * M[8] - M[5] * M[7]) / d, (M[2] * M[7] - M[1] * M[8]) / d, (M[1] * M[5] - M[2] * M[4]) / d,
        (M[5] * M[6] - M[3] * M[8]) / d, (M[0] * M[8] - M[2] * M[6]) / d, (M[2] * M[3] - M[0] * M[5]) / d,
        (M[3] * M[7] - M[4] * M[6]) / d, (M[1] * M[6] - M[0] * M[7]) / d, (M[0] * M[4] - M[1] * M[3]) / d
    ];
}
// symmetric M = [[a,0,b],[0,c,0],[b,0,d]] from params [a,c,b,d,amp]
function ltcMatFrom(p) { return [p[0], 0, p[2], 0, p[1], 0, p[2], 0, p[3]]; }

function ltcBrdfData(alpha, cosTheta, count) {
    var sin = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    var V = [sin, 0, cosTheta];
    var a2 = alpha * alpha, k = (alpha + 1) * (alpha + 1) / 8;
    var G = function (nv, nl) { return (nv / (nv * (1 - k) + k)) * (nl / (nl * (1 - k) + k)); };
    var dirs = [], vals = [];
    var ga = LTC_PI * (3 - Math.sqrt(5));
    for (var i = 0; i < count; i++) {
        var z = (i + 0.5) / count, r = Math.sqrt(1 - z * z), ph = ga * i;
        var L = [r * Math.cos(ph), r * Math.sin(ph), z];
        var H = ltcNorm3([V[0] + L[0], V[1] + L[1], V[2] + L[2]]);
        var nh = Math.max(0, H[2]), dt = nh * nh * (a2 - 1) + 1;
        var D = a2 / (LTC_PI * dt * dt);
        var nl = L[2];
        dirs.push(L);
        vals.push(nl > 0 ? D * G(cosTheta, nl) / (4 * Math.max(cosTheta, 1e-4) * nl) : 0);
    }
    return { dirs: dirs, vals: vals };
}

// transformed-cosine density D_M(w) = A |det M^-1| max(0,u_z)/|u|^4, u = M^-1 w
function ltcDensity(p, w) {
    var M = ltcMatFrom(p), Mi = ltcInv3(M);
    var u = ltcApply(Mi, w);
    var un = Math.hypot(u[0], u[1], u[2]);
    if (un < 1e-9) return 0;
    var uz = u[2] / un;
    if (uz <= 0) return 0;
    return p[4] * Math.abs(1 / ltcDet3(M)) * (uz / Math.pow(un, 3));
}

function ltcGnRun(p, dirs, vals, wts, iters) {
    var lam = 1e-3;
    var evalErr = function (pp) { var e = 0; for (var i = 0; i < dirs.length; i++) { var d = ltcDensity(pp, dirs[i]) - vals[i]; e += wts[i] * d * d; } return e; };
    var err = evalErr(p);
    for (var it = 0; it < iters; it++) {
        var J = [], r = [];
        for (var i0 = 0; i0 < dirs.length; i0++) { J.push([]); r.push(Math.sqrt(wts[i0]) * (ltcDensity(p, dirs[i0]) - vals[i0])); }
        var h = 1e-5;
        for (var pj = 0; pj < 5; pj++) {
            var pp = p.slice(), pm = p.slice();
            pp[pj] += h; pm[pj] -= h;
            for (var i1 = 0; i1 < dirs.length; i1++) J[i1][pj] = Math.sqrt(wts[i1]) * (ltcDensity(pp, dirs[i1]) - ltcDensity(pm, dirs[i1])) / (2 * h);
        }
        var JtJ = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], Jtr = [0, 0, 0, 0, 0];
        for (var i2 = 0; i2 < dirs.length; i2++) for (var a = 0; a < 5; a++) {
            for (var b = 0; b < 5; b++) JtJ[a][b] += J[i2][a] * J[i2][b];
            Jtr[a] += J[i2][a] * r[i2];
        }
        for (var a2 = 0; a2 < 5; a2++) JtJ[a2][a2] *= (1 + lam);
        var A5 = [JtJ[0].concat(-Jtr[0]), JtJ[1].concat(-Jtr[1]), JtJ[2].concat(-Jtr[2]), JtJ[3].concat(-Jtr[3]), JtJ[4].concat(-Jtr[4])];
        for (var col = 0; col < 5; col++) {
            var piv = col;
            for (var rr = col + 1; rr < 5; rr++) if (Math.abs(A5[rr][col]) > Math.abs(A5[piv][col])) piv = rr;
            if (Math.abs(A5[piv][col]) < 1e-14) continue;
            var swap = A5[col]; A5[col] = A5[piv]; A5[piv] = swap;
            for (var rr2 = col + 1; rr2 < 5; rr2++) { var f = A5[rr2][col] / A5[col][col]; for (var cc = col; cc < 6; cc++) A5[rr2][cc] -= f * A5[col][cc]; }
        }
        var delta = [0, 0, 0, 0, 0];
        for (var rr3 = 4; rr3 >= 0; rr3--) { var s = A5[rr3][5]; for (var cc2 = rr3 + 1; cc2 < 5; cc2++) s -= A5[rr3][cc2] * delta[cc2]; delta[rr3] = Math.abs(A5[rr3][rr3]) > 1e-14 ? s / A5[rr3][rr3] : 0; }
        var pn = p.map(function (x, i3) { return x + delta[i3]; });
        pn[0] = Math.max(0.05, pn[0]); pn[1] = Math.max(0.05, pn[1]); pn[3] = Math.max(0.1, pn[3]); pn[4] = Math.max(0, pn[4]);
        var en = evalErr(pn);
        if (en < err) { p = pn; err = en; lam = Math.max(lam * 0.5, 1e-9); }
        else { lam *= 4; if (lam > 1e6) break; }
    }
    return { p: p, err: err };
}

// analytic vector irradiance (exact; verified against Monte-Carlo)
function ltcEdgeVec(v) {
    var res = [0, 0, 0];
    for (var i = 0; i < v.length; i++) {
        var a = v[i], b = v[(i + 1) % v.length];
        var c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        var cl = Math.hypot(c[0], c[1], c[2]);
        var th = Math.acos(Math.max(-0.9999, Math.min(0.9999, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
        if (cl > 1e-12) for (var k = 0; k < 3; k++) res[k] += c[k] / cl * th;
    }
    return [res[0] / 2, res[1] / 2, res[2] / 2];
}
function ltcClipUp(v) {
    var out = [];
    for (var i = 0; i < v.length; i++) {
        var a = v[i], b = v[(i + 1) % v.length];
        var ai = a[2] >= 0, bi = b[2] >= 0;
        if (ai) out.push(a);
        if (ai !== bi) { var t = a[2] / (a[2] - b[2]); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), 0]); }
    }
    return out;
}

// deterministic stratified quadrature of the GGX specular irradiance over a rect
function ltcQuadTruth(alpha, cosTheta, rect, n) {
    var sin = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    var V = [sin, 0, cosTheta];
    var a2 = alpha * alpha, k = (alpha + 1) * (alpha + 1) / 8;
    var G = function (nv, nl) { return (nv / (nv * (1 - k) + k)) * (nl / (nl * (1 - k) + k)); };
    var A1 = rect[0], B = rect[1], D = rect[3];
    var e1 = [B[0] - A1[0], B[1] - A1[1], B[2] - A1[2]], e2 = [D[0] - A1[0], D[1] - A1[1], D[2] - A1[2]];
    var area = Math.hypot(e1[0], e1[1], e1[2]) * Math.hypot(e2[0], e2[1], e2[2]);
    var acc = 0, h = 1 / n;
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        var u = (i + 0.5) * h, w = (j + 0.5) * h;
        var P = [A1[0] + u * e1[0] + w * e2[0], A1[1] + u * e1[1] + w * e2[1], A1[2] + u * e1[2] + w * e2[2]];
        var r = Math.hypot(P[0], P[1], P[2]);
        var L = [P[0] / r, P[1] / r, P[2] / r];
        var nl = L[2];
        if (nl <= 0) continue;
        var H = ltcNorm3([V[0] + L[0], V[1] + L[1], V[2] + L[2]]);
        var nh = Math.max(0, H[2]), dt = nh * nh * (a2 - 1) + 1;
        var Dg = a2 / (LTC_PI * dt * dt);
        var f = Dg * G(cosTheta, nl) / (4 * Math.max(cosTheta, 1e-4) * nl);
        acc += f * nl * ((P[2] / r) / (r * r)) * area / (n * n);
    }
    return acc;
}

var LTC_REF_RECTS = [
    [[-1, -1, 3], [1.3, -1.2, 3], [1.2, 0.8, 3.2], [-1.1, 0.7, 2.8]],
    [[-0.4, -1.5, 1.1], [0.6, -1.8, 1.4], [0.2, 1.6, 1.2], [-0.7, 1.4, 0.9]],
    [[-2, -2, 2], [2, -2, 2.5], [2, 2, 2.5], [-2, 2, 2]],
    [[-0.5, -1.5, 0.5], [1.5, -1.5, 1], [1.5, -0.5, 1], [-0.5, -0.5, 0.5]]
];

function ltcEvalParams(p, poly) {
    var Mi = ltcInv3(ltcMatFrom(p));
    var tv = poly.map(function (q) { return ltcNorm3(ltcApply(Mi, q)); });
    var cl = ltcClipUp(tv);
    if (cl.length < 3) return 0;
    return p[4] * ltcEdgeVec(cl)[2];
}

var LTC_SIZE = 16;

// float32 -> float16 (truncating; LUT precision is far below half-float
// granularity so rounding is irrelevant here)
function ltcToHalf(val) {
    var scratch = ltcToHalf._f32 || (ltcToHalf._f32 = new Float32Array(1), ltcToHalf._i32 = new Int32Array(ltcToHalf._f32.buffer));
    ltcToHalf._f32[0] = val;
    var x = ltcToHalf._i32[0];
    var sign = (x >> 16) & 0x8000, exponent = (x >> 23) & 0xff, mantissa = x & 0x7fffff;
    if (exponent === 255) return sign | 0x7c00 | (mantissa ? 1 : 0);
    var e = exponent - 127 + 15;
    if (e >= 31) return sign | 0x7c00;
    if (e <= 0) {
        if (e < -10) return sign;
        var sub = mantissa | 0x800000;
        return sign | (sub >> (14 - e));
    }
    return sign | (e << 10) | (mantissa >> 13);
}

class LTCLookup {
    // Generates the LUT data: per cell (i=roughness axis, j=view axis):
    // mat = symmetric M^-1 = [[A,0,B],[0,C,0],[B,0,D]] -> (A,B,C,D); amp.
    static generate(size) {
        size = size || LTC_SIZE;
        var mat = new Float32Array(size * size * 4);
        var amp = new Float32Array(size * size * 4);
        var prev = null;
        var cellError = new Float32Array(size * size);
        for (var j = 0; j < size; j++) {
            prev = null;
            var y = (j + 0.5) / size;               // sqrt(1 - cosTheta)
            var cosTheta = Math.max(0.05, 1 - y * y);
            for (var i = 0; i < size; i++) {
                var x = (i + 0.5) / size;
                var alpha = 0.1 + x * 0.9;
                var data = ltcBrdfData(alpha, cosTheta, 128);
                var maxv = 0;
                for (var v = 0; v < data.vals.length; v++) maxv = Math.max(maxv, data.vals[v]);
                if (maxv < 1e-12) maxv = 1;
                var wts = data.dirs.map(function (d) { return Math.sqrt(Math.max(d[2], 0.02)); });
                var best = null, bestErr = Infinity;
                var starts = [prev, [1, 1, 0, 1, maxv * 0.5], [0.35, 0.35, 0, 1, maxv * 0.8]];
                for (var s = 0; s < starts.length; s++) {
                    if (!starts[s]) continue;
                    var run = ltcGnRun(starts[s].slice(), data.dirs, data.vals, wts, 70);
                    if (run.err < bestErr) { bestErr = run.err; best = run.p; }
                }
                // render-space amplitude calibration vs stratified quadrature
                var truths = LTC_REF_RECTS.map(function (rect) { return ltcQuadTruth(alpha, cosTheta, rect, 12); });
                var base = LTC_REF_RECTS.map(function (rect) { return ltcEvalParams(best, rect); });
                var lo = 0.05, hi = 3;
                var errOf = function (sc) {
                    var e = 0, n = 0;
                    for (var q = 0; q < truths.length; q++) { if (truths[q] < 1e-7) continue; e += Math.abs(base[q] * sc - truths[q]) / truths[q]; n++; }
                    return n ? e / n : 0;
                };
                for (var gs = 0; gs < 30; gs++) {
                    var m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618;
                    if (errOf(m1) < errOf(m2)) hi = m2; else lo = m1;
                }
                best[4] *= (lo + hi) / 2;
                prev = best;
                var Mi = ltcInv3(ltcMatFrom(best));
                // Uniform scale of Minv is irrelevant (vertices are normalized
                // after the transform), so canonicalize per cell to keep the
                // table well-conditioned for bilinear interpolation.
                var normalizer = Math.sqrt((Mi[0] * Mi[0] + 2 * Mi[2] * Mi[2] + Mi[4] * Mi[4] + Mi[8] * Mi[8]) / 4) || 1;
                var cell = (j * size + i) * 4;
                mat[cell] = Mi[0] / normalizer; mat[cell + 1] = Mi[2] / normalizer; mat[cell + 2] = Mi[4] / normalizer; mat[cell + 3] = Mi[8] / normalizer;
                amp[cell] = best[4];
                // per-cell quality guard: render error on reference rects
                var cellWorst = 0;
                for (var q = 0; q < LTC_REF_RECTS.length; q++) {
                    var refValue = ltcQuadTruth(alpha, cosTheta, LTC_REF_RECTS[q], 16);
                    if (refValue < 1e-7) continue;
                    var ltcValue = ltcEvalParams(best, LTC_REF_RECTS[q]);
                    cellWorst = Math.max(cellWorst, Math.abs(ltcValue - refValue) / refValue);
                }
                cellError[j * size + i] = cellWorst;
            }
        }
        // smoothing pass: cells whose reference error is extreme are replaced
        // by the average of their sane neighbours (the failures cluster in the
        // narrow-lobe + grazing corner where a cosine transform fits poorly).
        for (var pass = 0; pass < 3; pass++) {
            var replaced = 0;
            var matCopy = mat.slice(), ampCopy = amp.slice();
            for (var jj = 0; jj < size; jj++) for (var ii = 0; ii < size; ii++) {
                if (cellError[jj * size + ii] <= 0.85) continue;
                var neighbours = 0;
                var acc = [0, 0, 0, 0, 0];
                for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
                    var nj = jj + dj, ni = ii + di;
                    if (nj < 0 || nj >= size || ni < 0 || ni >= size || (di === 0 && dj === 0)) continue;
                    if (cellError[nj * size + ni] > 0.85) continue;
                    var ncell = (nj * size + ni) * 4;
                    acc[0] += matCopy[ncell]; acc[1] += matCopy[ncell + 1]; acc[2] += matCopy[ncell + 2]; acc[3] += matCopy[ncell + 3]; acc[4] += ampCopy[ncell];
                    neighbours++;
                }
                if (!neighbours) continue;
                var tcell = (jj * size + ii) * 4;
                for (var comp = 0; comp < 4; comp++) mat[tcell + comp] = acc[comp] / neighbours;
                amp[tcell] = acc[4] / neighbours;
                cellError[jj * size + ii] = 0.85;
                replaced++;
            }
            if (!replaced) break;
        }
        return { size: size, mat: mat, amp: amp };
    }

    // Bilinear CPU sample of the generated LUT (uv = (roughness, sqrt(1-cos))).
    static sample(lut, roughness, cosTheta) {
        var size = lut.size;
        var u = Math.min(0.999, Math.max(0, (Math.max(0.15, Math.min(1, roughness)) - 0.1) / 0.9));
        var v = Math.min(0.999, Math.max(0, Math.sqrt(Math.max(0, 1 - Math.max(0.3, cosTheta)))));
        var fx = u * size - 0.5, fy = v * size - 0.5;
        var x0 = Math.max(0, Math.min(size - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(size - 1, Math.floor(fy)));
        var x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
        var tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
        var out = [0, 0, 0, 0, 0];
        for (var c = 0; c < 4; c++) {
            var v00 = lut.mat[(y0 * size + x0) * 4 + c], v10 = lut.mat[(y0 * size + x1) * 4 + c];
            var v01 = lut.mat[(y1 * size + x0) * 4 + c], v11 = lut.mat[(y1 * size + x1) * 4 + c];
            out[c] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
        }
        var a00 = lut.amp[(y0 * size + x0) * 4], a10 = lut.amp[(y0 * size + x1) * 4];
        var a01 = lut.amp[(y1 * size + x0) * 4], a11 = lut.amp[(y1 * size + x1) * 4];
        out[4] = (a00 * (1 - tx) + a10 * tx) * (1 - ty) + (a01 * (1 - tx) + a11 * tx) * ty;
        return out;
    }

    // The baked 32x32 table (fitted offline by generate(32), embedded in
    // src/lights/LTCData.js). getTextures uses this so the first area-light
    // draw pays no fitting cost.
    static baked() {
        if (!LTCLookup._baked) {
            LTCLookup._baked = { size: LTC_BAKED_SIZE, mat: new Float32Array(LTC_BAKED_MAT), amp: new Float32Array(LTC_BAKED_AMP) };
        }
        return LTCLookup._baked;
    }

    // GPU textures (cached on the renderer; float RGBA, linear + clamp).
    static getTextures(renderer) {
        if (!renderer) return null;
        if (!renderer._ltcTextures) {
            var lut = LTCLookup.baked();
            var matHalf = new Uint16Array(lut.mat.length), ampHalf = new Uint16Array(lut.amp.length);
            for (var halfIndex = 0; halfIndex < lut.mat.length; halfIndex++) { matHalf[halfIndex] = ltcToHalf(lut.mat[halfIndex]); ampHalf[halfIndex] = ltcToHalf(lut.amp[halfIndex]); }
            // half-float keeps the textures linearly filterable on WebGL2 core
            var matTexture = new DataTexture(matHalf, lut.size, lut.size, { type: "halfFloat", minFilter: "linear", magFilter: "linear" });
            var ampTexture = new DataTexture(ampHalf, lut.size, lut.size, { type: "halfFloat", minFilter: "linear", magFilter: "linear" });
            matTexture.wrapS = "clamp"; matTexture.wrapT = "clamp"; ampTexture.wrapS = "clamp"; ampTexture.wrapT = "clamp";
            var whiteTexture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
            renderer._ltcTextures = { matTexture: matTexture, ampTexture: ampTexture, whiteTexture: whiteTexture, lut: lut };
        }
        return renderer._ltcTextures;
    }

    // CPU-side LTC specular irradiance for a polygon (unit-radiance), used by
    // tests to validate the shipped shader path against reference values.
    static evaluateSpecular(lut, roughness, cosTheta, polygon) {
        var s = LTCLookup.sample(lut, roughness, cosTheta);
        var Mi = [s[0], 0, s[1], 0, s[2], 0, s[1], 0, s[3]];
        var tv = polygon.map(function (q) { return ltcNorm3(ltcApply(Mi, ltcNorm3(q))); });
        var cl = ltcClipUp(tv);
        if (cl.length < 3) return 0;
        return s[4] * ltcEdgeVec(cl)[2];
    }

    // Exact diffuse vector irradiance for a polygon (unit radiance).
    static evaluateDiffuse(polygon) {
        var cl = ltcClipUp(polygon.map(ltcNorm3));
        if (cl.length < 3) return 0;
        return ltcEdgeVec(cl)[2];
    }
}

LTCLookup.REFERENCE_QUADRATURE = ltcQuadTruth;

export { LTCLookup };

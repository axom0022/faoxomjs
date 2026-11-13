import { FileLoader } from "./FileLoader.js";

var SH_C0 = 0.28209479177387814;

function parseHeaderLines(bytes) {
    var lines = [], cursor = 0, headerEnd = -1;
    while (cursor < bytes.length && headerEnd < 0) {
        var lineEnd = cursor;
        while (lineEnd < bytes.length && bytes[lineEnd] !== 10) lineEnd++;
        var line = "";
        for (var i = cursor; i < lineEnd; i++) line += String.fromCharCode(bytes[i]);
        line = line.trim();
        lines.push(line);
        cursor = lineEnd + 1;
        if (line === "end_header") headerEnd = cursor;
    }
    if (headerEnd < 0) throw new Error("Invalid PLY file: missing end_header");
    return { lines: lines, headerEnd: headerEnd };
}

function decodeSplatPly(data) {
    var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length < 3 || bytes[0] !== 112 || bytes[1] !== 108 || bytes[2] !== 121) throw new Error("Invalid PLY file");
    var header = parseHeaderLines(bytes);
    var format = "", elements = [], current = null;
    for (var h = 0; h < header.lines.length; h++) {
        var parts = header.lines[h].split(/\s+/);
        if (parts[0] === "format" && parts.length > 1) format = parts[1];
        else if (parts[0] === "element" && parts.length > 2) { current = { name: parts[1], count: parseInt(parts[2], 10) || 0, properties: [] }; elements.push(current); }
        else if (parts[0] === "property" && current && parts.length > 2 && parts[1] !== "list") current.properties.push({ name: parts[2], type: parts[1] });
    }
    if (format !== "ascii" && format !== "binary_little_endian") throw new Error("Gaussian splat PLY supports ascii and binary_little_endian formats, got: " + format);
    var vertex = null;
    for (var e = 0; e < elements.length; e++) if (elements[e].name === "vertex") vertex = elements[e];
    if (!vertex || !vertex.count) throw new Error("Gaussian splat PLY requires a vertex element with a positive count");
    var index = {}, required = ["x", "y", "z", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3", "opacity"];
    for (var p = 0; p < vertex.properties.length; p++) index[vertex.properties[p].name] = vertex.properties[p];
    for (var r = 0; r < required.length; r++) if (!index[required[r]]) throw new Error("Gaussian splat PLY missing required property: " + required[r]);
    var restCount = 0;
    while (index["f_rest_" + restCount]) restCount++;
    for (var rc = 0; rc < restCount; rc++) if (index["f_rest_" + rc].type !== index.x.type) throw new Error("Gaussian splat PLY f_rest properties must match the position type");
    var degree = 0;
    if (restCount === 9) degree = 1;
    else if (restCount === 27) degree = 2;
    else if (restCount === 45) degree = 3;
    else if (restCount !== 0) throw new Error("Gaussian splat PLY has an unsupported f_rest count: " + restCount);
    var hasDc = !!(index.f_dc_0 && index.f_dc_1 && index.f_dc_2);
    var count = vertex.count;
    var positions = new Float32Array(count * 3);
    var scales = new Float32Array(count * 3);
    var rotations = new Float32Array(count * 4);
    var colors = new Float32Array(count * 4);
    var dim = degree * degree + 2 * degree;
    var sh = degree > 0 ? { degree: degree, coefficients: new Float32Array(count * dim * 3) } : null;
    var sigmoid = function(v) { return 1 / (1 + Math.exp(-v)); };
    if (format === "ascii") {
        var body = "";
        for (var b = header.headerEnd; b < bytes.length; b++) body += String.fromCharCode(bytes[b]);
        var tokens = body.trim().length ? body.trim().split(/\s+/) : [];
        var expected = vertex.properties.length;
        if (tokens.length < expected * count) throw new Error("Gaussian splat PLY ascii body is truncated");
        var colIndex = {};
        for (var pi = 0; pi < vertex.properties.length; pi++) colIndex[vertex.properties[pi].name] = pi;
        for (var i = 0; i < count; i++) {
            var base = i * expected;
            positions[i * 3] = parseFloat(tokens[base + colIndex.x]);
            positions[i * 3 + 1] = parseFloat(tokens[base + colIndex.y]);
            positions[i * 3 + 2] = parseFloat(tokens[base + colIndex.z]);
            scales[i * 3] = Math.exp(parseFloat(tokens[base + colIndex.scale_0]));
            scales[i * 3 + 1] = Math.exp(parseFloat(tokens[base + colIndex.scale_1]));
            scales[i * 3 + 2] = Math.exp(parseFloat(tokens[base + colIndex.scale_2]));
            var qw = parseFloat(tokens[base + colIndex.rot_0]), qx = parseFloat(tokens[base + colIndex.rot_1]), qy = parseFloat(tokens[base + colIndex.rot_2]), qz = parseFloat(tokens[base + colIndex.rot_3]);
            var qn = Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz);
            rotations[i * 4] = qx / qn; rotations[i * 4 + 1] = qy / qn; rotations[i * 4 + 2] = qz / qn; rotations[i * 4 + 3] = qw / qn;
            var dc0 = hasDc ? parseFloat(tokens[base + colIndex.f_dc_0]) : 0, dc1 = hasDc ? parseFloat(tokens[base + colIndex.f_dc_1]) : 0, dc2 = hasDc ? parseFloat(tokens[base + colIndex.f_dc_2]) : 0;
            colors[i * 4] = 0.5 + SH_C0 * dc0; colors[i * 4 + 1] = 0.5 + SH_C0 * dc1; colors[i * 4 + 2] = 0.5 + SH_C0 * dc2;
            colors[i * 4 + 3] = sigmoid(parseFloat(tokens[base + colIndex.opacity]));
            for (var c = 0; c < restCount; c++) sh.coefficients[i * dim * 3 + c] = parseFloat(tokens[base + colIndex["f_rest_" + c]]);
        }
    } else {
        var typeSize = { float: 4, float32: 4, double: 8, float64: 8 };
        var offsets = {}, stride = 0, types = {};
        for (var p2 = 0; p2 < vertex.properties.length; p2++) {
            var prop = vertex.properties[p2];
            var size = typeSize[prop.type];
            if (!size) throw new Error("Gaussian splat PLY property type must be float or double, got: " + prop.type);
            offsets[prop.name] = stride; types[prop.name] = prop.type; stride += size;
        }
        var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var needed = header.headerEnd + stride * count;
        if (bytes.length < needed) throw new Error("Gaussian splat PLY binary body is truncated");
        var read = function(row, name) {
            var at = header.headerEnd + row * stride + offsets[name];
            return types[name] === "double" ? view.getFloat64(at, true) : view.getFloat32(at, true);
        };
        for (var i2 = 0; i2 < count; i2++) {
            positions[i2 * 3] = read(i2, "x"); positions[i2 * 3 + 1] = read(i2, "y"); positions[i2 * 3 + 2] = read(i2, "z");
            scales[i2 * 3] = Math.exp(read(i2, "scale_0")); scales[i2 * 3 + 1] = Math.exp(read(i2, "scale_1")); scales[i2 * 3 + 2] = Math.exp(read(i2, "scale_2"));
            var qw2 = read(i2, "rot_0"), qx2 = read(i2, "rot_1"), qy2 = read(i2, "rot_2"), qz2 = read(i2, "rot_3");
            var qn2 = Math.sqrt(qw2 * qw2 + qx2 * qx2 + qy2 * qy2 + qz2 * qz2);
            rotations[i2 * 4] = qx2 / qn2; rotations[i2 * 4 + 1] = qy2 / qn2; rotations[i2 * 4 + 2] = qz2 / qn2; rotations[i2 * 4 + 3] = qw2 / qn2;
            colors[i2 * 4] = 0.5 + SH_C0 * (hasDc ? read(i2, "f_dc_0") : 0);
            colors[i2 * 4 + 1] = 0.5 + SH_C0 * (hasDc ? read(i2, "f_dc_1") : 0);
            colors[i2 * 4 + 2] = 0.5 + SH_C0 * (hasDc ? read(i2, "f_dc_2") : 0);
            colors[i2 * 4 + 3] = sigmoid(read(i2, "opacity"));
            for (var c2 = 0; c2 < restCount; c2++) sh.coefficients[i2 * dim * 3 + c2] = read(i2, "f_rest_" + c2);
        }
    }
    return { count: count, positions: positions, scales: scales, rotations: rotations, colors: colors, sh: sh };
}

class SplatPLYLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var data = self.parse(buffer); if (onLoad) onLoad(data); }
            catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
        return this;
    }
    parse(data) { return decodeSplatPly(data); }
}

export { SplatPLYLoader };

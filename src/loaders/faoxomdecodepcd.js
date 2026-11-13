import { faoxombytestotext, faoxomdecompresslzf, faoxomtexttobytes } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { PointsMaterial } from "../materials/index.js";
import { faoxomsrgbtolinearalt } from "../math/index.js";
import { Points } from "../objects/index.js";

function faoxomdecodepcd(data) {
    var bytes = typeof data === "string" ? faoxomtexttobytes(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    var text = faoxombytestotext(bytes);
    var dataMatch = text.match(/[\r\n]DATA\s(\S*)\s/i);
    if (!dataMatch) throw new Error("Invalid PCD file");
    var headerEnd = dataMatch.index + dataMatch[0].length;
    var dataKind = dataMatch[1].toLowerCase();
    var fields = [], sizes = [], types = [], counts = [], points = 0;
    var headerLines = text.slice(0, dataMatch.index).split(/\r?\n/);
    for (var h = 0; h < headerLines.length; h++) {
        var line = headerLines[h].trim();
        if (!line.length || line.indexOf("#") === 0) continue;
        var parts = line.split(/\s+/);
        if (parts[0] === "FIELDS") fields = parts.slice(1);
        else if (parts[0] === "SIZE") sizes = parts.slice(1).map(Number);
        else if (parts[0] === "TYPE") types = parts.slice(1);
        else if (parts[0] === "COUNT") counts = parts.slice(1).map(Number);
        else if (parts[0] === "POINTS") points = parseInt(parts[1], 10) || 0;
    }
    if (!fields.length) throw new Error("Invalid PCD header");
    while (sizes.length < fields.length) sizes.push(4);
    while (types.length < fields.length) types.push("F");
    while (counts.length < fields.length) counts.push(1);
    var offsets = [], rowSize = 0;
    for (var f = 0; f < fields.length; f++) { offsets.push(rowSize); rowSize += sizes[f] * counts[f]; }
    var ix = fields.indexOf("x"), iy = fields.indexOf("y"), iz = fields.indexOf("z");
    if (ix < 0 || iy < 0 || iz < 0) throw new Error("PCD requires x, y, and z fields");
    var normalX = fields.indexOf("normal_x"), normalY = fields.indexOf("normal_y"), normalZ = fields.indexOf("normal_z");
    var hasNormals = normalX >= 0 && normalY >= 0 && normalZ >= 0;
    var colorField = fields.indexOf("rgb") >= 0 ? "rgb" : fields.indexOf("rgba") >= 0 ? "rgba" : null;
    var intensityField = fields.indexOf("intensity") >= 0 ? "intensity" : null;
    var labelField = fields.indexOf("label") >= 0 ? "label" : null;
    var positions = new Float32Array(points * 3);
    var normals = hasNormals ? new Float32Array(points * 3) : null;
    var colors = colorField ? new Float32Array(points * 3) : null;
    var intensity = intensityField ? new Float32Array(points) : null;
    var label = labelField ? new Float32Array(points) : null;
    var rgbBits = new DataView(new ArrayBuffer(4));
    var storeValue = function(fieldIndex, pointIndex, number) {
        var name = fields[fieldIndex];
        if (name === "x") positions[pointIndex * 3] = number;
        else if (name === "y") positions[pointIndex * 3 + 1] = number;
        else if (name === "z") positions[pointIndex * 3 + 2] = number;
        else if (name === "normal_x") normals[pointIndex * 3] = number;
        else if (name === "normal_y") normals[pointIndex * 3 + 1] = number;
        else if (name === "normal_z") normals[pointIndex * 3 + 2] = number;
        else if (name === "intensity") intensity[pointIndex] = number;
        else if (name === "label") label[pointIndex] = number;
        else if (name === colorField) {
            if (types[fieldIndex] === "F" && !isFinite(number)) number = 0;
            if (types[fieldIndex] === "F") { rgbBits.setFloat32(0, number); number = rgbBits.getInt32(0); }
            colors[pointIndex * 3] = faoxomsrgbtolinearalt((number >> 16 & 255) / 255);
            colors[pointIndex * 3 + 1] = faoxomsrgbtolinearalt((number >> 8 & 255) / 255);
            colors[pointIndex * 3 + 2] = faoxomsrgbtolinearalt((number & 255) / 255);
        }
    };
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var readBinaryNumber = function(dataView, at, size, type) {
        if (type === "F") return size === 8 ? dataView.getFloat64(at, true) : dataView.getFloat32(at, true);
        if (type === "I") return size === 1 ? dataView.getInt8(at) : size === 2 ? dataView.getInt16(at, true) : dataView.getInt32(at, true);
        return size === 1 ? dataView.getUint8(at) : size === 2 ? dataView.getUint16(at, true) : dataView.getUint32(at, true);
    };
    if (dataKind === "ascii") {
        var body = text.slice(headerEnd).trim();
        var asciiTokens = body.length ? body.split(/\s+/) : [];
        var tokenPtr = 0;
        for (var point = 0; point < points; point++) {
            for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
                var fieldCount = counts[fieldIndex] || 1;
                for (var component = 0; component < fieldCount; component++) {
                    storeValue(fieldIndex, point, parseFloat(asciiTokens[tokenPtr++]));
                }
            }
        }
    } else if (dataKind === "binary") {
        var row = headerEnd;
        if (row + points * rowSize > bytes.length) throw new Error("Corrupt PCD binary data");
        for (var binaryPoint = 0; binaryPoint < points; binaryPoint++) {
            for (var binaryField = 0; binaryField < fields.length; binaryField++) {
                var binaryCount = counts[binaryField] || 1;
                var binaryAt = row + offsets[binaryField];
                if (fields[binaryField] === colorField) storeValue(binaryField, binaryPoint, view.getUint32(binaryAt, true));
                else for (var binaryComponent = 0; binaryComponent < binaryCount; binaryComponent++) storeValue(binaryField, binaryPoint, readBinaryNumber(view, binaryAt + binaryComponent * sizes[binaryField], sizes[binaryField], types[binaryField]));
            }
            row += rowSize;
        }
    } else if (dataKind === "binary_compressed") {
        var compressedSize = view.getUint32(headerEnd, true);
        var decompressedSize = view.getUint32(headerEnd + 4, true);
        if (decompressedSize < points * rowSize || headerEnd + 8 + compressedSize > bytes.length) throw new Error("Corrupt PCD compressed data");
        var decompressed = faoxomdecompresslzf(bytes, headerEnd + 8, compressedSize, decompressedSize);
        var decompressedView = new DataView(decompressed.buffer);
        for (var compressedPoint = 0; compressedPoint < points; compressedPoint++) {
            for (var compressedField = 0; compressedField < fields.length; compressedField++) {
                var compressedCount = counts[compressedField] || 1;
                var compressedBase = points * offsets[compressedField] + sizes[compressedField] * compressedPoint;
                if (fields[compressedField] === colorField) storeValue(compressedField, compressedPoint, decompressedView.getUint32(compressedBase, true));
                else for (var compressedComponent = 0; compressedComponent < compressedCount; compressedComponent++) storeValue(compressedField, compressedPoint, readBinaryNumber(decompressedView, compressedBase + compressedComponent * sizes[compressedField], sizes[compressedField], types[compressedField]));
            }
        }
    } else throw new Error("Unsupported PCD data type: " + dataMatch[1]);
    var geometry = new Geometry();
    geometry.setAttribute("position", positions, 3);
    if (normals) geometry.setAttribute("normal", normals, 3);
    if (colors) geometry.setAttribute("color", colors, 3);
    if (intensity) geometry.setAttribute("intensity", intensity, 1);
    if (label) geometry.setAttribute("label", label, 1);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    var material = new PointsMaterial({ size: 0.005 });
    material.vertexColors = !!colors;
    return new Points(geometry, material);
}

export { faoxomdecodepcd };

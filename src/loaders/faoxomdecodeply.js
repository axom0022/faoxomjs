import { faoxombytestotext, faoxomplytypesize, faoxomtexttobytes } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { faoxomsrgbtolinearalt } from "../math/index.js";

function faoxomdecodeply(data) {
    var bytes = typeof data === "string" ? faoxomtexttobytes(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length < 3 || bytes[0] !== 112 || bytes[1] !== 108 || bytes[2] !== 121) throw new Error("Invalid PLY file");
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var cursor = 0, headerEnd = -1, headerLines = [], lineEnd = 0, headerLine = "";
    while (cursor < bytes.length && headerEnd < 0) {
        lineEnd = cursor;
        while (lineEnd < bytes.length && bytes[lineEnd] !== 10) lineEnd++;
        headerLine = "";
        for (var hd = cursor; hd < lineEnd; hd += 8192) headerLine += String.fromCharCode.apply(null, bytes.subarray(hd, Math.min(hd + 8192, lineEnd)));
        headerLine = headerLine.trim();
        headerLines.push(headerLine);
        cursor = lineEnd + 1;
        if (headerLine === "end_header") headerEnd = cursor;
    }
    if (headerEnd < 0) throw new Error("PLY header missing end_header");
    var format = "", elements = [], currentElement = null;
    for (var h = 0; h < headerLines.length; h++) {
        var parts = headerLines[h].split(/\s+/);
        if (parts[0] === "format" && parts.length > 1) format = parts[1];
        else if (parts[0] === "element" && parts.length > 2) { currentElement = { name: parts[1], count: parseInt(parts[2], 10) || 0, properties: [] }; elements.push(currentElement); }
        else if (parts[0] === "property" && currentElement) {
            if (parts[1] === "list" && parts.length > 4) currentElement.properties.push({ name: parts[4], list: true, countType: parts[2], indexType: parts[3] });
            else if (parts.length > 2) currentElement.properties.push({ name: parts[2], list: false, type: parts[1] });
        }
    }
    if (format !== "ascii" && format !== "binary_little_endian" && format !== "binary_big_endian") throw new Error("Unsupported PLY format: " + format);
    var offset = headerEnd, tokens = null, tokenIndex = 0;
    if (format === "ascii") {
        var body = faoxombytestotext(bytes, headerEnd).trim();
        tokens = body.length ? body.split(/\s+/) : [];
        offset = 0;
    }
    var little = format === "binary_little_endian";
    var readValue = function(type) {
        if (tokens) return parseFloat(tokens[tokenIndex++]);
        var value = 0;
        if (type === "float" || type === "float32") { value = view.getFloat32(offset, little); offset += 4; }
        else if (type === "double" || type === "float64") { value = view.getFloat64(offset, little); offset += 8; }
        else if (type === "char" || type === "int8") { value = view.getInt8(offset, little); offset += 1; }
        else if (type === "uchar" || type === "uint8") { value = view.getUint8(offset, little); offset += 1; }
        else if (type === "short" || type === "int16") { value = view.getInt16(offset, little); offset += 2; }
        else if (type === "ushort" || type === "uint16") { value = view.getUint16(offset, little); offset += 2; }
        else if (type === "int" || type === "int32") { value = view.getInt32(offset, little); offset += 4; }
        else if (type === "uint" || type === "uint32") { value = view.getUint32(offset, little); offset += 4; }
        else throw new Error("Unsupported PLY property type: " + type);
        return value;
    };
    var readList = function(countType, indexType) {
        var count = readValue(countType);
        if (tokens) { var asciiList = []; for (var a = 0; a < count; a++) asciiList.push(parseInt(tokens[tokenIndex++], 10) || 0); return asciiList; }
        var indexSize = faoxomplytypesize(indexType);
        if (count < 0 || count > 100000000 || offset + count * indexSize > bytes.length) throw new Error("Corrupt PLY list data");
        var list = new Array(count);
        for (var l = 0; l < count; l++) list[l] = readValue(indexType);
        return list;
    };
    var positions = [], normals = [], uvs = [], colors = [], indices = [];
    var hasNormals = false, hasUvs = false, hasColors = false;
    for (var e = 0; e < elements.length; e++) {
        var element = elements[e];
        var isVertex = element.name === "vertex" || element.name === "vertices";
        var isFace = element.name === "face" || element.name === "faces";
        var map = {};
        if (isVertex) for (var p = 0; p < element.properties.length; p++) map[element.properties[p].name] = element.properties[p];
        for (var row = 0; row < element.count; row++) {
            var values = {}, lists = {};
            for (var q = 0; q < element.properties.length; q++) {
                var property = element.properties[q];
                if (property.list) lists[property.name] = readList(property.countType, property.indexType);
                else values[property.name] = readValue(property.type);
            }
            if (isVertex) {
                positions.push(values.x || 0, values.y || 0, values.z || 0);
                if (map.nx && map.ny && map.nz) { normals.push(values.nx || 0, values.ny || 0, values.nz || 0); hasNormals = true; }
                var uProperty = map.s || map.u, vProperty = map.t || map.v;
                if (uProperty && vProperty) { uvs.push(values[uProperty.name] || 0, values[vProperty.name] || 0); hasUvs = true; }
                if (map.red && map.green && map.blue) {
                    var redScale = map.red.type === "float" || map.red.type === "double" ? 1 : 255;
                    var greenScale = map.green.type === "float" || map.green.type === "double" ? 1 : 255;
                    var blueScale = map.blue.type === "float" || map.blue.type === "double" ? 1 : 255;
                    colors.push(faoxomsrgbtolinearalt((values.red || 0) / redScale), faoxomsrgbtolinearalt((values.green || 0) / greenScale), faoxomsrgbtolinearalt((values.blue || 0) / blueScale));
                    hasColors = true;
                }
            } else if (isFace) {
                var faceIndices = lists.vertex_indices || lists.vertex_index;
                if (faceIndices && faceIndices.length >= 3) for (var fi = 1; fi < faceIndices.length - 1; fi++) indices.push(faceIndices[0], faceIndices[fi], faceIndices[fi + 1]);
            }
        }
    }
    var geometry = new Geometry();
    geometry.setAttribute("position", new Float32Array(positions), 3);
    if (hasNormals) geometry.setAttribute("normal", new Float32Array(normals), 3);
    if (hasUvs) geometry.setAttribute("uv", new Float32Array(uvs), 2);
    if (hasColors) geometry.setAttribute("color", new Float32Array(colors), 3);
    if (indices.length) geometry.setIndex(indices);
    if (!hasNormals) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

export { faoxomdecodeply };

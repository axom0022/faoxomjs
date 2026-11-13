import { faoxombytestotext, faoxomtexttobytes } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { faoxomsrgbtolinearalt } from "../math/index.js";

function faoxomdecodevtk(data) {
    var bytes = typeof data === "string" ? faoxomtexttobytes(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var readLine = function(start) { var end = start; while (end < bytes.length && bytes[end] !== 10) end++; var raw = bytes.subarray(start, end); var text = ""; for (var d = 0; d < raw.length; d += 8192) text += String.fromCharCode.apply(null, raw.subarray(d, Math.min(d + 8192, raw.length))); return { text: text.trim(), next: end + 1 }; };
    var headerState = readLine(0);
    if (headerState.text.toLowerCase().indexOf("vtk") < 0) throw new Error("Invalid VTK file");
    headerState = readLine(headerState.next);
    headerState = readLine(headerState.next);
    var mode = headerState.text.split(/\s+/)[0].toUpperCase();
    if (mode !== "ASCII" && mode !== "BINARY") throw new Error("Invalid VTK file format line");
    var binary = mode === "BINARY";
    var positions = [], indices = [], normals = [], colors = [];
    if (!binary) {
        var text = faoxombytestotext(bytes, headerState.next);
        var lines = text.split("\n");
        var patWord = /^[^\d.\s-]+/;
        var patConnectivity = /^(\d+)\s+([\s\d]*)/;
        var patPOINTS = /^POINTS /;
        var patPOLYGONS = /^POLYGONS /;
        var patTRIANGLE_STRIPS = /^TRIANGLE_STRIPS /;
        var patPOINT_DATA = /^POINT_DATA[ ]+(\d+)/;
        var patCELL_DATA = /^CELL_DATA[ ]+(\d+)/;
        var patCOLOR_SCALARS = /^COLOR_SCALARS[ ]+(\w+)[ ]+3/;
        var patNORMALS = /^NORMALS[ ]+(\w+)[ ]+(\w+)/;
        var inPointsSection = false, inPolygonsSection = false, inTriangleStripSection = false, inPointDataSection = false, inCellDataSection = false, inColorSection = false, inNormalsSection = false;
        var parseFloats = function(line) { var result = [], parts = line.split(/\s+/); for (var i = 0; i < parts.length; i++) { if (parts[i] !== "") result.push(parseFloat(parts[i])); } return result; };
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.indexOf("DATASET") === 0) {
                var dataset = line.split(" ")[1];
                if (dataset !== "POLYDATA") throw new Error("Unsupported DATASET type: " + dataset);
            } else if (inPointsSection) {
                if (patWord.exec(line) === null) {
                    var values = parseFloats(line);
                    for (var k = 0; k + 2 < values.length; k += 3) positions.push(values[k], values[k + 1], values[k + 2]);
                }
            } else if (inPolygonsSection) {
                var polygonMatch = patConnectivity.exec(line);
                if (polygonMatch !== null) {
                    var numVertices = parseInt(polygonMatch[1]);
                    var inds = polygonMatch[2].split(/\s+/);
                    if (numVertices >= 3) {
                        var i0 = parseInt(inds[0]);
                        for (var pj = 1; pj < numVertices - 1; pj++) indices.push(i0, parseInt(inds[pj]), parseInt(inds[pj + 1]));
                    }
                }
            } else if (inTriangleStripSection) {
                var stripMatch = patConnectivity.exec(line);
                if (stripMatch !== null) {
                    var stripVertices = parseInt(stripMatch[1]);
                    var stripInds = stripMatch[2].split(/\s+/);
                    if (stripVertices >= 3) {
                        for (var sj = 0; sj < stripVertices - 2; sj++) {
                            if (sj % 2 === 1) indices.push(parseInt(stripInds[sj]), parseInt(stripInds[sj + 2]), parseInt(stripInds[sj + 1]));
                            else indices.push(parseInt(stripInds[sj]), parseInt(stripInds[sj + 1]), parseInt(stripInds[sj + 2]));
                        }
                    }
                }
            } else if (inPointDataSection || inCellDataSection) {
                if (inColorSection) {
                    if (patWord.exec(line) === null) {
                        var colorValues = parseFloats(line);
                        for (var ck = 0; ck + 2 < colorValues.length; ck += 3) colors.push(faoxomsrgbtolinearalt(colorValues[ck]), faoxomsrgbtolinearalt(colorValues[ck + 1]), faoxomsrgbtolinearalt(colorValues[ck + 2]));
                    }
                } else if (inNormalsSection) {
                    if (patWord.exec(line) === null) {
                        var normalValues = parseFloats(line);
                        for (var nk = 0; nk + 2 < normalValues.length; nk += 3) normals.push(normalValues[nk], normalValues[nk + 1], normalValues[nk + 2]);
                    }
                }
            }
            if (patPOLYGONS.exec(line) !== null) { inPolygonsSection = true; inPointsSection = false; inTriangleStripSection = false; }
            else if (patPOINTS.exec(line) !== null) { inPolygonsSection = false; inPointsSection = true; inTriangleStripSection = false; }
            else if (patTRIANGLE_STRIPS.exec(line) !== null) { inPolygonsSection = false; inPointsSection = false; inTriangleStripSection = true; }
            else if (patPOINT_DATA.exec(line) !== null) { inPointDataSection = true; inPointsSection = false; inPolygonsSection = false; inTriangleStripSection = false; }
            else if (patCELL_DATA.exec(line) !== null) { inCellDataSection = true; inPointsSection = false; inPolygonsSection = false; inTriangleStripSection = false; }
            else if (patCOLOR_SCALARS.exec(line) !== null) { inColorSection = true; inNormalsSection = false; inPointsSection = false; inPolygonsSection = false; inTriangleStripSection = false; }
            else if (patNORMALS.exec(line) !== null) { inNormalsSection = true; inColorSection = false; inPointsSection = false; inPolygonsSection = false; inTriangleStripSection = false; }
        }
    } else {
        var cursor = headerState.next;
        while (cursor < bytes.length) {
            var state = readLine(cursor);
            var binaryLine = state.text;
            if (binaryLine.indexOf("DATASET") === 0) {
                var datasetType = binaryLine.split(" ")[1];
                if (datasetType !== "POLYDATA") throw new Error("Unsupported DATASET type: " + datasetType);
            } else if (binaryLine.indexOf("POINTS") === 0) {
                var numberOfPoints = parseInt(binaryLine.split(" ")[1], 10) || 0;
                var pointType = (binaryLine.split(" ")[2] || "float").toLowerCase();
                var pointBytes = pointType === "double" ? 8 : 4;
                if (state.next + numberOfPoints * 3 * pointBytes > bytes.length) throw new Error("Corrupt VTK binary data");
                for (var bp = 0; bp < numberOfPoints; bp++) {
                    var bpAt = state.next + bp * 3 * pointBytes;
                    positions.push(pointBytes === 8 ? view.getFloat64(bpAt, false) : view.getFloat32(bpAt, false), pointBytes === 8 ? view.getFloat64(bpAt + pointBytes, false) : view.getFloat32(bpAt + 4, false), pointBytes === 8 ? view.getFloat64(bpAt + pointBytes * 2, false) : view.getFloat32(bpAt + 8, false));
                }
                state.next += numberOfPoints * 3 * pointBytes;
                if (bytes[state.next] === 10) state.next++;
            } else if (binaryLine.indexOf("POLYGONS") === 0 || binaryLine.indexOf("TRIANGLE_STRIPS") === 0) {
                var isStrips = binaryLine.indexOf("TRIANGLE_STRIPS") === 0;
                var cellCount = parseInt(binaryLine.split(" ")[1], 10) || 0;
                var cellPtr = state.next;
                for (var cell = 0; cell < cellCount; cell++) {
                    if (cellPtr + 4 > bytes.length) throw new Error("Corrupt VTK binary data");
                    var indexCount = view.getInt32(cellPtr, false);
                    cellPtr += 4;
                    if (indexCount < 0 || cellPtr + indexCount * 4 > bytes.length) throw new Error("Corrupt VTK binary data");
                    var cellIndices = new Array(indexCount);
                    for (var ci = 0; ci < indexCount; ci++) { cellIndices[ci] = view.getInt32(cellPtr, false); cellPtr += 4; }
                    if (indexCount >= 3) {
                        if (isStrips) {
                            for (var zs = 0; zs < indexCount - 2; zs++) {
                                if (zs % 2 === 1) indices.push(cellIndices[zs], cellIndices[zs + 2], cellIndices[zs + 1]);
                                else indices.push(cellIndices[zs], cellIndices[zs + 1], cellIndices[zs + 2]);
                            }
                        } else {
                            for (var zj = 1; zj < indexCount - 1; zj++) indices.push(cellIndices[0], cellIndices[zj], cellIndices[zj + 1]);
                        }
                    }
                }
                state.next = cellPtr;
                if (bytes[state.next] === 10) state.next++;
            } else if (binaryLine.indexOf("POINT_DATA") === 0) {
                var dataCount = parseInt(binaryLine.split(" ")[1], 10) || 0;
                var subState = readLine(state.next);
                if (subState.text.indexOf("NORMALS") === 0) {
                    var normalType = (subState.text.split(/\s+/)[2] || "float").toLowerCase();
                    var normalBytes = normalType === "double" ? 8 : 4;
                    if (subState.next + dataCount * 3 * normalBytes > bytes.length) throw new Error("Corrupt VTK binary data");
                    for (var bn = 0; bn < dataCount; bn++) {
                        var bnAt = subState.next + bn * 3 * normalBytes;
                        normals.push(normalBytes === 8 ? view.getFloat64(bnAt, false) : view.getFloat32(bnAt, false), normalBytes === 8 ? view.getFloat64(bnAt + normalBytes, false) : view.getFloat32(bnAt + 4, false), normalBytes === 8 ? view.getFloat64(bnAt + normalBytes * 2, false) : view.getFloat32(bnAt + 8, false));
                    }
                    state.next = subState.next + dataCount * 3 * normalBytes;
                    if (bytes[state.next] === 10) state.next++;
                } else throw new Error("Unsupported VTK binary POINT_DATA section: " + subState.text);
            }
            cursor = state.next;
        }
    }
    var geometry = new Geometry();
    geometry.setAttribute("position", new Float32Array(positions), 3);
    if (indices.length) geometry.setIndex(indices);
    if (normals.length && normals.length === positions.length) geometry.setAttribute("normal", new Float32Array(normals), 3);
    if (colors.length !== indices.length && colors.length === positions.length) geometry.setAttribute("color", new Float32Array(colors), 3);
    else if (colors.length === indices.length && colors.length) {
        geometry = geometry.toNonIndexed();
        var triangleCount = geometry.attributes.position.array.length / 9;
        if (colors.length === triangleCount * 3) {
            var newColors = [];
            for (var tc = 0; tc < triangleCount; tc++) {
                var cr = colors[tc * 3], cg = colors[tc * 3 + 1], cb = colors[tc * 3 + 2];
                newColors.push(cr, cg, cb, cr, cg, cb, cr, cg, cb);
            }
            geometry.setAttribute("color", new Float32Array(newColors), 3);
        }
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

export { faoxomdecodevtk };

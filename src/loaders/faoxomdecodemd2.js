import { BufferAttribute, faoxommd2normals } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { faoxommd2animations } from "./faoxommd2animations.js";

function faoxomdecodemd2(data) {
    var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var headerNames = ["ident", "version", "skinwidth", "skinheight", "framesize", "numSkins", "numVertices", "numSt", "numTris", "numGlcmds", "numFrames", "offsetSkins", "offsetSt", "offsetTris", "offsetFrames", "offsetGlcmds", "offsetEnd"];
    var header = {};
    for (var h = 0; h < headerNames.length; h++) header[headerNames[h]] = view.getInt32(h * 4, true);
    if (header.ident !== 844121161 || header.version !== 8) throw new Error("Not a valid MD2 file");
    if (header.offsetEnd !== bytes.length) throw new Error("Corrupted MD2 file");
    var uvs = [];
    var offset = header.offsetSt;
    for (var s = 0; s < header.numSt; s++) {
        var su = view.getInt16(offset, true), sv = view.getInt16(offset + 2, true);
        uvs.push(su / header.skinwidth, 1 - sv / header.skinheight);
        offset += 4;
    }
    var vertexIndices = [], uvIndices = [];
    offset = header.offsetTris;
    for (var t = 0; t < header.numTris; t++) {
        vertexIndices.push(view.getUint16(offset, true), view.getUint16(offset + 2, true), view.getUint16(offset + 4, true));
        uvIndices.push(view.getUint16(offset + 6, true), view.getUint16(offset + 8, true), view.getUint16(offset + 10, true));
        offset += 12;
    }
    var frames = [];
    offset = header.offsetFrames;
    for (var f = 0; f < header.numFrames; f++) {
        var scaleX = view.getFloat32(offset, true), scaleY = view.getFloat32(offset + 4, true), scaleZ = view.getFloat32(offset + 8, true);
        var translateX = view.getFloat32(offset + 12, true), translateY = view.getFloat32(offset + 16, true), translateZ = view.getFloat32(offset + 20, true);
        offset += 24;
        var nameChars = [];
        for (var n = 0; n < 16; n++) { var character = view.getUint8(offset + n); if (character === 0) break; nameChars.push(character); }
        offset += 16;
        var frame = { name: String.fromCharCode.apply(null, nameChars), vertices: [], normals: [] };
        for (var v = 0; v < header.numVertices; v++) {
            var vx = view.getUint8(offset++), vy = view.getUint8(offset++), vz = view.getUint8(offset++);
            var normalIndex = view.getUint8(offset++) * 3;
            frame.vertices.push(vx * scaleX + translateX, vz * scaleZ + translateZ, vy * scaleY + translateY);
            frame.normals.push(faoxommd2normals[normalIndex], faoxommd2normals[normalIndex + 2], faoxommd2normals[normalIndex + 1]);
        }
        frames.push(frame);
    }
    var geometry = new Geometry();
    var positions = [], normals = [], uvsOut = [];
    var baseVertices = frames[0].vertices, baseNormals = frames[0].normals;
    for (var vi = 0; vi < vertexIndices.length; vi++) {
        positions.push(baseVertices[vertexIndices[vi] * 3], baseVertices[vertexIndices[vi] * 3 + 1], baseVertices[vertexIndices[vi] * 3 + 2]);
        normals.push(baseNormals[vertexIndices[vi] * 3], baseNormals[vertexIndices[vi] * 3 + 1], baseNormals[vertexIndices[vi] * 3 + 2]);
        uvsOut.push(uvs[uvIndices[vi] * 2], uvs[uvIndices[vi] * 2 + 1]);
    }
    geometry.setAttribute("position", new Float32Array(positions), 3);
    geometry.setAttribute("normal", new Float32Array(normals), 3);
    geometry.setAttribute("uv", new Float32Array(uvsOut), 2);
    var morphPositions = [], morphNormals = [];
    for (var m = 0; m < frames.length; m++) {
        var morphFrame = frames[m];
        var framePositions = [], frameNormals = [];
        for (var mj = 0; mj < vertexIndices.length; mj++) {
            framePositions.push(morphFrame.vertices[vertexIndices[mj] * 3], morphFrame.vertices[vertexIndices[mj] * 3 + 1], morphFrame.vertices[vertexIndices[mj] * 3 + 2]);
            frameNormals.push(morphFrame.normals[vertexIndices[mj] * 3], morphFrame.normals[vertexIndices[mj] * 3 + 1], morphFrame.normals[vertexIndices[mj] * 3 + 2]);
        }
        var positionAttribute = new BufferAttribute(new Float32Array(framePositions), 3);
        positionAttribute.name = morphFrame.name;
        morphPositions.push(positionAttribute);
        var normalAttribute = new BufferAttribute(new Float32Array(frameNormals), 3);
        normalAttribute.name = morphFrame.name;
        morphNormals.push(normalAttribute);
    }
    geometry.setMorphAttribute("position", morphPositions);
    geometry.setMorphAttribute("normal", morphNormals);
    geometry.morphTargetsRelative = false;
    geometry.animations = faoxommd2animations(frames);
    geometry.userData.morphTargetDictionary = {};
    for (var d = 0; d < morphPositions.length; d++) geometry.userData.morphTargetDictionary[morphPositions[d].name] = d;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

export { faoxomdecodemd2 };

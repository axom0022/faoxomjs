import { BufferAttribute } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { FileLoader } from "./FileLoader.js";

class STLLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var geom = self.parse(buffer); if (onLoad) onLoad(geom); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) {
        var isBinary = function(buf) {
            if (buf.byteLength < 84) return false;
            var reader = new DataView(buf);
            var numFaces = reader.getUint32(80, true);
            return 84 + numFaces * 50 === buf.byteLength;
        };
        var isBin = (data instanceof ArrayBuffer) && isBinary(data);
        var positions = [], normals = [];
        if (isBin) {
            var reader = new DataView(data);
            var faces = reader.getUint32(80, true);
            var offset = 84;
            for (var i = 0; i < faces; i++) {
                var nx = reader.getFloat32(offset, true), ny = reader.getFloat32(offset + 4, true), nz = reader.getFloat32(offset + 8, true);
                offset += 12;
                for (var v = 0; v < 3; v++) {
                    positions.push(reader.getFloat32(offset, true), reader.getFloat32(offset + 4, true), reader.getFloat32(offset + 8, true));
                    normals.push(nx, ny, nz);
                    offset += 12;
                }
                offset += 2;
            }
        } else {
            var text = typeof data === "string" ? data : new TextDecoder().decode(data);
            var lines = text.split("\n");
            var curNormal = [0, 0, 0];
            for (var l = 0; l < lines.length; l++) {
                var line = lines[l].trim();
                if (line.startsWith("facet normal")) {
                    var parts = line.split(/\s+/);
                    curNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
                } else if (line.startsWith("vertex")) {
                    var vparts = line.split(/\s+/);
                    positions.push(parseFloat(vparts[1]), parseFloat(vparts[2]), parseFloat(vparts[3]));
                    normals.push(curNormal[0], curNormal[1], curNormal[2]);
                }
            }
        }
        var geom = new Geometry();
        geom.attributes.position = new BufferAttribute(new Float32Array(positions), 3);
        geom.attributes.normal = new BufferAttribute(new Float32Array(normals), 3);
        geom.computeBoundingBox();
        geom.computeBoundingSphere();
        return geom;
    }
}

export { STLLoader };

import { Geometry } from "./Geometry.js";

class MeshDecimator {
    static decimate(zakka, zakkb) {
        zakkb = zakkb !== undefined ? zakkb : .5;
        var zakkc = zakka.attributes.position.array || zakka.attributes.position;
        var zakkd = zakka.index ? zakka.index.array || zakka.index : null;
        if (!zakkd) return zakka.clone();
        var zakke = zakkd.length / 3;
        var zakkf = Math.max(1, Math.floor(zakke * zakkb));
        var zakkg = new Uint32Array(zakkf * 3);
        var zakkh = zakke / zakkf;
        for (var zakki = 0; zakki < zakkf; zakki++) {
            var zakkj = Math.floor(zakki * zakkh);
            zakkg[zakki * 3 + 0] = zakkd[zakkj * 3 + 0];
            zakkg[zakki * 3 + 1] = zakkd[zakkj * 3 + 1];
            zakkg[zakki * 3 + 2] = zakkd[zakkj * 3 + 2];
        }
        var zakkk = new Geometry;
        zakkk.setAttribute("position", new Float32Array(zakkc), 3);
        if (zakka.attributes.normal) zakkk.setAttribute("normal", new Float32Array(zakka.attributes.normal.array || zakka.attributes.normal), 3);
        if (zakka.attributes.uv) zakkk.setAttribute("uv", new Float32Array(zakka.attributes.uv.array || zakka.attributes.uv), 2);
        zakkk.setIndex(zakkg);
        zakkk.computeBounds();
        return zakkk;
    }
}

export { MeshDecimator };

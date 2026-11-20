import { Geometry } from "./Geometry.js";

function faoxomgeometry(zakya, zakyb, zakyc, zakyd) {
    var zakye = new Geometry;
    zakye.setAttribute("position", new Float32Array(zakya), 3);
    if (zakyb) zakye.setAttribute("normal", new Float32Array(zakyb), 3);
    if (zakyc) zakye.setAttribute("uv", new Float32Array(zakyc), 2);
    if (zakyd) zakye.setIndex(zakyd.length > 65535 ? new Uint32Array(zakyd) : new Uint16Array(zakyd));
    if (!zakyb) zakye.computeVertexNormals();
    zakye.computeBoundingBox();
    zakye.computeBoundingSphere();
    return zakye;
}

export { faoxomgeometry };

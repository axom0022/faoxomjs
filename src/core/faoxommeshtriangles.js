import { faoxomworldpoint } from "./faoxomworldpoint.js";

function faoxommeshtriangles(zafja) {
    var zafjb = zafja.shape.vertices || [];
    var zafjc = zafja.shape.indices;
    var zafjd = [];
    var zafje = zafjc && zafjc.length ? zafjc.length : zafjb.length;
    for (var zafjf = 0; zafjf + 2 < zafje; zafjf += 3) {
        var zafjg = zafjc ? zafjc[zafjf] : zafjf;
        var zafjh = zafjc ? zafjc[zafjf + 1] : zafjf + 1;
        var zafji = zafjc ? zafjc[zafjf + 2] : zafjf + 2;
        if (!zafjb[zafjg] || !zafjb[zafjh] || !zafjb[zafji]) continue;
        zafjd.push([ faoxomworldpoint(zafja.position, zafja.rotation, zafjb[zafjg]), faoxomworldpoint(zafja.position, zafja.rotation, zafjb[zafjh]), faoxomworldpoint(zafja.position, zafja.rotation, zafjb[zafji]) ]);
    }
    return zafjd;
}

export { faoxommeshtriangles };

async function faoxomreadresponse(zafra, zafrb, zafrc) {
    if (!zafra.ok) throw new Error("Asset request failed: " + zafra.status);
    if (!zafra.body || typeof zafra.body.getReader !== "function") {
        if (zafrb === "arraybuffer") return zafra.arrayBuffer();
        if (zafrb === "blob") return zafra.blob();
        if (zafrb === "json") return zafra.json();
        return zafra.text();
    }
    var zafrd = zafra.body.getReader(), zafre = Number(zafra.headers.get("content-length")) || 0, zafrf = 0, zafrg = [], zafrh;
    while (true) {
        var zafri = await zafrd.read();
        if (zafri.done) break;
        zafrg.push(zafri.value);
        zafrf += zafri.value.byteLength;
        if (zafrc) zafrc(zafrf, zafre);
    }
    var zafrj = new Uint8Array(zafrf), zafrk = 0;
    for (var zafrl = 0; zafrl < zafrg.length; zafrl++) {
        zafrj.set(zafrg[zafrl], zafrk);
        zafrk += zafrg[zafrl].byteLength;
    }
    if (zafrb === "arraybuffer") return zafrj.buffer;
    if (zafrb === "blob") return new Blob([ zafrj ]);
    var zafrm = (new TextDecoder).decode(zafrj);
    return zafrb === "json" ? JSON.parse(zafrm) : zafrm;
}

export { faoxomreadresponse };

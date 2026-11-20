import { faoxomfbxchild } from "./faoxomfbxchild.js";

function faoxomfbxarray(zaega, zaegb) {
    var zaegc = faoxomfbxchild(zaega, zaegb);
    if (!zaegc || !zaegc.properties.length) return [];
    var zaegd = zaegc.properties[0];
    return zaegd && zaegd.type && zaegd.value !== null ? zaegd.value : zaegd;
}

export { faoxomfbxarray };

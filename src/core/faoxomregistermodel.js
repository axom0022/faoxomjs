import { faoxommodelstore } from "./faoxommodelstore.js";

import { faoxomstate } from "./faoxomstate.js";

function faoxomregistermodel(zafsa, zafsb, zafsc) {
    if (!zafsa || zafsb === undefined) throw new Error("registerModel requires a model name and data");
    var zafsd = null;
    if (zafsb && typeof zafsb === "object" && !(zafsb instanceof Uint8Array) && !(zafsb instanceof ArrayBuffer)) {
        if (zafsb.format && (zafsb.data !== undefined || zafsb.json !== undefined)) zafsd = {
            format: zafsb.format,
            data: zafsb.data,
            json: zafsb.json
        }; else if (zafsb.asset) zafsd = {
            format: "gltf",
            json: zafsb.json !== undefined ? zafsb.json : zafsb
        };
    }
    if (!zafsd && typeof zafsb === "string" && zafsb.charAt(0) === "{") zafsd = {
        format: "gltf",
        json: JSON.parse(zafsb)
    };
    if (!zafsd) zafsd = {
        format: zafsc && zafsc.format || "glb",
        data: zafsb
    };
    var zafse = faoxommodelstore();
    if (Object.prototype.hasOwnProperty.call(zafse, zafsa) && (zafse[zafsa].data !== zafsd.data || zafse[zafsa].json !== zafsd.json)) faoxomstate.faoxommodelstoreversion++;
    zafse[zafsa] = zafsd;
    return zafsd;
}

export { faoxomregistermodel };

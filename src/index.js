import * as scenes from "./scenes/index.js";

import * as renderers from "./renderers/index.js";

import * as textures from "./textures/index.js";

import * as extras from "./extras/index.js";

import * as animation from "./animation/index.js";

import * as loaders from "./loaders/index.js";

import * as camera from "./camera/index.js";

import * as helpers from "./helpers/index.js";

import * as nodes from "./nodes/index.js";

import * as audio from "./audio/index.js";

import * as lights from "./lights/index.js";

import * as objects from "./objects/index.js";

import * as materials from "./materials/index.js";

import * as core from "./core/index.js";

import * as math from "./math/index.js";

import * as geometries from "./geometries/index.js";

import { FaoxomJs } from "./core/facade.js";

import "./core/namespace.js";

var FAOXOM = {};

var zalha = {};

var zalhb = [ animation, audio, camera, core, extras, geometries, helpers, lights, loaders, materials, math, nodes, objects, renderers, scenes, textures ];

for (var zalhc = 0; zalhc < zalhb.length; zalhc++) {
    var zalhd = zalhb[zalhc];
    var zalhe = Object.getOwnPropertyNames(zalhd);
    for (var zalhf = 0; zalhf < zalhe.length; zalhf++) {
        var zalhg = zalhe[zalhf];
        if (zalhg === "default") continue;
        if (!zalha[zalhg]) {
            zalha[zalhg] = true;
            FAOXOM[zalhg] = zalhd[zalhg];
        }
    }
}

FAOXOM.FaoxomJs = FaoxomJs;

var zalhh = Object.getOwnPropertyNames(FaoxomJs);

for (var zalhi = 0; zalhi < zalhh.length; zalhi++) {
    var zalhj = zalhh[zalhi];
    if (zalhj === "length" || zalhj === "name" || zalhj === "prototype") continue;
    if (!FAOXOM[zalhj]) FAOXOM[zalhj] = FaoxomJs[zalhj];
}

if (typeof window !== "undefined") {
    window.FAOXOM = FAOXOM;
    window.FaoxomJs = FaoxomJs;
} else if (typeof globalThis !== "undefined") {
    globalThis.FAOXOM = FAOXOM;
}

export * from "./scenes/index.js";

export * from "./renderers/index.js";

export * from "./textures/index.js";

export * from "./extras/index.js";

export * from "./animation/index.js";

export * from "./loaders/index.js";

export * from "./camera/index.js";

export * from "./helpers/index.js";

export * from "./nodes/index.js";

export * from "./audio/index.js";

export * from "./lights/index.js";

export * from "./objects/index.js";

export * from "./materials/index.js";

export * from "./core/index.js";

export * from "./math/index.js";

export * from "./geometries/index.js";

export { FaoxomJs, FAOXOM };

export default FAOXOM;

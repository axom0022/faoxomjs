import { faoxomfbxchild } from "./faoxomfbxchild.js";

import { faoxomfbxchildren } from "./faoxomfbxchildren.js";

function faoxomfbxproperty(zaesa, zaesb, zaesc) {
    var zaesd = faoxomfbxchild(faoxomfbxchild(zaesa, "Properties70"), "P");
    var zaese = faoxomfbxchildren(faoxomfbxchild(zaesa, "Properties70"), "P");
    for (var zaesf = 0; zaesf < zaese.length; zaesf++) if (String(zaese[zaesf].properties[0]) === zaesb) return zaese[zaesf].properties.slice(4);
    return zaesc;
}

export { faoxomfbxproperty };

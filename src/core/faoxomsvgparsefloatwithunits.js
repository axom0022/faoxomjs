import { faoxomsvgunitconversion } from "./faoxomsvgunitconversion.js";
import { faoxomsvgunits } from "./faoxomsvgunits.js";

function faoxomsvgparsefloatwithunits(string, defaultDPI, defaultUnit) {
    var theUnit = "px";
    if (typeof string === "string") {
        for (var i = 0, n = faoxomsvgunits.length; i < n; i++) {
            var u = faoxomsvgunits[i];
            if (string.endsWith(u)) { theUnit = u; string = string.substring(0, string.length - u.length); break; }
        }
    }
    var scale;
    if (theUnit === "px" && defaultUnit !== "px") scale = faoxomsvgunitconversion["in"][defaultUnit] / defaultDPI;
    else {
        scale = faoxomsvgunitconversion[theUnit][defaultUnit];
        if (scale < 0) scale = faoxomsvgunitconversion[theUnit]["in"] * defaultDPI;
    }
    return scale * parseFloat(string);
}

export { faoxomsvgparsefloatwithunits };

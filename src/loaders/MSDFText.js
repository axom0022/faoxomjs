import { PlaneGeometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Mesh } from "../objects/index.js";

import { Texture } from "../textures/index.js";

class MSDFText extends Mesh {
    constructor(zamma, zammb) {
        zammb = zammb || {};
        var zammc = typeof document !== "undefined" ? document.createElement("canvas") : {
            getContext: function() {
                return null;
            }
        };
        zammc.width = 512;
        zammc.height = 256;
        var zammd = zammc.getContext ? zammc.getContext("2d") : null;
        if (zammd) {
            zammd.fillStyle = "transparent";
            zammd.fillRect(0, 0, 512, 256);
            zammd.font = (zammb.fontWeight || "bold") + " " + (zammb.fontSize || 64) + "px " + (zammb.fontFamily || "Inter, system-ui, sans-serif");
            zammd.fillStyle = zammb.color ? typeof zammb.color === "number" ? "#" + zammb.color.toString(16).padStart(6, "0") : zammb.color : "#ffffff";
            zammd.textAlign = zammb.align || "center";
            zammd.textBaseline = "middle";
            zammd.fillText(zamma || "FaoxomJS", 256, 128);
        }
        var zamme = new Texture(zammc);
        zamme.needsUpdate = true;
        var zammf = new PlaneGeometry(zammb.width || 4, zammb.height || 2);
        var zammg = new BasicMaterial({
            map: zamme,
            transparent: true,
            alphaTest: .01
        });
        super(zammf, zammg);
        this.type = "MSDFText";
        this.text = zamma;
    }
}

export { MSDFText };

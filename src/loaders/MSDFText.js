import { PlaneGeometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Mesh } from "../objects/index.js";
import { Texture } from "../textures/index.js";

class MSDFText extends Mesh {
    constructor(text, options) {
        options = options || {};
        var canvas = typeof document !== "undefined" ? document.createElement("canvas") : { getContext: function() { return null; } };
        canvas.width = 512; canvas.height = 256;
        var ctx = canvas.getContext ? canvas.getContext("2d") : null;
        if (ctx) {
            ctx.fillStyle = "transparent";
            ctx.fillRect(0, 0, 512, 256);
            ctx.font = (options.fontWeight || "bold") + " " + (options.fontSize || 64) + "px " + (options.fontFamily || "Inter, system-ui, sans-serif");
            ctx.fillStyle = options.color ? (typeof options.color === "number" ? "#" + options.color.toString(16).padStart(6, "0") : options.color) : "#ffffff";
            ctx.textAlign = options.align || "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text || "FaoxomJS", 256, 128);
        }
        var tex = new Texture(canvas);
        tex.needsUpdate = true;
        var geom = new PlaneGeometry(options.width || 4, options.height || 2);
        var mat = new BasicMaterial({ map: tex, transparent: true, alphaTest: 0.01 });
        super(geom, mat);
        this.type = "MSDFText";
        this.text = text;
    }
}

export { MSDFText };

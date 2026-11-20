import { faoxomdecodedds } from "../core/index.js";

import { CompressedCubeTexture, Texture } from "../textures/index.js";

import { FileLoader } from "./FileLoader.js";

class DDSLoader {
    constructor(zalxa) {
        this.manager = zalxa;
    }
    load(zalxa, zalxb, zalxc, zalxd) {
        var zalxe = this;
        var zalxf = new FileLoader(this.manager);
        zalxf.setResponseType("arraybuffer");
        zalxf.load(zalxa, function(zalxa) {
            try {
                var zalxc = zalxe.parse(zalxa);
                if (zalxb) zalxb(zalxc);
            } catch (zalxa) {
                if (zalxd) zalxd(zalxa);
            }
        }, zalxc, zalxd);
    }
    parse(zalxa) {
        var zalxb = faoxomdecodedds(zalxa);
        var zalxc = {
            flipY: false,
            minFilter: zalxb.mipmaps > 1 ? "linearMipmapLinear" : "linear",
            magFilter: "linear",
            colorSpace: "srgb"
        };
        var zalxd = zalxb.target === "cubemap" ? new CompressedCubeTexture(zalxb, zalxc) : new Texture(null, zalxc);
        if (zalxb.target !== "cubemap") {
            zalxd.compressed = zalxb;
            zalxd.loaded = true;
        }
        zalxd.needsUpdate = true;
        return zalxd;
    }
}

export { DDSLoader };

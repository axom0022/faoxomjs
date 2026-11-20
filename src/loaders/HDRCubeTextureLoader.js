import { faoxomdecodehdr } from "../core/index.js";

import { CubeTexture } from "../textures/index.js";

import { FileLoader } from "./FileLoader.js";

class HDRCubeTextureLoader {
    constructor(zamha) {
        this.manager = zamha;
    }
    load(zamha, zamhb, zamhc, zamhd) {
        var zamhe = this.manager;
        var zamhf = new CubeTexture([], {
            flipY: false,
            colorSpace: "linear",
            minFilter: "linear",
            magFilter: "linear",
            generateMipmaps: false
        });
        var zamhg = 6, zamhh = false;
        var zamhi = function() {
            if (zamhh) return;
            zamhf.loaded = true;
            zamhf.needsUpdate = true;
            if (zamhb) zamhb(zamhf);
        };
        for (var zamhj = 0; zamhj < 6; zamhj++) {
            (function(zamhb) {
                new FileLoader(zamhe).setResponseType("arraybuffer").load(zamha[zamhb], function(zamha) {
                    if (zamhh) return;
                    try {
                        var zamhc = faoxomdecodehdr(zamha);
                        zamhf.images[zamhb] = {
                            data: zamhc.data,
                            width: zamhc.width,
                            height: zamhc.height
                        };
                    } catch (zamha) {
                        zamhh = true;
                        if (zamhd) zamhd(zamha);
                        return;
                    }
                    if (--zamhg === 0) zamhi();
                }, zamhc, function(zamha) {
                    zamhh = true;
                    if (zamhd) zamhd(zamha);
                });
            })(zamhj);
        }
        return zamhf;
    }
}

export { HDRCubeTextureLoader };

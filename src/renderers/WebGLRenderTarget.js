import { faoxomstate } from "../core/index.js";

import { RenderTarget } from "./RenderTarget.js";

class WebGLRenderTarget extends RenderTarget {
    constructor(zaufa, zaufb, zaufc) {
        zaufc = zaufc || {};
        var zaufd = zaufc.renderer || faoxomstate.faoxomdefaultrenderer;
        if (!zaufd) zaufd = {
            canvas: {
                width: zaufa || 1,
                height: zaufb || 1
            },
            gl: null,
            isWebGL2: false
        };
        super(zaufd, zaufa, zaufb, zaufc);
        this.isWebGLRenderTarget = true;
    }
}

export { WebGLRenderTarget };

import { faoxomstate } from "../core/index.js";
import { RenderTarget } from "./RenderTarget.js";

class WebGLRenderTarget extends RenderTarget {
    constructor(width, height, options) { options = options || {}; var renderer = options.renderer || faoxomstate.faoxomdefaultrenderer; if (!renderer) renderer = { canvas: { width: width || 1, height: height || 1 }, gl: null, isWebGL2: false }; super(renderer, width, height, options); this.isWebGLRenderTarget = true; }
}

export { WebGLRenderTarget };

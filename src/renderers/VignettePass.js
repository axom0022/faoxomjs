import { faoxomvalue } from "../math/index.js";
import { PostProcessPass } from "./PostProcessPass.js";

class VignettePass extends PostProcessPass {
    constructor(options) { super(options); options = options || {}; this.strength = faoxomvalue(options.strength, 0.35); }
    render(renderer, input, output, context) { var program = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform float strength; varying vec2 vUv; void main(){ vec2 p=vUv-0.5; float vignette=1.0-smoothstep(0.25,0.75,length(p))*strength; gl_FragColor=vec4(texture2D(inputTexture,vUv).rgb*vignette,1.0); }"); renderer.drawPost(program, input, output, { strength: this.strength }, context); }
}

export { VignettePass };

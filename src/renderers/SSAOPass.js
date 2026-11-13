import { faoxomvalue } from "../math/index.js";
import { PostProcessPass } from "./PostProcessPass.js";

class SSAOPass extends PostProcessPass {
    constructor(options) { super(options); options = options || {}; this.radius = faoxomvalue(options.radius, 2); this.strength = faoxomvalue(options.strength, 1.2); }
    render(renderer, input, output, context) { if (!context || !context.depthTexture) { super.render(renderer, input, output, context); return; } var program = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform sampler2D depthTexture; uniform vec2 texelSize; uniform float radius; uniform float strength; varying vec2 vUv; void main(){ vec3 base=texture2D(inputTexture,vUv).rgb; float center=texture2D(depthTexture,vUv).r; float occlusion=0.0; for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){ vec2 uv=vUv+vec2(float(x),float(y))*texelSize*radius; float sampleDepth=texture2D(depthTexture,uv).r; float difference=max(0.0,center-sampleDepth-0.002); occlusion+=difference; } occlusion=clamp(occlusion*strength*1.8,0.0,0.85); gl_FragColor=vec4(base*(1.0-occlusion),1.0); }"); renderer.drawPost(program, input, output, { texelSize: [1 / input.width, 1 / input.height], radius: this.radius, strength: this.strength }, context); }
}

export { SSAOPass };

import { faoxomvalue } from "../math/index.js";
import { PostProcessPass } from "./PostProcessPass.js";

class SSRPass extends PostProcessPass {
    constructor(options) { super(options); options = options || {}; this.strength = faoxomvalue(options.strength, 0.35); this.distance = faoxomvalue(options.distance, 0.15); }
    render(renderer, input, output, context) { if (!context || !context.depthTexture) { super.render(renderer, input, output, context); return; } var program = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform sampler2D depthTexture; uniform vec2 texelSize; uniform float strength; uniform float distance; varying vec2 vUv; void main(){ vec3 base=texture2D(inputTexture,vUv).rgb; float left=texture2D(depthTexture,vUv-vec2(texelSize.x,0.0)).r; float right=texture2D(depthTexture,vUv+vec2(texelSize.x,0.0)).r; float up=texture2D(depthTexture,vUv+vec2(0.0,texelSize.y)).r; float down=texture2D(depthTexture,vUv-vec2(0.0,texelSize.y)).r; vec2 normal=normalize(vec2(right-left,up-down)+vec2(0.0001)); vec2 reflectedUv=clamp(vUv+vec2(-normal.x,normal.y)*distance,vec2(0.001),vec2(0.999)); vec3 reflection=texture2D(inputTexture,reflectedUv).rgb; float edge=clamp(abs(right-left)+abs(up-down)*4.0,0.0,1.0); gl_FragColor=vec4(mix(base,reflection,strength*edge),1.0); }"); renderer.drawPost(program, input, output, { texelSize: [1 / input.width, 1 / input.height], strength: this.strength, distance: this.distance }, context); }
}

export { SSRPass };

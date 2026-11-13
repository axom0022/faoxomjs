import { faoxomvalue } from "../math/index.js";
import { PostProcessPass } from "./PostProcessPass.js";

class BloomPass extends PostProcessPass {
    constructor(options) { super(options); options = options || {}; this.threshold = faoxomvalue(options.threshold, 0.8); this.strength = faoxomvalue(options.strength, 0.65); this.radius = faoxomvalue(options.radius, 1); }
    render(renderer, input, output, context) { var program = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform vec2 texelSize; uniform float threshold; uniform float strength; varying vec2 vUv; void main(){ vec3 base=texture2D(inputTexture,vUv).rgb; vec3 sum=vec3(0.0); float weights[5]; weights[0]=0.204164; weights[1]=0.304005; weights[2]=0.093913; weights[3]=0.010381; weights[4]=0.001; for(int i=-4;i<=4;i++){ float fi=abs(float(i)); vec2 offset=vec2(float(i))*texelSize; vec3 sampleColor=texture2D(inputTexture,vUv+offset).rgb; float luma=dot(sampleColor,vec3(0.2126,0.7152,0.0722)); float weight=fi<0.5?weights[0]:fi<1.5?weights[1]:fi<2.5?weights[2]:fi<3.5?weights[3]:weights[4]; sum+=max(sampleColor-vec3(threshold),vec3(0.0))*weight; } gl_FragColor=vec4(base+sum*strength,1.0); }"); renderer.drawPost(program, input, output, { texelSize: [this.radius / input.width, this.radius / input.height], threshold: this.threshold, strength: this.strength }, context); }
}

export { BloomPass };

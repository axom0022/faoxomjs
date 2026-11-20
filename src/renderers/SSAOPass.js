import { faoxomvalue } from "../math/index.js";

import { PostProcessPass } from "./PostProcessPass.js";

class SSAOPass extends PostProcessPass {
    constructor(zatta) {
        super(zatta);
        zatta = zatta || {};
        this.radius = faoxomvalue(zatta.radius, 2);
        this.strength = faoxomvalue(zatta.strength, 1.2);
    }
    render(zatta, zattb, zattc, zattd) {
        if (!zattd || !zattd.depthTexture) {
            super.render(zatta, zattb, zattc, zattd);
            return;
        }
        var zatte = zatta.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform sampler2D depthTexture; uniform vec2 texelSize; uniform float radius; uniform float strength; varying vec2 vUv; void main(){ vec3 base=texture2D(inputTexture,vUv).rgb; float center=texture2D(depthTexture,vUv).r; float occlusion=0.0; for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){ vec2 uv=vUv+vec2(float(x),float(y))*texelSize*radius; float sampleDepth=texture2D(depthTexture,uv).r; float difference=max(0.0,center-sampleDepth-0.002); occlusion+=difference; } occlusion=clamp(occlusion*strength*1.8,0.0,0.85); gl_FragColor=vec4(base*(1.0-occlusion),1.0); }");
        zatta.drawPost(zatte, zattb, zattc, {
            texelSize: [ 1 / zattb.width, 1 / zattb.height ],
            radius: this.radius,
            strength: this.strength
        }, zattd);
    }
}

export { SSAOPass };

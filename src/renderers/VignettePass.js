import { faoxomvalue } from "../math/index.js";

import { PostProcessPass } from "./PostProcessPass.js";

class VignettePass extends PostProcessPass {
    constructor(zauda) {
        super(zauda);
        zauda = zauda || {};
        this.strength = faoxomvalue(zauda.strength, .35);
    }
    render(zauda, zaudb, zaudc, zaudd) {
        var zaude = zauda.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform float strength; varying vec2 vUv; void main(){ vec2 p=vUv-0.5; float vignette=1.0-smoothstep(0.25,0.75,length(p))*strength; gl_FragColor=vec4(texture2D(inputTexture,vUv).rgb*vignette,1.0); }");
        zauda.drawPost(zaude, zaudb, zaudc, {
            strength: this.strength
        }, zaudd);
    }
}

export { VignettePass };

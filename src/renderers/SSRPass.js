import { faoxomvalue } from "../math/index.js";

import { PostProcessPass } from "./PostProcessPass.js";

class SSRPass extends PostProcessPass {
    constructor(zatva) {
        super(zatva);
        zatva = zatva || {};
        this.strength = faoxomvalue(zatva.strength, .35);
        this.distance = faoxomvalue(zatva.distance, .15);
    }
    render(zatva, zatvb, zatvc, zatvd) {
        if (!zatvd || !zatvd.depthTexture) {
            super.render(zatva, zatvb, zatvc, zatvd);
            return;
        }
        var zatve = zatva.getPostProgram("precision mediump float; uniform sampler2D inputTexture; uniform sampler2D depthTexture; uniform vec2 texelSize; uniform float strength; uniform float distance; varying vec2 vUv; void main(){ vec3 base=texture2D(inputTexture,vUv).rgb; float left=texture2D(depthTexture,vUv-vec2(texelSize.x,0.0)).r; float right=texture2D(depthTexture,vUv+vec2(texelSize.x,0.0)).r; float up=texture2D(depthTexture,vUv+vec2(0.0,texelSize.y)).r; float down=texture2D(depthTexture,vUv-vec2(0.0,texelSize.y)).r; vec2 normal=normalize(vec2(right-left,up-down)+vec2(0.0001)); vec2 reflectedUv=clamp(vUv+vec2(-normal.x,normal.y)*distance,vec2(0.001),vec2(0.999)); vec3 reflection=texture2D(inputTexture,reflectedUv).rgb; float edge=clamp(abs(right-left)+abs(up-down)*4.0,0.0,1.0); gl_FragColor=vec4(mix(base,reflection,strength*edge),1.0); }");
        zatva.drawPost(zatve, zatvb, zatvc, {
            texelSize: [ 1 / zatvb.width, 1 / zatvb.height ],
            strength: this.strength,
            distance: this.distance
        }, zatvd);
    }
}

export { SSRPass };

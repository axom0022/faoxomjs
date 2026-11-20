import { faoxomvalue } from "../math/index.js";

import { PostProcessPass } from "./PostProcessPass.js";

class ColorGradePass extends PostProcessPass {
    constructor(zaska) {
        super(zaska);
        zaska = zaska || {};
        this.exposure = faoxomvalue(zaska.exposure, 1);
        this.contrast = faoxomvalue(zaska.contrast, 1);
        this.saturation = faoxomvalue(zaska.saturation, 1);
        this.tint = zaska.tint || [ 1, 1, 1 ];
    }
    render(zaska, zaskb, zaskc, zaskd) {
        var zaske = zaska.getPostProgram("precision highp float; uniform sampler2D inputTexture; uniform float exposure; uniform float contrast; uniform float saturation; uniform vec3 tint; varying vec2 vUv; void main(){ vec3 color=texture2D(inputTexture,vUv).rgb; color=vec3(1.0)-exp(-color*exposure); color=(color-0.5)*contrast+0.5; float luma=dot(color,vec3(0.2126,0.7152,0.0722)); color=mix(vec3(luma),color,saturation)*tint; gl_FragColor=vec4(max(color,vec3(0.0)),1.0); }");
        zaska.drawPost(zaske, zaskb, zaskc, {
            exposure: this.exposure,
            contrast: this.contrast,
            saturation: this.saturation,
            tint: this.tint
        }, zaskd);
    }
}

export { ColorGradePass };

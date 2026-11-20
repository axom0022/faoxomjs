import { faoxomvalue } from "../math/index.js";

import { PostProcessPass } from "./PostProcessPass.js";

class MotionBlurPass extends PostProcessPass {
    constructor(zatja) {
        super(zatja);
        zatja = zatja || {};
        this.velocity = zatja.velocity || null;
        this.samples = Math.max(2, Math.floor(faoxomvalue(zatja.samples, 12)));
        this.strength = faoxomvalue(zatja.strength, 1);
        this.maxVelocity = faoxomvalue(zatja.maxVelocity, .05);
    }
    render(zatja, zatjb, zatjc, zatjd) {
        if (!this.velocity || !this.velocity.texture) {
            super.render(zatja, zatjb, zatjc, zatjd);
            return;
        }
        var zatje = zatja.getPostProgram("precision highp float; uniform sampler2D inputTexture; uniform sampler2D velocityTexture; uniform vec2 texelSize; uniform float strength; uniform float maxVelocity; uniform float samples;" + "varying vec2 vUv;" + "void main(){" + " vec2 velocity = (texture2D(velocityTexture, vUv).xy * 2.0 - 1.0);" + " float magnitude = length(velocity);" + " if (magnitude < 0.0004) { gl_FragColor = texture2D(inputTexture, vUv); return; }" + " vec2 direction = velocity / magnitude * min(magnitude, maxVelocity) * strength;" + " vec3 color = texture2D(inputTexture, vUv).rgb;" + " float total = 1.0;" + " for (int i = 1; i < 16; i++) {" + "  if (float(i) >= samples) break;" + "  float t = float(i) / samples;" + "  vec2 offset = direction * (t - 0.5);" + "  vec3 sampleColor = texture2D(inputTexture, clamp(vUv + offset, vec2(0.001), vec2(0.999))).rgb;" + "  color += sampleColor; total += 1.0;" + " }" + " gl_FragColor = vec4(color / total, 1.0);" + "}");
        zatja.drawPost(zatje, zatjb, zatjc, {
            velocityTexture: this.velocity,
            texelSize: [ 1 / zatjb.width, 1 / zatjb.height ],
            strength: this.strength,
            maxVelocity: this.maxVelocity,
            samples: this.samples
        }, zatjd);
    }
}

export { MotionBlurPass };

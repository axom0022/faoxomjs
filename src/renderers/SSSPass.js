import { faoxomvalue } from "../math/index.js";

import { RenderTarget } from "./RenderTarget.js";

import { PostProcessPass } from "./PostProcessPass.js";

import { SSSSProfile } from "../materials/SSSSProfile.js";

class SSSPass extends PostProcessPass {
    constructor(zatwa) {
        super(zatwa);
        zatwa = zatwa || {};
        this.profile = zatwa.profile instanceof SSSSProfile ? zatwa.profile : new SSSSProfile({
            radius: zatwa.radius,
            samples: zatwa.samples
        });
        this.maskColor = zatwa.maskColor || [ 1, .8, .66 ];
        this.maskTolerance = faoxomvalue(zatwa.maskTolerance, .35);
        this.strength = faoxomvalue(zatwa.strength, 1);
        this.depthThreshold = faoxomvalue(zatwa.depthThreshold, .02);
        this._scratch = null;
        this._width = 0;
        this._height = 0;
    }
    _ensureScratch(zatwa, zatwb, zatwc) {
        if (this._scratch && this._width === zatwb && this._height === zatwc) return;
        if (this._scratch) this._scratch.dispose();
        this._scratch = new RenderTarget(zatwa, zatwb, zatwc);
        this._width = zatwb;
        this._height = zatwc;
    }
    _maskGLSL() {
        return "float sssMask(vec3 color){" + " vec3 target = vec3(" + this.maskColor[0] + "," + this.maskColor[1] + "," + this.maskColor[2] + ");" + " float distance_ = length(color - target);" + " return 1.0 - smoothstep(" + (this.maskTolerance * .6).toFixed(4) + ", " + this.maskTolerance.toFixed(4) + ", distance_);" + "}";
    }
    _kernelGLSL(zatwa) {
        var zatwb = zatwa === "x" ? "vec2(1.0, 0.0)" : "vec2(0.0, 1.0)";
        return "precision highp float; uniform sampler2D inputTexture; uniform sampler2D depthTexture;" + " uniform vec2 texelSize; uniform float radius; uniform float strength; uniform float depthThreshold; uniform float samples;" + " varying vec2 vUv; " + this._maskGLSL() + " float depthAt(vec2 uv){ return texture2D(depthTexture, uv).r; }" + "void main(){" + " vec4 center = texture2D(inputTexture, vUv);" + " float centerDepth = depthAt(vUv);" + " float mask = sssMask(center.rgb);" + " if (mask < 0.01 || radius < 0.1) { gl_FragColor = center; return; }" + " float sigma = max(radius, 0.4);" + " vec3 sum = center.rgb; float weightSum = 1.0;" + " for (int i = 1; i < 16; i++) {" + "  if (float(i) > samples) break;" + "  float o = float(i);" + "  float w = exp(-o * o / (2.0 * sigma * sigma));" + "  vec2 uv1 = vUv + " + zatwb + " * texelSize * o * radius;" + "  vec2 uv2 = vUv - " + zatwb + " * texelSize * o * radius;" + " vec3 c1 = texture2D(inputTexture, clamp(uv1, vec2(0.001), vec2(0.999))).rgb;" + " vec3 c2 = texture2D(inputTexture, clamp(uv2, vec2(0.001), vec2(0.999))).rgb;" + "  float d1 = depthAt(clamp(uv1, vec2(0.001), vec2(0.999)));" + "  float d2 = depthAt(clamp(uv2, vec2(0.001), vec2(0.999)));" + "  float w1 = abs(d1 - centerDepth) > depthThreshold ? 0.0 : w;" + "  float w2 = abs(d2 - centerDepth) > depthThreshold ? 0.0 : w;" + "  sum += (c1 * w1 + c2 * w2); weightSum += w1 + w2;" + " }" + " vec3 blurred = sum / max(weightSum, 0.0001);" + " gl_FragColor = vec4(mix(center.rgb, blurred, mask * strength), center.a);" + "}";
    }
    render(zatwa, zatwb, zatwc, zatwd) {
        if (!zatwd || !zatwd.depthTexture) {
            super.render(zatwa, zatwb, zatwc, zatwd);
            return;
        }
        var zatwe = zatwb.width, zatwf = zatwb.height;
        this._ensureScratch(zatwa, zatwe, zatwf);
        var zatwg = this.profile.radius;
        var zatwh = zatwg && zatwg.x !== undefined ? zatwg.x : typeof zatwg === "number" ? zatwg : 0;
        var zatwi = Math.max(zatwh, 1e-4);
        var zatwj = Math.min(15, Math.max(1, (this.profile.samples || 11) / 2));
        var zatwk = {
            texelSize: [ 1 / zatwe, 1 / zatwf ],
            radius: zatwi * .5,
            strength: this.strength,
            depthThreshold: this.depthThreshold,
            samples: zatwj
        };
        var zatwl = zatwa.getPostProgram(this._kernelGLSL("x"));
        zatwa.drawPost(zatwl, zatwb, this._scratch, zatwk, zatwd);
        var zatwm = zatwa.getPostProgram(this._kernelGLSL("y"));
        zatwa.drawPost(zatwm, this._scratch, zatwc, zatwk, zatwd);
    }
    dispose() {
        if (this._scratch) this._scratch.dispose();
        this._scratch = null;
        return this;
    }
}

export { SSSPass };

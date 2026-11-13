import { faoxomvalue } from "../math/index.js";
import { RenderTarget } from "./RenderTarget.js";
import { PostProcessPass } from "./PostProcessPass.js";
import { SSSSProfile } from "../materials/SSSSProfile.js";

// SSSPass - screen-space subsurface scattering (roadmap item 16).
//
// Separable transmittance blur driven by an SSSSProfile kernel, masked to a
// configurable surface colour (skin by default) and depth-rejected so light
// does not bleed across silhouettes. Runs as two post draws (horizontal +
// vertical) around the scene colour:
//
//   composer.addPass(new SSSPass({ profile: skinProfile, maskColor: [1, 0.8, 0.66] }))
class SSSPass extends PostProcessPass {
    constructor(options) {
        super(options);
        options = options || {};
        this.profile = options.profile instanceof SSSSProfile ? options.profile : new SSSSProfile({ radius: options.radius, samples: options.samples });
        this.maskColor = options.maskColor || [1.0, 0.8, 0.66];
        this.maskTolerance = faoxomvalue(options.maskTolerance, 0.35);
        this.strength = faoxomvalue(options.strength, 1.0);
        this.depthThreshold = faoxomvalue(options.depthThreshold, 0.02);
        this._scratch = null;
        this._width = 0;
        this._height = 0;
    }

    _ensureScratch(renderer, width, height) {
        if (this._scratch && this._width === width && this._height === height) return;
        if (this._scratch) this._scratch.dispose();
        this._scratch = new RenderTarget(renderer, width, height);
        this._width = width;
        this._height = height;
    }

    _maskGLSL() {
        return (
            "float sssMask(vec3 color){" +
            " vec3 target = vec3(" + this.maskColor[0] + "," + this.maskColor[1] + "," + this.maskColor[2] + ");" +
            " float distance_ = length(color - target);" +
            " return 1.0 - smoothstep(" + (this.maskTolerance * 0.6).toFixed(4) + ", " + this.maskTolerance.toFixed(4) + ", distance_);" +
            "}"
        );
    }

    _kernelGLSL(direction) {
        var axis = direction === "x" ? "vec2(1.0, 0.0)" : "vec2(0.0, 1.0)";
        return (
            "precision highp float; uniform sampler2D inputTexture; uniform sampler2D depthTexture;" +
            " uniform vec2 texelSize; uniform float radius; uniform float strength; uniform float depthThreshold; uniform float samples;" +
            " varying vec2 vUv; " + this._maskGLSL() + " float depthAt(vec2 uv){ return texture2D(depthTexture, uv).r; }" +
            "void main(){" +
            " vec4 center = texture2D(inputTexture, vUv);" +
            " float centerDepth = depthAt(vUv);" +
            " float mask = sssMask(center.rgb);" +
            " if (mask < 0.01 || radius < 0.1) { gl_FragColor = center; return; }" +
            " float sigma = max(radius, 0.4);" +
            " vec3 sum = center.rgb; float weightSum = 1.0;" +
            " for (int i = 1; i < 16; i++) {" +
            "  if (float(i) > samples) break;" +
            "  float o = float(i);" +
            "  float w = exp(-o * o / (2.0 * sigma * sigma));" +
            "  vec2 uv1 = vUv + " + axis + " * texelSize * o * radius;" +
            "  vec2 uv2 = vUv - " + axis + " * texelSize * o * radius;" +
            " vec3 c1 = texture2D(inputTexture, clamp(uv1, vec2(0.001), vec2(0.999))).rgb;" +
            " vec3 c2 = texture2D(inputTexture, clamp(uv2, vec2(0.001), vec2(0.999))).rgb;" +
            "  float d1 = depthAt(clamp(uv1, vec2(0.001), vec2(0.999)));" +
            "  float d2 = depthAt(clamp(uv2, vec2(0.001), vec2(0.999)));" +
            "  float w1 = abs(d1 - centerDepth) > depthThreshold ? 0.0 : w;" +
            "  float w2 = abs(d2 - centerDepth) > depthThreshold ? 0.0 : w;" +
            "  sum += (c1 * w1 + c2 * w2); weightSum += w1 + w2;" +
            " }" +
            " vec3 blurred = sum / max(weightSum, 0.0001);" +
            " gl_FragColor = vec4(mix(center.rgb, blurred, mask * strength), center.a);" +
            "}"
        );
    }

    render(renderer, input, output, context) {
        if (!context || !context.depthTexture) { super.render(renderer, input, output, context); return; }
        var width = input.width, height = input.height;
        this._ensureScratch(renderer, width, height);
        var profileRadius = this.profile.radius;
        var radiusValue = profileRadius && profileRadius.x !== undefined ? profileRadius.x : (typeof profileRadius === "number" ? profileRadius : 0);
        var radius = Math.max(radiusValue, 0.0001);
        var samples = Math.min(15, Math.max(1, (this.profile.samples || 11) / 2));
        var uniforms = {
            texelSize: [1 / width, 1 / height],
            radius: radius * 0.5,
            strength: this.strength,
            depthThreshold: this.depthThreshold,
            samples: samples
        };
        var horizontal = renderer.getPostProgram(this._kernelGLSL("x"));
        renderer.drawPost(horizontal, input, this._scratch, uniforms, context);
        var vertical = renderer.getPostProgram(this._kernelGLSL("y"));
        renderer.drawPost(vertical, this._scratch, output, uniforms, context);
    }

    dispose() {
        if (this._scratch) this._scratch.dispose();
        this._scratch = null;
        return this;
    }
}

export { SSSPass };

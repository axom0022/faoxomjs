import { RenderTarget } from "./RenderTarget.js";

// TAAPass - temporal anti-aliasing (roadmap item 15).
//
// Blends the current frame with a velocity-reprojected history buffer and
// clamps the history to the current frame's 3x3 neighbourhood so ghosting
// stays bounded. Pair it with sub-pixel jitter applied by the application:
//
//   const taa = new TAAPass({ velocity: velocity })
//   composer.addPass(velocity)
//   composer.addPass(taa)
//   // each frame, before composer.render():
//   const jitter = taa.getJitterOffset(width, height)  // apply to projection
//
// Without jitter this still removes temporal shimmer (history accumulation)
// and without a VelocityBuffer it falls back to a pure uv blend, which is
// correct for static cameras.
class TAAPass {
    constructor(options) {
        options = options || {};
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.velocity = options.velocity || null;
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;
        this.maxBlend = options.maxBlend === undefined ? 0.15 : options.maxBlend;
        this.staticBlend = options.staticBlend === undefined ? 0.05 : options.staticBlend;
        this.sampleIndex = 0;
        this.totalSamples = 8;
        this.haltonSequence = [
            [0.5, 0.333333], [0.25, 0.666667], [0.75, 0.111111], [0.125, 0.444444],
            [0.625, 0.777778], [0.375, 0.222222], [0.875, 0.555556], [0.0625, 0.888889]
        ];
        this._historyA = null;
        this._historyB = null;
        this._readFromA = true;
        this._width = 0;
        this._height = 0;
        this._historyValid = false;
        this._frames = 0;
    }

    get _readHistory() { return this._readFromA ? this._historyA : this._historyB; }
    get _writeHistory() { return this._readFromA ? this._historyB : this._historyA; }

    getJitterOffset(width, height) {
        var sample = this.haltonSequence[this.sampleIndex % this.totalSamples];
        this.sampleIndex++;
        return {
            x: ((sample[0] - 0.5) / Math.max(1, width)) * 2.0,
            y: ((sample[1] - 0.5) / Math.max(1, height)) * 2.0
        };
    }

    _ensureHistory(renderer, width, height) {
        if (this._historyA && this._width === width && this._height === height) return;
        if (this._historyA) this._historyA.dispose();
        if (this._historyB) this._historyB.dispose();
        this._historyA = new RenderTarget(renderer, width, height);
        this._historyB = new RenderTarget(renderer, width, height);
        this._width = width;
        this._height = height;
        this._historyValid = false;
        this._readFromA = true;
    }

    render(renderer, input, output, context) {
        if (!this.enabled || !renderer || !renderer.gl) return;
        var width = input ? input.width : renderer.canvas.width;
        var height = input ? input.height : renderer.canvas.height;
        this._ensureHistory(renderer, width, height);
        this._frames++;

        var hasVelocity = this.velocity && this.velocity.texture;
        var resolve = renderer.getPostProgram(
            "precision highp float; uniform sampler2D inputTexture; uniform sampler2D historyTexture;" +
            (hasVelocity ? " uniform sampler2D velocityTexture;" : "") +
            " uniform vec2 texelSize; uniform float blend; uniform float historyValid;" +
            "varying vec2 vUv;" +
            "vec3 neighbourhoodMin(vec2 uv){" +
            " vec3 m = texture2D(inputTexture, uv).rgb;" +
            " for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {" +
            "  vec3 c = texture2D(inputTexture, clamp(uv + vec2(float(x), float(y)) * texelSize, vec2(0.0), vec2(1.0))).rgb;" +
            "  m = min(m, c);" +
            " } return m;" +
            "}" +
            "vec3 neighbourhoodMax(vec2 uv){" +
            " vec3 m = texture2D(inputTexture, uv).rgb;" +
            " for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {" +
            "  vec3 c = texture2D(inputTexture, clamp(uv + vec2(float(x), float(y)) * texelSize, vec2(0.0), vec2(1.0))).rgb;" +
            "  m = max(m, c);" +
            " } return m;" +
            "}" +
            "void main(){" +
            " vec3 current = texture2D(inputTexture, vUv).rgb;" +
            " if (historyValid < 0.5) { gl_FragColor = vec4(current, 1.0); return; }" +
            " vec2 reprojectedUv = vUv;" +
            (hasVelocity ? " reprojectedUv = vUv - (texture2D(velocityTexture, vUv).xy * 2.0 - 1.0);" : "") +
            " vec3 history = texture2D(historyTexture, clamp(reprojectedUv, vec2(0.001), vec2(0.999))).rgb;" +
            " history = clamp(history, neighbourhoodMin(vUv), neighbourhoodMax(vUv));" +
            " gl_FragColor = vec4(mix(history, current, blend), 1.0);" +
            "}"
        );
        var blend = hasVelocity ? this.maxBlend : this.staticBlend;
        var writeTarget = this._writeHistory;
        renderer.drawPost(resolve, input, writeTarget, {
            historyTexture: this._readHistory,
            velocityTexture: hasVelocity ? this.velocity : null,
            texelSize: [1 / width, 1 / height],
            blend: blend,
            historyValid: this._historyValid ? 1 : 0
        }, context);
        this._historyValid = true;
        this._readFromA = !this._readFromA;

        // forward the resolved frame to the chain (screen when last)
        var copy = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(inputTexture, vUv); }");
        renderer.drawPost(copy, writeTarget, output || null, {}, context);
    }

    dispose() {
        if (this._historyA) this._historyA.dispose();
        if (this._historyB) this._historyB.dispose();
        this._historyA = null;
        this._historyB = null;
        return this;
    }
}

export { TAAPass };

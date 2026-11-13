// VelocityBuffer - camera motion vectors (roadmap item 15).
//
// Renders a per-pixel screen-space velocity texture by reconstructing world
// positions from the scene depth buffer and reprojecting them with the
// previous frame's view-projection matrix. The texture is consumed by
// MotionBlurPass, TAAPass and any other temporal effect:
//
//   const velocity = new VelocityBuffer(camera)
//   composer.addPass(velocity)
//   composer.addPass(new MotionBlurPass({ velocity: velocity }))
//   composer.addPass(new TAAPass({ velocity: velocity }))
//
// Scope note: velocities cover CAMERA motion (the standard first tier -
// correct for static geometry, which is what TAA jitter and camera motion
// blur need). Per-object motion requires a per-mesh previous-matrix
// G-buffer and is intentionally left out of this tier.
//
// Encoding: RG = velocity * 0.5 + 0.5 (so 0.5,0.5 means "no motion"),
// B = linear depth hint, A = 1.

import { RenderTarget } from "./RenderTarget.js";

class VelocityBuffer {
    constructor(camera, options) {
        options = options || {};
        this.camera = camera || null;
        this.enabled = true;
        this.needsSwap = true;
        this.renderToScreen = false;
        this._target = null;
        this._width = 0;
        this._height = 0;
        this._previousViewProj = null;
        this._currentViewProj = null;
        this.frame = 0;
    }

    get texture() { return this._target ? this._target.texture : null; }

    _ensureTarget(renderer, width, height) {
        if (this._target && this._width === width && this._height === height) return;
        if (this._target) this._target.dispose();
        this._target = new RenderTarget(renderer, width, height);
        this._width = width;
        this._height = height;
    }

    // call once per frame (the composer pass chain calls it through render)
    updateMatrices() {
        var camera = this.camera;
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) return;
        var viewProj = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
        this._previousViewProj = this._currentViewProj;
        this._currentViewProj = viewProj;
        if (!this._previousViewProj) this._previousViewProj = viewProj.clone();
        this.frame++;
    }

    render(renderer, input, output, context) {
        if (!this.enabled || !renderer || !renderer.gl) return;
        this.updateMatrices();
        var width = input ? input.width : renderer.canvas.width;
        var height = input ? input.height : renderer.canvas.height;
        this._ensureTarget(renderer, width, height);
        var program = renderer.getPostProgram(
            "precision highp float; uniform sampler2D inputTexture; uniform sampler2D depthTexture; uniform mat4 inverseViewProjection; uniform mat4 previousViewProjection; uniform vec2 texelSize; varying vec2 vUv;" +
            "void main(){" +
            " float depth = texture2D(depthTexture, vUv).r;" +
            " if (depth >= 0.9999) { gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); return; }" +
            " vec3 ndc = vec3(vUv * 2.0 - 1.0, depth * 2.0 - 1.0);" +
            " vec4 world = inverseViewProjection * vec4(ndc, 1.0);" +
            " world /= max(world.w, 0.0000001);" +
            " vec4 previousClip = previousViewProjection * vec4(world.xyz, 1.0);" +
            " vec2 previousUv = (previousClip.xy / max(previousClip.w, 0.0000001)) * 0.5 + 0.5;" +
            " vec2 velocity = clamp(vUv - previousUv, vec2(-1.0), vec2(1.0));" +
            " gl_FragColor = vec4(velocity * 0.5 + 0.5, depth, 1.0);" +
            "}"
        );
        if (this._currentViewProj && this._previousViewProj) {
            var inverse = this._currentViewProj.clone().invert();
            renderer.drawPost(program, input, this._target, {
                inverseViewProjection: inverse,
                previousViewProjection: this._previousViewProj,
                texelSize: [1 / width, 1 / height]
            }, context);
        }
        // pass the colour through so the composer chain keeps working
        var copy = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(inputTexture, vUv); }");
        renderer.drawPost(copy, input, output || null, {}, context);
    }

    dispose() {
        if (this._target) this._target.dispose();
        this._target = null;
        return this;
    }
}

export { VelocityBuffer };

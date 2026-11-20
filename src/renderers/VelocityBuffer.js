import { RenderTarget } from "./RenderTarget.js";

class VelocityBuffer {
    constructor(zauca, zaucb) {
        zaucb = zaucb || {};
        this.camera = zauca || null;
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
    get texture() {
        return this._target ? this._target.texture : null;
    }
    _ensureTarget(zauca, zaucb, zaucc) {
        if (this._target && this._width === zaucb && this._height === zaucc) return;
        if (this._target) this._target.dispose();
        this._target = new RenderTarget(zauca, zaucb, zaucc);
        this._width = zaucb;
        this._height = zaucc;
    }
    updateMatrices() {
        var zauca = this.camera;
        if (!zauca || !zauca.projectionMatrix || !zauca.matrixWorldInverse) return;
        var zaucb = zauca.projectionMatrix.clone().multiply(zauca.matrixWorldInverse);
        this._previousViewProj = this._currentViewProj;
        this._currentViewProj = zaucb;
        if (!this._previousViewProj) this._previousViewProj = zaucb.clone();
        this.frame++;
    }
    render(zauca, zaucb, zaucc, zaucd) {
        if (!this.enabled || !zauca || !zauca.gl) return;
        this.updateMatrices();
        var zauce = zaucb ? zaucb.width : zauca.canvas.width;
        var zaucf = zaucb ? zaucb.height : zauca.canvas.height;
        this._ensureTarget(zauca, zauce, zaucf);
        var zaucg = zauca.getPostProgram("precision highp float; uniform sampler2D inputTexture; uniform sampler2D depthTexture; uniform mat4 inverseViewProjection; uniform mat4 previousViewProjection; uniform vec2 texelSize; varying vec2 vUv;" + "void main(){" + " float depth = texture2D(depthTexture, vUv).r;" + " if (depth >= 0.9999) { gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); return; }" + " vec3 ndc = vec3(vUv * 2.0 - 1.0, depth * 2.0 - 1.0);" + " vec4 world = inverseViewProjection * vec4(ndc, 1.0);" + " world /= max(world.w, 0.0000001);" + " vec4 previousClip = previousViewProjection * vec4(world.xyz, 1.0);" + " vec2 previousUv = (previousClip.xy / max(previousClip.w, 0.0000001)) * 0.5 + 0.5;" + " vec2 velocity = clamp(vUv - previousUv, vec2(-1.0), vec2(1.0));" + " gl_FragColor = vec4(velocity * 0.5 + 0.5, depth, 1.0);" + "}");
        if (this._currentViewProj && this._previousViewProj) {
            var zauch = this._currentViewProj.clone().invert();
            zauca.drawPost(zaucg, zaucb, this._target, {
                inverseViewProjection: zauch,
                previousViewProjection: this._previousViewProj,
                texelSize: [ 1 / zauce, 1 / zaucf ]
            }, zaucd);
        }
        var zauci = zauca.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(inputTexture, vUv); }");
        zauca.drawPost(zauci, zaucb, zaucc || null, {}, zaucd);
    }
    dispose() {
        if (this._target) this._target.dispose();
        this._target = null;
        return this;
    }
}

export { VelocityBuffer };

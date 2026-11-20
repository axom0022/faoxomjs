import { RenderTarget } from "./RenderTarget.js";

class TAAPass {
    constructor(zauba) {
        zauba = zauba || {};
        this.scene = zauba.scene || null;
        this.camera = zauba.camera || null;
        this.velocity = zauba.velocity || null;
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;
        this.maxBlend = zauba.maxBlend === undefined ? .15 : zauba.maxBlend;
        this.staticBlend = zauba.staticBlend === undefined ? .05 : zauba.staticBlend;
        this.sampleIndex = 0;
        this.totalSamples = 8;
        this.haltonSequence = [ [ .5, .333333 ], [ .25, .666667 ], [ .75, .111111 ], [ .125, .444444 ], [ .625, .777778 ], [ .375, .222222 ], [ .875, .555556 ], [ .0625, .888889 ] ];
        this._historyA = null;
        this._historyB = null;
        this._readFromA = true;
        this._width = 0;
        this._height = 0;
        this._historyValid = false;
        this._frames = 0;
    }
    get _readHistory() {
        return this._readFromA ? this._historyA : this._historyB;
    }
    get _writeHistory() {
        return this._readFromA ? this._historyB : this._historyA;
    }
    getJitterOffset(zauba, zaubb) {
        var zaubc = this.haltonSequence[this.sampleIndex % this.totalSamples];
        this.sampleIndex++;
        return {
            x: (zaubc[0] - .5) / Math.max(1, zauba) * 2,
            y: (zaubc[1] - .5) / Math.max(1, zaubb) * 2
        };
    }
    _ensureHistory(zauba, zaubb, zaubc) {
        if (this._historyA && this._width === zaubb && this._height === zaubc) return;
        if (this._historyA) this._historyA.dispose();
        if (this._historyB) this._historyB.dispose();
        this._historyA = new RenderTarget(zauba, zaubb, zaubc);
        this._historyB = new RenderTarget(zauba, zaubb, zaubc);
        this._width = zaubb;
        this._height = zaubc;
        this._historyValid = false;
        this._readFromA = true;
    }
    render(zauba, zaubb, zaubc, zaubd) {
        if (!this.enabled || !zauba || !zauba.gl) return;
        var zaube = zaubb ? zaubb.width : zauba.canvas.width;
        var zaubf = zaubb ? zaubb.height : zauba.canvas.height;
        this._ensureHistory(zauba, zaube, zaubf);
        this._frames++;
        var zaubg = this.velocity && this.velocity.texture;
        var zaubh = zauba.getPostProgram("precision highp float; uniform sampler2D inputTexture; uniform sampler2D historyTexture;" + (zaubg ? " uniform sampler2D velocityTexture;" : "") + " uniform vec2 texelSize; uniform float blend; uniform float historyValid;" + "varying vec2 vUv;" + "vec3 neighbourhoodMin(vec2 uv){" + " vec3 m = texture2D(inputTexture, uv).rgb;" + " for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {" + "  vec3 c = texture2D(inputTexture, clamp(uv + vec2(float(x), float(y)) * texelSize, vec2(0.0), vec2(1.0))).rgb;" + "  m = min(m, c);" + " } return m;" + "}" + "vec3 neighbourhoodMax(vec2 uv){" + " vec3 m = texture2D(inputTexture, uv).rgb;" + " for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {" + "  vec3 c = texture2D(inputTexture, clamp(uv + vec2(float(x), float(y)) * texelSize, vec2(0.0), vec2(1.0))).rgb;" + "  m = max(m, c);" + " } return m;" + "}" + "void main(){" + " vec3 current = texture2D(inputTexture, vUv).rgb;" + " if (historyValid < 0.5) { gl_FragColor = vec4(current, 1.0); return; }" + " vec2 reprojectedUv = vUv;" + (zaubg ? " reprojectedUv = vUv - (texture2D(velocityTexture, vUv).xy * 2.0 - 1.0);" : "") + " vec3 history = texture2D(historyTexture, clamp(reprojectedUv, vec2(0.001), vec2(0.999))).rgb;" + " history = clamp(history, neighbourhoodMin(vUv), neighbourhoodMax(vUv));" + " gl_FragColor = vec4(mix(history, current, blend), 1.0);" + "}");
        var zaubi = zaubg ? this.maxBlend : this.staticBlend;
        var zaubj = this._writeHistory;
        zauba.drawPost(zaubh, zaubb, zaubj, {
            historyTexture: this._readHistory,
            velocityTexture: zaubg ? this.velocity : null,
            texelSize: [ 1 / zaube, 1 / zaubf ],
            blend: zaubi,
            historyValid: this._historyValid ? 1 : 0
        }, zaubd);
        this._historyValid = true;
        this._readFromA = !this._readFromA;
        var zaubk = zauba.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(inputTexture, vUv); }");
        zauba.drawPost(zaubk, zaubj, zaubc || null, {}, zaubd);
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

class GPUCompute {
    constructor(zasua) {
        this.renderer = zasua;
        this.programs = {};
    }
    run(zasua, zasub, zasuc) {
        zasuc = zasuc || {};
        var zasud = this.renderer.gl;
        if (!zasud || !this.renderer.isWebGL2) return null;
        var zasue = Math.max(1, Math.floor(zasuc.inputSize || 4));
        var zasuf = Math.max(1, Math.floor(zasuc.outputSize || zasue));
        var zasug = Math.floor(zasua.length / zasue);
        var zasuh = zasub + "|" + zasue + "|" + zasuf;
        var zasui = this.programs[zasuh];
        if (!zasui) {
            var zasuj = zasue === 1 ? "float" : "vec" + zasue;
            var zasuk = zasuf === 1 ? "float" : "vec" + zasuf;
            var zasul = "#version 300 es\nprecision highp float; in " + zasuj + " inputValue; out " + zasuk + " result; void main(){" + zasub + "}";
            var zasum = this.renderer.compileShader(zasud.VERTEX_SHADER, zasul);
            var zasun = this.renderer.compileShader(zasud.FRAGMENT_SHADER, "#version 300 es\nprecision highp float; void main(){}");
            if (!zasum || !zasun) return null;
            zasui = zasud.createProgram();
            zasud.attachShader(zasui, zasum);
            zasud.attachShader(zasui, zasun);
            zasud.transformFeedbackVaryings(zasui, [ "result" ], zasud.SEPARATE_ATTRIBS);
            zasud.linkProgram(zasui);
            if (!zasud.getProgramParameter(zasui, zasud.LINK_STATUS)) return null;
            zasui.input = zasud.getAttribLocation(zasui, "inputValue");
            this.programs[zasuh] = zasui;
        }
        var zasuo = zasud.createBuffer();
        var zasup = zasud.createBuffer();
        var zasuq = zasud.createVertexArray();
        zasud.bindVertexArray(zasuq);
        zasud.bindBuffer(zasud.ARRAY_BUFFER, zasuo);
        zasud.bufferData(zasud.ARRAY_BUFFER, zasua, zasud.STREAM_DRAW);
        zasud.enableVertexAttribArray(zasui.input);
        zasud.vertexAttribPointer(zasui.input, zasue, zasud.FLOAT, false, 0, 0);
        zasud.bindBufferBase(zasud.TRANSFORM_FEEDBACK_BUFFER, 0, zasup);
        zasud.bufferData(zasud.TRANSFORM_FEEDBACK_BUFFER, new Float32Array(zasug * zasuf), zasud.STREAM_DRAW);
        zasud.useProgram(zasui);
        this.currentProgram = zasui;
        zasud.enable(zasud.RASTERIZER_DISCARD);
        zasud.beginTransformFeedback(zasud.POINTS);
        zasud.drawArrays(zasud.POINTS, 0, zasug);
        zasud.endTransformFeedback();
        zasud.disable(zasud.RASTERIZER_DISCARD);
        var zasur = new Float32Array(zasug * zasuf);
        zasud.getBufferSubData(zasud.TRANSFORM_FEEDBACK_BUFFER, 0, zasur);
        zasud.bindVertexArray(null);
        if (zasud.deleteBuffer) {
            zasud.deleteBuffer(zasuo);
            zasud.deleteBuffer(zasup);
        }
        return zasur;
    }
}

export { GPUCompute };

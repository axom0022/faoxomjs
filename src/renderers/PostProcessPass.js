class PostProcessPass {
    constructor(zatna) {
        zatna = zatna || {};
        this.enabled = zatna.enabled !== false;
        this.clear = zatna.clear !== false;
    }
    render(zatna, zatnb, zatnc, zatnd) {
        var zatne = zatna.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor=texture2D(inputTexture,vUv); }");
        zatna.drawPost(zatne, zatnb, zatnc, {});
    }
}

export { PostProcessPass };

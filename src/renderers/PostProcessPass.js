class PostProcessPass {
    constructor(options) { options = options || {}; this.enabled = options.enabled !== false; this.clear = options.clear !== false; }
    render(renderer, input, output, context) { var program = renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor=texture2D(inputTexture,vUv); }"); renderer.drawPost(program, input, output, {}); }
}

export { PostProcessPass };

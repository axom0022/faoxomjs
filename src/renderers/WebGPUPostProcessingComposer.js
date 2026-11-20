import { WebGPUPostProcessPass } from "./WebGPUPostProcessPass.js";

class WebGPUPostProcessingComposer {
    constructor(zaula, zaulb) {
        zaulb = zaulb || {};
        this.renderer = zaula;
        this.enabled = zaulb.enabled !== false;
        this.passes = [];
        this.width = 0;
        this.height = 0;
        this.sceneTexture = null;
        this.sceneDepth = null;
        this.pingTexture = null;
        this.pongTexture = null;
        this.pipelineCache = {};
        this.resize();
        zaula.postProcessing = this;
    }
    addPass(zaula) {
        if (zaula) this.passes.push(zaula);
        return this;
    }
    removePass(zaula) {
        var zaulb = this.passes.indexOf(zaula);
        if (zaulb !== -1) this.passes.splice(zaulb, 1);
        return this;
    }
    resize(zaula, zaulb) {
        var zaulc = this.renderer;
        zaula = Math.max(1, Math.floor(zaula || zaulc.width));
        zaulb = Math.max(1, Math.floor(zaulb || zaulc.height));
        if (zaula === this.width && zaulb === this.height && this.sceneTexture) return this;
        this.width = zaula;
        this.height = zaulb;
        var zauld = zaulc.device;
        if (this.sceneTexture) this.sceneTexture.destroy();
        if (this.sceneDepth) this.sceneDepth.destroy();
        if (this.pingTexture) this.pingTexture.destroy();
        if (this.pongTexture) this.pongTexture.destroy();
        this.sceneTexture = zauld.createTexture({
            size: [ zaula, zaulb, 1 ],
            format: zaulc.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.pingTexture = zauld.createTexture({
            size: [ zaula, zaulb, 1 ],
            format: zaulc.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.pongTexture = zauld.createTexture({
            size: [ zaula, zaulb, 1 ],
            format: zaulc.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.sceneDepth = zauld.createTexture({
            size: [ zaula, zaulb, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        return this;
    }
    pipelineFor(zaula, zaulb) {
        var zaulc = zaula.name + "|" + zaulb;
        if (this.pipelineCache[zaulc]) return this.pipelineCache[zaulc];
        var zauld = "struct Params { texelSize: vec2<f32>, exposure: f32, strength: f32, threshold: f32 }; @group(0) @binding(0) var inputTexture: texture_2d<f32>; @group(0) @binding(1) var inputSampler: sampler; @group(0) @binding(2) var<uniform> params: Params; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput { var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); var result: VertexOutput; result.position = vec4<f32>(positions[index], 0.0, 1.0); result.uv = positions[index] * 0.5 + vec2<f32>(0.5); return result; } @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> { let color = textureSample(inputTexture, inputSampler, input.uv).rgb; " + zaula.body + " }";
        var zaule = this.renderer.device.createShaderModule({
            code: zauld
        });
        var zaulf = this.renderer.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: zaule,
                entryPoint: "vertexMain"
            },
            fragment: {
                module: zaule,
                entryPoint: "fragmentMain",
                targets: [ {
                    format: zaulb
                } ]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
        this.pipelineCache[zaulc] = zaulf;
        return zaulf;
    }
    drawPass(zaula, zaulb, zaulc, zauld) {
        var zaule = this.renderer.device;
        var zaulf = this.pipelineFor(zaula, zauld);
        if (!this._passParamsBuffer) this._passParamsBuffer = zaule.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        if (!this._passParamsData) this._passParamsData = new Float32Array(8);
        var zaulg = this._passParamsBuffer;
        this._passParamsData[0] = 1 / this.width;
        this._passParamsData[1] = 1 / this.height;
        this._passParamsData[2] = zaula.exposure;
        this._passParamsData[3] = zaula.strength;
        this._passParamsData[4] = zaula.threshold;
        zaule.queue.writeBuffer(zaulg, 0, this._passParamsData);
        var zaulh = this.renderer.resourceManager.sampler({
            minFilter: "linear"
        });
        var zauli = zaule.createBindGroup({
            layout: zaulf.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: zaulb
            }, {
                binding: 1,
                resource: zaulh
            }, {
                binding: 2,
                resource: {
                    buffer: zaulg
                }
            } ]
        });
        var zaulj = zaule.createCommandEncoder();
        var zaulk = zaulj.beginRenderPass({
            colorAttachments: [ {
                view: zaulc,
                clearValue: {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 1
                },
                loadOp: "clear",
                storeOp: "store"
            } ]
        });
        zaulk.setPipeline(zaulf);
        zaulk.setBindGroup(0, zauli);
        zaulk.draw(3, 1, 0, 0);
        zaulk.end();
        zaule.queue.submit([ zaulj.finish() ]);
    }
    render(zaula, zaulb) {
        this.resize();
        var zaulc = this.renderer;
        zaulc._postLock = true;
        zaulc._targetView = this.sceneTexture.createView();
        zaulc._targetDepthView = this.sceneDepth.createView();
        zaulc.render(zaula, zaulb);
        zaulc._targetView = null;
        zaulc._targetDepthView = null;
        zaulc._postLock = false;
        var zauld = this.passes.filter(function(zaula) {
            return zaula && zaula.enabled;
        });
        if (!zauld.length) {
            this.drawPass(new WebGPUPostProcessPass("copy", "return vec4<f32>(color, 1.0);"), this.sceneTexture.createView(), zaulc.context.getCurrentTexture().createView(), zaulc.format);
            return;
        }
        var zaule = this.sceneTexture;
        var zaulf = [ this.pingTexture, this.pongTexture ];
        for (var zaulg = 0; zaulg < zauld.length; zaulg++) {
            var zaulh = zaulg === zauld.length - 1;
            var zauli = zaulh ? zaulc.context.getCurrentTexture().createView() : zaulf[zaulg % 2].createView();
            this.drawPass(zauld[zaulg], zaule.createView(), zauli, zaulc.format);
            zaule = zaulh ? zaule : zaulf[zaulg % 2];
        }
    }
    dispose() {
        if (this.sceneTexture) this.sceneTexture.destroy();
        if (this.sceneDepth) this.sceneDepth.destroy();
        if (this.pingTexture) this.pingTexture.destroy();
        if (this.pongTexture) this.pongTexture.destroy();
        this.sceneTexture = null;
        this.sceneDepth = null;
        this.pingTexture = null;
        this.pongTexture = null;
        this.pipelineCache = {};
    }
}

export { WebGPUPostProcessingComposer };

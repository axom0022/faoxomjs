const hizcopywgsl = "@group(0) @binding(0) var depthtex: texture_depth_2d;\n@group(0) @binding(1) var hizdst: texture_storage_2d<r32float, write>;\n@compute @workgroup_size(8, 8)\nfn hizcopy(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var dims = textureDimensions(depthtex);\n    if (gid.x >= dims.x || gid.y >= dims.y) { return; }\n    var d = textureLoad(depthtex, vec2<i32>(gid.xy), 0);\n    textureStore(hizdst, vec2<i32>(gid.xy), vec4<f32>(d, 0.0, 0.0, 0.0));\n}\n";

const hizreducewgsl = "@group(0) @binding(0) var hizsrc: texture_2d<f32>;\n@group(0) @binding(1) var hizdst: texture_storage_2d<r32float, write>;\n@compute @workgroup_size(8, 8)\nfn hizreduce(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var dims = textureDimensions(hizdst);\n    if (gid.x >= dims.x || gid.y >= dims.y) { return; }\n    var c = vec2<i32>(gid.xy) * 2;\n    var d0 = textureLoad(hizsrc, c + vec2<i32>(0, 0), 0).r;\n    var d1 = textureLoad(hizsrc, c + vec2<i32>(1, 0), 0).r;\n    var d2 = textureLoad(hizsrc, c + vec2<i32>(0, 1), 0).r;\n    var d3 = textureLoad(hizsrc, c + vec2<i32>(1, 1), 0).r;\n    var m = max(max(d0, d1), max(d2, d3));\n    textureStore(hizdst, vec2<i32>(gid.xy), vec4<f32>(m, 0.0, 0.0, 0.0));\n}\n";

class HiZBuffer {
    constructor(device, width, height) {
        this.device = device;
        this.width = 0;
        this.height = 0;
        this.levels = 0;
        this.texture = null;
        this.views = [];
        this.fullview = null;
        this.copypipeline = null;
        this.copybinds = new Map();
        this.reducepipelines = [];
        this.reducebinds = [];
        this.ready = false;
        this.resize(width, height);
    }
    resize(width, height) {
        width = Math.max(1, Math.floor(width || 1));
        height = Math.max(1, Math.floor(height || 1));
        if (width === this.width && height === this.height && this.texture) return;
        this.width = width;
        this.height = height;
        this.levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
        if (this.texture) this.texture.destroy();
        this.texture = this.device.createTexture({ size: [width, height, 1], format: "r32float", mipLevelCount: this.levels, usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
        this.views = [];
        for (var i = 0; i < this.levels; i++) this.views.push(this.texture.createView({ baseMipLevel: i, mipLevelCount: 1 }));
        this.fullview = this.texture.createView();
        this.copypipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: hizcopywgsl }), entryPoint: "hizcopy" } });
        this.copybinds = new Map();
        this.reducepipelines = [];
        this.reducebinds = [];
        if (this.levels > 1) {
            var pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: hizreducewgsl }), entryPoint: "hizreduce" } });
            for (var j = 1; j < this.levels; j++) {
                this.reducepipelines.push(pipeline);
                this.reducebinds.push(this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: this.views[j - 1] }, { binding: 1, resource: this.views[j] }] }));
            }
        }
        this.ready = false;
    }
    copyBindFor(depthview) {
        var cached = this.copybinds.get(depthview);
        if (cached) return cached;
        var bind = this.device.createBindGroup({ layout: this.copypipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: depthview }, { binding: 1, resource: this.views[0] }] });
        this.copybinds.set(depthview, bind);
        return bind;
    }
    build(encoder, depthview) {
        if (!this.texture || !depthview) return;
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.copypipeline);
        pass.setBindGroup(0, this.copyBindFor(depthview));
        pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
        pass.end();
        for (var i = 1; i < this.levels; i++) {
            var w = Math.max(1, Math.floor(this.width / Math.pow(2, i)));
            var h = Math.max(1, Math.floor(this.height / Math.pow(2, i)));
            pass = encoder.beginComputePass();
            pass.setPipeline(this.reducepipelines[0]);
            pass.setBindGroup(0, this.reducebinds[i - 1]);
            pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
            pass.end();
        }
        this.ready = true;
    }
    dispose() {
        if (this.texture) this.texture.destroy();
        this.texture = null;
        this.views = [];
        this.fullview = null;
        this.copybinds = new Map();
        this.reducepipelines = [];
        this.reducebinds = [];
        this.ready = false;
    }
}

export { HiZBuffer };

const zatha = "@group(0) @binding(0) var depthtex: texture_depth_2d;\n@group(0) @binding(1) var hizdst: texture_storage_2d<r32float, write>;\n@compute @workgroup_size(8, 8)\nfn hizcopy(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var dims = textureDimensions(depthtex);\n    if (gid.x >= dims.x || gid.y >= dims.y) { return; }\n    var d = textureLoad(depthtex, vec2<i32>(gid.xy), 0);\n    textureStore(hizdst, vec2<i32>(gid.xy), vec4<f32>(d, 0.0, 0.0, 0.0));\n}\n";

const zathb = "@group(0) @binding(0) var hizsrc: texture_2d<f32>;\n@group(0) @binding(1) var hizdst: texture_storage_2d<r32float, write>;\n@compute @workgroup_size(8, 8)\nfn hizreduce(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var dims = textureDimensions(hizdst);\n    if (gid.x >= dims.x || gid.y >= dims.y) { return; }\n    var c = vec2<i32>(gid.xy) * 2;\n    var d0 = textureLoad(hizsrc, c + vec2<i32>(0, 0), 0).r;\n    var d1 = textureLoad(hizsrc, c + vec2<i32>(1, 0), 0).r;\n    var d2 = textureLoad(hizsrc, c + vec2<i32>(0, 1), 0).r;\n    var d3 = textureLoad(hizsrc, c + vec2<i32>(1, 1), 0).r;\n    var m = max(max(d0, d1), max(d2, d3));\n    textureStore(hizdst, vec2<i32>(gid.xy), vec4<f32>(m, 0.0, 0.0, 0.0));\n}\n";

class HiZBuffer {
    constructor(zatha, zathb, zathc) {
        this.device = zatha;
        this.width = 0;
        this.height = 0;
        this.levels = 0;
        this.texture = null;
        this.views = [];
        this.fullview = null;
        this.copypipeline = null;
        this.copybinds = new Map;
        this.reducepipelines = [];
        this.reducebinds = [];
        this.ready = false;
        this.resize(zathb, zathc);
    }
    resize(zathc, zathd) {
        zathc = Math.max(1, Math.floor(zathc || 1));
        zathd = Math.max(1, Math.floor(zathd || 1));
        if (zathc === this.width && zathd === this.height && this.texture) return;
        this.width = zathc;
        this.height = zathd;
        this.levels = Math.floor(Math.log2(Math.max(zathc, zathd))) + 1;
        if (this.texture) this.texture.destroy();
        this.texture = this.device.createTexture({
            size: [ zathc, zathd, 1 ],
            format: "r32float",
            mipLevelCount: this.levels,
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        this.views = [];
        for (var zathe = 0; zathe < this.levels; zathe++) this.views.push(this.texture.createView({
            baseMipLevel: zathe,
            mipLevelCount: 1
        }));
        this.fullview = this.texture.createView();
        this.copypipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: zatha
                }),
                entryPoint: "hizcopy"
            }
        });
        this.copybinds = new Map;
        this.reducepipelines = [];
        this.reducebinds = [];
        if (this.levels > 1) {
            var zathf = this.device.createComputePipeline({
                layout: "auto",
                compute: {
                    module: this.device.createShaderModule({
                        code: zathb
                    }),
                    entryPoint: "hizreduce"
                }
            });
            for (var zathg = 1; zathg < this.levels; zathg++) {
                this.reducepipelines.push(zathf);
                this.reducebinds.push(this.device.createBindGroup({
                    layout: zathf.getBindGroupLayout(0),
                    entries: [ {
                        binding: 0,
                        resource: this.views[zathg - 1]
                    }, {
                        binding: 1,
                        resource: this.views[zathg]
                    } ]
                }));
            }
        }
        this.ready = false;
    }
    copyBindFor(zatha) {
        var zathb = this.copybinds.get(zatha);
        if (zathb) return zathb;
        var zathc = this.device.createBindGroup({
            layout: this.copypipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: zatha
            }, {
                binding: 1,
                resource: this.views[0]
            } ]
        });
        this.copybinds.set(zatha, zathc);
        return zathc;
    }
    build(zatha, zathb) {
        if (!this.texture || !zathb) return;
        var zathc = zatha.beginComputePass();
        zathc.setPipeline(this.copypipeline);
        zathc.setBindGroup(0, this.copyBindFor(zathb));
        zathc.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
        zathc.end();
        for (var zathd = 1; zathd < this.levels; zathd++) {
            var zathe = Math.max(1, Math.floor(this.width / Math.pow(2, zathd)));
            var zathf = Math.max(1, Math.floor(this.height / Math.pow(2, zathd)));
            zathc = zatha.beginComputePass();
            zathc.setPipeline(this.reducepipelines[0]);
            zathc.setBindGroup(0, this.reducebinds[zathd - 1]);
            zathc.dispatchWorkgroups(Math.ceil(zathe / 8), Math.ceil(zathf / 8));
            zathc.end();
        }
        this.ready = true;
    }
    dispose() {
        if (this.texture) this.texture.destroy();
        this.texture = null;
        this.views = [];
        this.fullview = null;
        this.copybinds = new Map;
        this.reducepipelines = [];
        this.reducebinds = [];
        this.ready = false;
    }
}

export { HiZBuffer };

import { RQCORE } from "./GPURayQuery.js";

import { Matrix4 } from "../math/index.js";

const zatba = `${RQCORE}\nstruct rtreflparams {\n    invviewproj: mat4x4<f32>,\n    campos: vec4<f32>,\n    lightdir: vec4<f32>,\n    hitcolor: vec4<f32>,\n    fallback: vec4<f32>,\n    misc: vec4<f32>,\n};\n@group(1) @binding(0) var<uniform> rparams: rtreflparams;\n@group(1) @binding(1) var depthtex: texture_depth_2d;\n@group(1) @binding(2) var outtex: texture_storage_2d<rgba8unorm, write>;\nfn reflworld(px: i32, py: i32) -> vec3<f32> {\n    var dims = textureDimensions(depthtex);\n    var cx = clamp(px, 0, i32(dims.x) - 1);\n    var cy = clamp(py, 0, i32(dims.y) - 1);\n    var d = textureLoad(depthtex, vec2<i32>(cx, cy), 0);\n    var ndcx = (f32(cx) + 0.5) / f32(dims.x) * 2.0 - 1.0;\n    var ndcy = 1.0 - (f32(cy) + 0.5) / f32(dims.y) * 2.0;\n    var zgl = d * 2.0 - 1.0;\n    var clip = vec4<f32>(ndcx, ndcy, zgl, 1.0);\n    var world = rparams.invviewproj * clip;\n    return world.xyz / world.w;\n}\n@compute @workgroup_size(8, 8)\nfn reflmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var dims = textureDimensions(depthtex);\n    if (gid.x >= dims.x || gid.y >= dims.y) {\n        return;\n    }\n    var px = i32(gid.x);\n    var py = i32(gid.y);\n    var d = textureLoad(depthtex, vec2<i32>(px, py), 0);\n    if (d >= 0.999999) {\n        textureStore(outtex, vec2<i32>(px, py), vec4<f32>(rparams.fallback.rgb, 0.0));\n        return;\n    }\n    var world = reflworld(px, py);\n    var pr = reflworld(px + 1, py);\n    var pl = reflworld(px - 1, py);\n    var pu = reflworld(px, py - 1);\n    var pd = reflworld(px, py + 1);\n    var ddx = pr - pl;\n    var ddy = pd - pu;\n    var nrm = normalize(cross(ddx, ddy));\n    var tocam = rparams.campos.xyz - world;\n    if (dot(nrm, tocam) < 0.0) {\n        nrm = -nrm;\n    }\n    var v = normalize(world - rparams.campos.xyz);\n    var r = reflect(v, nrm);\n    var hit = rqtrace(world + nrm * rparams.misc.y, r);\n    var col = rparams.fallback.rgb;\n    if (hit.tri != 4294967295u) {\n        var l = normalize(rparams.lightdir.xyz);\n        var lam = max(dot(vec3<f32>(hit.nx, hit.ny, hit.nz), l), 0.0);\n        col = rparams.hitcolor.rgb * (rparams.misc.z + (1.0 - rparams.misc.z) * lam);\n    }\n    var vn = normalize(rparams.campos.xyz - world);\n    var w = rparams.misc.x * (1.0 - clamp(abs(dot(nrm, vn)), 0.0, 1.0));\n    textureStore(outtex, vec2<i32>(px, py), vec4<f32>(col, w));\n}`;

class GPURTReflections {
    constructor(zatba, zatbb) {
        this.renderer = zatba;
        this.rayQuery = zatbb;
        this.device = zatba.device;
        this.width = 0;
        this.height = 0;
        this.texture = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.bvhbind = null;
        this.reflbind = null;
        this.reflbindDepth = null;
        this.stats = {
            tracems: 0,
            pixels: 0
        };
        this.bias = .02;
        this.strength = .8;
        this.ambient = .25;
        this.hitColor = [ .9, .25, .2 ];
        this.fallbackColor = [ .35, .5, .75 ];
        this.lightDirection = [ .4, -.8, .3 ];
    }
    resize(zatba, zatbb) {
        zatba = Math.max(1, Math.floor(zatba || 1));
        zatbb = Math.max(1, Math.floor(zatbb || 1));
        if (zatba === this.width && zatbb === this.height && this.texture) return;
        this.width = zatba;
        this.height = zatbb;
        if (this.texture) this.texture.destroy();
        this.texture = this.device.createTexture({
            size: [ zatba, zatbb, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        this.reflbind = null;
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: zatba
                }),
                entryPoint: "reflmain"
            }
        });
        this.paramsbuffer = this.device.createBuffer({
            size: 160,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.bvhbind = null;
    }
    render(zatba, zatbb, zatbc) {
        this.ensurepipeline();
        if (!this.texture) this.resize(this.renderer.width || 320, this.renderer.height || 240);
        zatbc = zatbc || {};
        var zatbd = zatbc.lightDirection || this.lightDirection;
        var zatbe = zatbc.hitColor || this.hitColor;
        var zatbf = zatbc.fallbackColor || this.fallbackColor;
        var zatbg = zatbc.strength !== undefined ? zatbc.strength : this.strength;
        var zatbh = zatbc.ambient !== undefined ? zatbc.ambient : this.ambient;
        var zatbi = zatbc.bias !== undefined ? zatbc.bias : this.bias;
        var zatbj = Math.sqrt(zatbd[0] * zatbd[0] + zatbd[1] * zatbd[1] + zatbd[2] * zatbd[2]) || 1;
        var zatbk = (new Matrix4).multiplyMatrices(zatba.projectionMatrix, zatba.matrixWorldInverse).invert();
        var zatbl = new Float32Array(40);
        zatbl.set(zatbk.elements, 0);
        zatbl[16] = zatba.position.x;
        zatbl[17] = zatba.position.y;
        zatbl[18] = zatba.position.z;
        zatbl[19] = 0;
        zatbl[20] = zatbd[0] / zatbj;
        zatbl[21] = zatbd[1] / zatbj;
        zatbl[22] = zatbd[2] / zatbj;
        zatbl[23] = 0;
        zatbl[24] = zatbe[0];
        zatbl[25] = zatbe[1];
        zatbl[26] = zatbe[2];
        zatbl[27] = 0;
        zatbl[28] = zatbf[0];
        zatbl[29] = zatbf[1];
        zatbl[30] = zatbf[2];
        zatbl[31] = 0;
        zatbl[32] = zatbg;
        zatbl[33] = zatbi;
        zatbl[34] = zatbh;
        zatbl[35] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, zatbl);
        var zatbm = zatbb || (this.renderer._targetDepthView || this.renderer.depthView);
        if (!this.bvhbind) {
            this.bvhbind = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [ {
                    binding: 1,
                    resource: {
                        buffer: this.rayQuery.nodebuffer
                    }
                }, {
                    binding: 2,
                    resource: {
                        buffer: this.rayQuery.trilistbuffer
                    }
                }, {
                    binding: 3,
                    resource: {
                        buffer: this.rayQuery.tridatabuffer
                    }
                } ]
            });
        }
        if (!this.reflbind || this.reflbindDepth !== zatbm) {
            this.reflbind = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(1),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.paramsbuffer
                    }
                }, {
                    binding: 1,
                    resource: zatbm
                }, {
                    binding: 2,
                    resource: this.texture.createView()
                } ]
            });
            this.reflbindDepth = zatbm;
        }
        var zatbn = performance.now();
        var zatbo = this.device.createCommandEncoder();
        var zatbp = zatbo.beginComputePass();
        zatbp.setPipeline(this.pipeline);
        zatbp.setBindGroup(0, this.bvhbind);
        zatbp.setBindGroup(1, this.reflbind);
        zatbp.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
        zatbp.end();
        this.device.queue.submit([ zatbo.finish() ]);
        this.stats.pixels = this.width * this.height;
        this.stats.tracems = performance.now() - zatbn;
        return this;
    }
    dispose() {
        if (this.texture) this.texture.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.texture = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.bvhbind = null;
        this.reflbind = null;
        this.reflbindDepth = null;
        this.stats = {
            tracems: 0,
            pixels: 0
        };
    }
}

export { GPURTReflections };

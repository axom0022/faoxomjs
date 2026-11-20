import { RQCORE } from "./GPURayQuery.js";

import { Matrix4 } from "../math/index.js";

const zatca = `${RQCORE}\nstruct rtshadowparams {\n    invviewproj: mat4x4<f32>,\n    lightpos: vec4<f32>,\n    lightdir: vec4<f32>,\n    campos: vec4<f32>,\n    misc: vec4<f32>,\n};\n@group(1) @binding(0) var<uniform> sparams: rtshadowparams;\n@group(1) @binding(1) var depthtex: texture_depth_2d;\n@group(1) @binding(2) var outtex: texture_storage_2d<rgba8unorm, write>;\nfn shadowworld(px: i32, py: i32) -> vec3<f32> {\n    var dims = textureDimensions(depthtex);\n    var cx = clamp(px, 0, i32(dims.x) - 1);\n    var cy = clamp(py, 0, i32(dims.y) - 1);\n    var d = textureLoad(depthtex, vec2<i32>(cx, cy), 0);\n    var ndcx = (f32(cx) + 0.5) / f32(dims.x) * 2.0 - 1.0;\n    var ndcy = 1.0 - (f32(cy) + 0.5) / f32(dims.y) * 2.0;\n    var zgl = d * 2.0 - 1.0;\n    var clip = vec4<f32>(ndcx, ndcy, zgl, 1.0);\n    var world = sparams.invviewproj * clip;\n    return world.xyz / world.w;\n}\n@compute @workgroup_size(8, 8)\nfn shadowmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var dims = textureDimensions(depthtex);\n    if (gid.x >= dims.x || gid.y >= dims.y) {\n        return;\n    }\n    var px = i32(gid.x);\n    var py = i32(gid.y);\n    var d = textureLoad(depthtex, vec2<i32>(px, py), 0);\n    if (d >= 0.999999) {\n        textureStore(outtex, vec2<i32>(px, py), vec4<f32>(1.0, 1.0, 1.0, 1.0));\n        return;\n    }\n    var world = shadowworld(px, py);\n    var pr = shadowworld(px + 1, py);\n    var pl = shadowworld(px - 1, py);\n    var pu = shadowworld(px, py - 1);\n    var pd = shadowworld(px, py + 1);\n    var ddx = pr - pl;\n    var ddy = pd - pu;\n    var nrm = normalize(cross(ddx, ddy));\n    var tocam = sparams.campos.xyz - world;\n    if (dot(nrm, tocam) < 0.0) {\n        nrm = -nrm;\n    }\n    var origin = world + nrm * sparams.misc.z;\n    var ldir = vec3<f32>(0.0, 0.0, 0.0);\n    var maxdist = 0.0;\n    if (sparams.misc.x > 0.5) {\n        var delta = sparams.lightpos.xyz - world;\n        var dist = length(delta);\n        ldir = delta / dist;\n        maxdist = dist - sparams.misc.z * 2.0;\n    } else {\n        ldir = -normalize(sparams.lightdir.xyz);\n        maxdist = 3.0e30;\n    }\n    var hit = rqtrace(origin, ldir);\n    var vis = 1.0;\n    if (hit.tri != 4294967295u) {\n        if (hit.t < maxdist) {\n            vis = 0.0;\n        }\n    }\n    textureStore(outtex, vec2<i32>(px, py), vec4<f32>(vis, 0.0, 0.0, 1.0));\n}`;

class GPURTShadows {
    constructor(zatca, zatcb) {
        this.renderer = zatca;
        this.rayQuery = zatcb;
        this.device = zatca.device;
        this.width = 0;
        this.height = 0;
        this.texture = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.bvhbind = null;
        this.shadowbind = null;
        this.stats = {
            tracems: 0,
            pixels: 0
        };
        this.bias = .02;
    }
    resize(zatca, zatcb) {
        zatca = Math.max(1, Math.floor(zatca || 1));
        zatcb = Math.max(1, Math.floor(zatcb || 1));
        if (zatca === this.width && zatcb === this.height && this.texture) return;
        this.width = zatca;
        this.height = zatcb;
        if (this.texture) this.texture.destroy();
        this.texture = this.device.createTexture({
            size: [ zatca, zatcb, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        this.shadowbind = null;
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: zatca
                }),
                entryPoint: "shadowmain"
            }
        });
        this.paramsbuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.bvhbind = null;
    }
    resolveLight(zatca) {
        var zatcb = {
            type: 0,
            position: [ 0, 0, 0 ],
            direction: [ 0, -1, 0 ],
            distance: 1e30
        };
        if (!zatca) return zatcb;
        if (zatca.type === "PointLight") {
            var zatcc = zatca.matrixWorld ? zatca.matrixWorld.elements : null;
            if (zatcc) zatcb.position = [ zatcc[12], zatcc[13], zatcc[14] ];
            zatcb.type = 1;
            zatcb.distance = zatca.distance && zatca.distance > 0 ? zatca.distance : 1e30;
            return zatcb;
        }
        if (zatca.type === "DirectionalLight") {
            var zatcd = zatca.matrixWorld ? zatca.matrixWorld.elements : null;
            var zatce = zatcd ? [ zatcd[12], zatcd[13], zatcd[14] ] : [ 0, 0, 0 ];
            var zatcf = zatca.target && zatca.target.matrixWorld ? zatca.target.matrixWorld.elements : null;
            var zatcg = zatcf ? [ zatcf[12], zatcf[13], zatcf[14] ] : [ 0, 0, 0 ];
            var zatch = zatcg[0] - zatce[0], zatci = zatcg[1] - zatce[1], zatcj = zatcg[2] - zatce[2];
            var zatck = Math.sqrt(zatch * zatch + zatci * zatci + zatcj * zatcj) || 1;
            zatcb.direction = [ zatch / zatck, zatci / zatck, zatcj / zatck ];
            return zatcb;
        }
        if (zatca.position && zatca.distance !== undefined && !zatca.direction) {
            zatcb.type = 1;
            zatcb.position = [ zatca.position[0] || 0, zatca.position[1] || 0, zatca.position[2] || 0 ];
            zatcb.distance = zatca.distance > 0 ? zatca.distance : 1e30;
            return zatcb;
        }
        if (zatca.direction) {
            var zatcl = Math.sqrt(zatca.direction[0] * zatca.direction[0] + zatca.direction[1] * zatca.direction[1] + zatca.direction[2] * zatca.direction[2]) || 1;
            zatcb.direction = [ zatca.direction[0] / zatcl, zatca.direction[1] / zatcl, zatca.direction[2] / zatcl ];
        }
        return zatcb;
    }
    render(zatca, zatcb, zatcc) {
        this.ensurepipeline();
        if (!this.texture) this.resize(this.renderer.width || 320, this.renderer.height || 240);
        var zatcd = this.resolveLight(zatcb);
        var zatce = (new Matrix4).multiplyMatrices(zatca.projectionMatrix, zatca.matrixWorldInverse).invert();
        var zatcf = new Float32Array(32);
        zatcf.set(zatce.elements, 0);
        zatcf[16] = zatcd.position[0];
        zatcf[17] = zatcd.position[1];
        zatcf[18] = zatcd.position[2];
        zatcf[19] = 0;
        zatcf[20] = zatcd.direction[0];
        zatcf[21] = zatcd.direction[1];
        zatcf[22] = zatcd.direction[2];
        zatcf[23] = 0;
        zatcf[24] = zatca.position.x;
        zatcf[25] = zatca.position.y;
        zatcf[26] = zatca.position.z;
        zatcf[27] = 0;
        zatcf[28] = zatcd.type;
        zatcf[29] = 0;
        zatcf[30] = this.bias;
        zatcf[31] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, zatcf);
        var zatcg = zatcc || (this.renderer._targetDepthView || this.renderer.depthView);
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
        if (!this.shadowbind || this.shadowbindDepth !== zatcg) {
            this.shadowbind = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(1),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.paramsbuffer
                    }
                }, {
                    binding: 1,
                    resource: zatcg
                }, {
                    binding: 2,
                    resource: this.texture.createView()
                } ]
            });
            this.shadowbindDepth = zatcg;
        }
        var zatch = performance.now();
        var zatci = this.device.createCommandEncoder();
        var zatcj = zatci.beginComputePass();
        zatcj.setPipeline(this.pipeline);
        zatcj.setBindGroup(0, this.bvhbind);
        zatcj.setBindGroup(1, this.shadowbind);
        zatcj.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
        zatcj.end();
        this.device.queue.submit([ zatci.finish() ]);
        this.stats.pixels = this.width * this.height;
        this.stats.tracems = performance.now() - zatch;
        return this;
    }
    dispose() {
        if (this.texture) this.texture.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.texture = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.bvhbind = null;
        this.shadowbind = null;
        this.shadowbindDepth = null;
        this.stats = {
            tracems: 0,
            pixels: 0
        };
    }
}

export { GPURTShadows };

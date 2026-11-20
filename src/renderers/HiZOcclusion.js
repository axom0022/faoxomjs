import { HiZBuffer } from "./HiZBuffer.js";

const gdrwgsl = "struct cullparams {\n    viewproj: mat4x4<f32>,\n    prevviewproj: mat4x4<f32>,\n    planes: array<vec4<f32>, 6>,\n    params0: vec4<f32>,\n    params1: vec4<u32>,\n    params2: vec4<f32>,\n    params3: vec4<u32>,\n};\nstruct instancerecord {\n    matrix: mat4x4<f32>,\n    sphere: vec4<f32>,\n    batchindex: u32,\n    compvec4: u32,\n    region: u32,\n    pad0: u32,\n};\nstruct drawargs {\n    indexcount: u32,\n    instancecount: atomic<u32>,\n    firstindex: u32,\n    basevertex: u32,\n    firstinstance: u32,\n};\nstruct regionrecord {\n    sphere: vec4<f32>,\n    count: u32,\n    pad0: u32,\n    pad1: u32,\n    pad2: u32,\n};\n@group(0) @binding(0) var<uniform> cull: cullparams;\n@group(0) @binding(1) var<storage, read> instances: array<instancerecord>;\n@group(0) @binding(2) var<storage, read_write> args: array<drawargs>;\n@group(0) @binding(3) var<storage, read_write> compacted: array<vec4<f32>>;\n@group(0) @binding(4) var hiz: texture_2d<f32>;\n@group(0) @binding(5) var<storage, read_write> visibility: array<u32>;\n@group(0) @binding(6) var<storage, read_write> regionvisible: array<u32>;\n@group(0) @binding(7) var<storage, read_write> skipcounter: array<atomic<u32>>;\n@group(0) @binding(8) var<storage, read> regiondata: array<regionrecord>;\nfn frustumVisible(c: vec3<f32>, r: f32) -> bool {\n    var p = 0;\n    loop {\n        if (p >= 6) { break; }\n        var dist = dot(cull.planes[p].xyz, c) + cull.planes[p].w;\n        if (dist < -r) { return false; }\n        p = p + 1;\n    }\n    return true;\n}\nfn hizVisible(c: vec3<f32>, r: f32, margin: f32) -> bool {\n    if (cull.params1.z == 0u) { return true; }\n    var m = cull.prevviewproj;\n    if (cull.params1.w == 1u) { m = cull.viewproj; }\n    var clip = m * vec4<f32>(c, 1.0);\n    if (clip.w <= 0.0001) { return true; }\n    var ndc = clip.xy / clip.w;\n    var z = clip.z / clip.w * 0.5 + 0.5;\n    var rscreen = r / clip.w;\n    var px = rscreen * 0.5 * max(cull.params0.x, cull.params0.y);\n    if (px < 1.0) { px = 1.0; }\n    var lvl = i32(ceil(log2(px)));\n    if (lvl < 0) { lvl = 0; }\n    var maxlvl = i32(cull.params0.z) - 1;\n    if (lvl > maxlvl) { lvl = maxlvl; }\n    var dims = vec2<f32>(textureDimensions(hiz, lvl));\n    var dix = i32(dims.x);\n    var diy = i32(dims.y);\n    var qx = i32(clamp((ndc.x * 0.5 + 0.5) * dims.x - 0.5, 0.0, f32(max(dix - 2, 0))));\n    var qy = i32(clamp((1.0 - (ndc.y * 0.5 + 0.5)) * dims.y - 0.5, 0.0, f32(max(diy - 2, 0))));\n    var x1 = min(qx + 1, dix - 1);\n    var y1 = min(qy + 1, diy - 1);\n    var s0 = textureLoad(hiz, vec2<i32>(qx, qy), lvl).r;\n    var s1 = textureLoad(hiz, vec2<i32>(x1, qy), lvl).r;\n    var s2 = textureLoad(hiz, vec2<i32>(qx, y1), lvl).r;\n    var s3 = textureLoad(hiz, vec2<i32>(x1, y1), lvl).r;\n    var scenez = max(max(s0, s1), max(s2, s3));\n    var znear = z - r * cull.params2.x / (clip.w * clip.w) - cull.params0.w;\n    return znear - margin <= scenez;\n}\n@compute @workgroup_size(64)\nfn cullmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var total = cull.params1.x;\n    if (gid.x >= total) { return; }\n    var rec = instances[gid.x];\n    var c = rec.sphere.xyz;\n    var r = rec.sphere.w;\n    var visible = frustumVisible(c, r);\n    if (visible && cull.params2.w == 1.0) {\n        if (regionvisible[rec.region] != u32(cull.params2.y)) {\n            visible = false;\n            atomicAdd(&skipcounter[0], 1u);\n        }\n    }\n    if (visible) {\n        var margin = 0.0;\n        if (cull.params1.w == 1u && visibility[gid.x] == cull.params3.y) { margin = cull.params2.z; }\n        if (!hizVisible(c, r, margin)) { visible = false; }\n    }\n    if (visible) {\n        var slot = atomicAdd(&args[rec.batchindex].instancecount, 1u);\n        var base = rec.compvec4;\n        compacted[base + slot * 4u] = rec.matrix[0];\n        compacted[base + slot * 4u + 1u] = rec.matrix[1];\n        compacted[base + slot * 4u + 2u] = rec.matrix[2];\n        compacted[base + slot * 4u + 3u] = rec.matrix[3];\n        if (cull.params1.w == 1u) { visibility[gid.x] = u32(cull.params2.y); }\n    }\n}\n@compute @workgroup_size(64)\nfn regionmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    if (gid.x >= cull.params3.x) { return; }\n    var reg = regiondata[gid.x];\n    if (frustumVisible(reg.sphere.xyz, reg.sphere.w) && hizVisible(reg.sphere.xyz, reg.sphere.w, 0.0)) {\n        regionvisible[gid.x] = u32(cull.params2.y);\n    }\n}\n@compute @workgroup_size(64)\nfn occlmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var total = cull.params1.x;\n    if (gid.x >= total) { return; }\n    if (visibility[gid.x] != cull.params3.y) { return; }\n    var rec = instances[gid.x];\n    if (!frustumVisible(rec.sphere.xyz, rec.sphere.w)) { return; }\n    var slot = atomicAdd(&args[rec.batchindex].instancecount, 1u);\n    var base = rec.compvec4;\n    compacted[base + slot * 4u] = rec.matrix[0];\n    compacted[base + slot * 4u + 1u] = rec.matrix[1];\n    compacted[base + slot * 4u + 2u] = rec.matrix[2];\n    compacted[base + slot * 4u + 3u] = rec.matrix[3];\n}\n";

class HiZOcclusion {
    constructor(zatia) {
        this.renderer = zatia;
        this.device = zatia.device;
        this.width = 0;
        this.height = 0;
        this.depthTexture = null;
        this.depthView = null;
        this.hiz = null;
        this.module = null;
        this.occlpipeline = null;
        this.regionpipeline = null;
        this.occluderargs = null;
        this.occludercompacted = null;
        this.occluderargscapacity = 0;
        this.occludercompactedcapacity = 0;
        this.visibility = null;
        this.visibilitycapacity = 0;
        this.regiondata = null;
        this.regionvisible = null;
        this.skipcounter = null;
        this.regioncapacity = 0;
        this.occludermodel = null;
        this.depthpipelines = null;
        this.depthbinds = null;
        this.stamp = 0;
        this.prevstamp = 0;
        this.grown = false;
    }
    ensurePipelines() {
        if (this.occlpipeline) return;
        this.module = this.device.createShaderModule({
            code: gdrwgsl
        });
        this.occlpipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.module,
                entryPoint: "occlmain"
            }
        });
        this.regionpipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.module,
                entryPoint: "regionmain"
            }
        });
        this.occludermodel = this.device.createBuffer({
            size: 288,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zatia = new Float32Array(72);
        zatia[0] = 1;
        zatia[5] = 1;
        zatia[10] = 1;
        zatia[15] = 1;
        zatia[16] = 1;
        zatia[21] = 1;
        zatia[26] = 1;
        zatia[31] = 1;
        zatia[50] = 1;
        this.device.queue.writeBuffer(this.occludermodel, 0, zatia);
        this.depthpipelines = new Map;
        this.depthbinds = new Map;
    }
    nextStamp() {
        this.prevstamp = this.stamp;
        this.stamp = this.stamp + 1;
        if (this.stamp > 4294967040) {
            this.stamp = 1;
            this.prevstamp = 0;
            this.grown = true;
        }
        if (this.grown) {
            this.resetState();
            this.grown = false;
        }
        return this.stamp;
    }
    resetState() {
        if (this.visibility) this.device.queue.writeBuffer(this.visibility, 0, new Uint32Array(Math.max(1, this.visibility.size >> 2)));
        if (this.regionvisible) this.device.queue.writeBuffer(this.regionvisible, 0, new Uint32Array(Math.max(1, this.regionvisible.size >> 2)));
        this.prevstamp = 0;
    }
    resize(zatia, zatib) {
        zatia = Math.max(1, Math.floor(zatia || 1));
        zatib = Math.max(1, Math.floor(zatib || 1));
        if (zatia === this.width && zatib === this.height && this.depthTexture) return;
        this.width = zatia;
        this.height = zatib;
        if (this.depthTexture) this.depthTexture.destroy();
        if (this.hiz) this.hiz.dispose();
        this.depthTexture = this.device.createTexture({
            size: [ zatia, zatib, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.depthView = this.depthTexture.createView();
        this.hiz = new HiZBuffer(this.device, zatia, zatib);
    }
    ensureAuxBuffers(zatia) {
        var zatib = Math.max(16, zatia * 4);
        if (this.visibilitycapacity < zatib) {
            if (this.visibility) this.visibility.destroy();
            this.visibilitycapacity = zatib;
            this.visibility = this.device.createBuffer({
                size: zatib,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
            this.grown = true;
        }
        if (!this.skipcounter) this.skipcounter = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        if (!this.regionvisible) this.regionvisible = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
    }
    ensureOccluderBuffers(zatia, zatib) {
        this.ensurePipelines();
        var zatic = Math.max(256, zatib * 20);
        if (this.occluderargscapacity < zatic) {
            if (this.occluderargs) this.occluderargs.destroy();
            this.occluderargscapacity = zatic;
            this.occluderargs = this.device.createBuffer({
                size: zatic,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
        }
        if (this.occludercompactedcapacity < zatia) {
            if (this.occludercompacted) this.occludercompacted.destroy();
            this.occludercompactedcapacity = zatia;
            this.occludercompacted = this.device.createBuffer({
                size: Math.max(256, zatia),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
        }
    }
    ensureRegionBuffers(zatia) {
        var zatib = Math.max(16, zatia * 32);
        if (this.regioncapacity < zatib) {
            if (this.regiondata) this.regiondata.destroy();
            if (this.regionvisible) this.regionvisible.destroy();
            this.regioncapacity = zatib;
            this.regiondata = this.device.createBuffer({
                size: zatib,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.regionvisible = this.device.createBuffer({
                size: Math.max(16, zatia * 4),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
            return true;
        }
        return false;
    }
    writeOccluderArgs(zatia) {
        var zatib = zatia.length;
        var zatic = new Uint32Array(Math.max(5, zatib * 5));
        for (var zatid = 0; zatid < zatib; zatid++) {
            zatic[zatid * 5] = zatia[zatid];
            zatic[zatid * 5 + 1] = 0;
            zatic[zatid * 5 + 2] = 0;
            zatic[zatid * 5 + 3] = 0;
            zatic[zatid * 5 + 4] = 0;
        }
        this.device.queue.writeBuffer(this.occluderargs, 0, zatic);
    }
    writeSkipCounter() {
        this.device.queue.writeBuffer(this.skipcounter, 0, new Uint32Array(4));
    }
    occluderBind(zatia) {
        return this.device.createBindGroup({
            layout: this.occlpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: zatia.culluniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: zatia.instancebuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.occluderargs
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.occludercompacted
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.visibility
                }
            } ]
        });
    }
    dispatchOccluderBuild(zatia, zatib) {
        var zatic = zatia.beginComputePass();
        zatic.setPipeline(this.occlpipeline);
        zatic.setBindGroup(0, this.occluderBind(zatib));
        zatic.dispatchWorkgroups(Math.ceil(zatib.totalInstances / 64));
        zatic.end();
    }
    depthPipelineFor(zatia, zatib) {
        var zatic = (zatib && zatib.type ? zatib.type : "material") + "|" + (zatib && (zatib.side === 2 || zatib.side === "double") ? "double" : "front");
        var zatid = this.depthpipelines.get(zatic);
        if (zatid) return zatid;
        var zatie = zatia.shader("");
        var zatif = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: zatie,
                entryPoint: "vertexMain",
                buffers: zatia.megaVertexBuffers("", [ {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    } ]
                }, {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 1,
                        offset: 0,
                        format: "float32x3"
                    } ]
                }, {
                    arrayStride: 8,
                    attributes: [ {
                        shaderLocation: 2,
                        offset: 0,
                        format: "float32x2"
                    } ]
                }, {
                    arrayStride: 32,
                    attributes: [ {
                        shaderLocation: 3,
                        offset: 0,
                        format: "uint32x4"
                    }, {
                        shaderLocation: 4,
                        offset: 16,
                        format: "float32x4"
                    } ]
                }, {
                    arrayStride: 48,
                    attributes: [ {
                        shaderLocation: 5,
                        offset: 0,
                        format: "float32x3"
                    }, {
                        shaderLocation: 6,
                        offset: 12,
                        format: "float32x3"
                    }, {
                        shaderLocation: 7,
                        offset: 24,
                        format: "float32x3"
                    }, {
                        shaderLocation: 8,
                        offset: 36,
                        format: "float32x3"
                    } ]
                }, {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 9,
                        offset: 0,
                        format: "float32x3"
                    } ]
                }, {
                    arrayStride: 64,
                    stepMode: "instance",
                    attributes: [ {
                        shaderLocation: 10,
                        offset: 0,
                        format: "float32x4"
                    }, {
                        shaderLocation: 11,
                        offset: 16,
                        format: "float32x4"
                    }, {
                        shaderLocation: 12,
                        offset: 32,
                        format: "float32x4"
                    }, {
                        shaderLocation: 13,
                        offset: 48,
                        format: "float32x4"
                    } ]
                } ])
            },
            primitive: {
                topology: "triangle-list",
                cullMode: zatib && (zatib.side === 2 || zatib.side === "double") ? "none" : "back"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.depthpipelines.set(zatic, zatif);
        return zatif;
    }
    depthBindsFor(zatia, zatib) {
        var zatic = zatia.resourceManager.boneResource(null);
        return {
            camera: this.device.createBindGroup({
                layout: zatib.getBindGroupLayout(0),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: zatia.cameraBuffer
                    }
                } ]
            }),
            model: this.device.createBindGroup({
                layout: zatib.getBindGroupLayout(1),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.occludermodel
                    }
                } ]
            }),
            bone: this.device.createBindGroup({
                layout: zatib.getBindGroupLayout(2),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: zatic.buffer
                    }
                } ]
            })
        };
    }
    renderOccluders(zatia, zatib, zatic) {
        var zatid = zatia.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.depthView,
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        for (var zatie = 0; zatie < zatic.length; zatie++) {
            var zatif = zatic[zatie];
            var zatig = zatif.sample;
            var zatih = zatif.material;
            var zatii = this.depthPipelineFor(zatib, zatih);
            var zatij = this.depthBindsFor(zatib, zatii);
            var zatik = zatib.attribute(zatig, "position", 3, [ 0, 0, 0 ]);
            var zatil = zatib.attribute(zatig, "normal", 3, [ 0, 1, 0 ]);
            var zatim = zatib.attribute(zatig, "uv", 2, [ 0, 0 ]);
            var zatin = zatib.attribute(zatig, "color", 3, [ 1, 1, 1 ]);
            var zatio = zatib.resourceManager.buffer(zatik, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zatip = zatib.resourceManager.buffer(zatil, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zatiq = zatib.resourceManager.buffer(zatim, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zatir = zatib.resourceManager.buffer(zatin, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zatis = zatik.array.length / zatik.itemSize;
            var zatit = zatib.skinPackFor(zatif.geometry, zatif.geometry.attributes.skinIndex, zatif.geometry.attributes.skinWeight, zatis);
            var zatiu = zatib.resourceManager.buffer(zatit, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zativ = zatib.morphPackFor(zatif.geometry, zatis);
            var zatiw = zatib.resourceManager.buffer(zativ, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zatix = zatif.geometry.index;
            var zatiy = zatib.resourceManager.buffer({
                array: zatix
            }, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
            zatid.setPipeline(zatii);
            zatid.setBindGroup(0, zatij.camera);
            zatid.setBindGroup(1, zatij.model);
            zatid.setBindGroup(2, zatij.bone);
            zatid.setVertexBuffer(0, zatio);
            zatid.setVertexBuffer(1, zatip);
            zatid.setVertexBuffer(2, zatiq);
            zatid.setVertexBuffer(3, zatiu);
            zatid.setVertexBuffer(4, zatiw);
            zatid.setVertexBuffer(5, zatir);
            zatid.setVertexBuffer(6, this.occludercompacted, zatif.compoffset);
            zatid.setIndexBuffer(zatiy, zatix instanceof Uint32Array ? "uint32" : "uint16");
            zatid.drawIndexedIndirect(this.occluderargs, zatif.argsoffset);
        }
        zatid.end();
    }
    buildPyramid(zatia) {
        if (this.hiz && this.depthView) this.hiz.build(zatia, this.depthView);
    }
    regionBind(zatia) {
        return this.device.createBindGroup({
            layout: this.regionpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: zatia.culluniform
                }
            }, {
                binding: 4,
                resource: this.hiz.fullview
            }, {
                binding: 6,
                resource: {
                    buffer: this.regionvisible
                }
            }, {
                binding: 8,
                resource: {
                    buffer: this.regiondata
                }
            } ]
        });
    }
    dispatchRegions(zatia, zatib, zatic) {
        zatia.setPipeline(this.regionpipeline);
        zatia.setBindGroup(0, this.regionBind(zatib));
        zatia.dispatchWorkgroups(Math.ceil(zatic / 64));
    }
    dispose() {
        if (this.depthTexture) this.depthTexture.destroy();
        if (this.hiz) this.hiz.dispose();
        if (this.occluderargs) this.occluderargs.destroy();
        if (this.occludercompacted) this.occludercompacted.destroy();
        if (this.visibility) this.visibility.destroy();
        if (this.regiondata) this.regiondata.destroy();
        if (this.regionvisible) this.regionvisible.destroy();
        if (this.skipcounter) this.skipcounter.destroy();
        if (this.occludermodel) this.occludermodel.destroy();
        this.depthTexture = null;
        this.hiz = null;
        this.occluderargs = null;
        this.occludercompacted = null;
        this.visibility = null;
        this.regiondata = null;
        this.regionvisible = null;
        this.skipcounter = null;
        this.occludermodel = null;
        this.depthpipelines = null;
        this.depthbinds = null;
        this.occluderargscapacity = 0;
        this.occludercompactedcapacity = 0;
        this.visibilitycapacity = 0;
        this.regioncapacity = 0;
        this.stamp = 0;
        this.prevstamp = 0;
    }
}

export { HiZOcclusion, gdrwgsl };

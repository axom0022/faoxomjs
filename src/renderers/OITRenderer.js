import { Color, Matrix4 } from "../math/index.js";

class OITRenderer {
    constructor(zatka, zatkb) {
        zatkb = zatkb || {};
        this.renderer = zatka;
        if (!zatka || !zatka.device) throw new Error("OITRenderer requires an initialized WebGPU renderer");
        var zatkc = zatka.device;
        this.width = Math.max(1, Math.floor(zatkb.width === undefined ? 192 : zatkb.width));
        this.height = Math.max(1, Math.floor(zatkb.height === undefined ? 192 : zatkb.height));
        this.nodeCapacity = Math.max(8, Math.floor(zatkb.nodeCapacity === undefined ? 65536 : zatkb.nodeCapacity));
        this.far = Math.max(1, zatkb.far === undefined ? 100 : zatkb.far);
        this.SENTINEL = 4294967295;
        this.objects = [];
        this.stats = {
            fragments: 0,
            overflow: 0,
            coveredPixels: 0
        };
        this.nodeStride = 32;
        this.nodeBuffer = zatkc.createBuffer({
            size: this.nodeCapacity * this.nodeStride,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        this.headBuffer = zatkc.createBuffer({
            size: this.width * this.height * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.counterBuffer = zatkc.createBuffer({
            size: 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.counterStaging = zatkc.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        this.cameraBuffer = zatkc.createBuffer({
            size: 144,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.sentinelFill = new Uint32Array(this.width * this.height).fill(this.SENTINEL);
        this.internalDepth = zatkc.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.compositeTexture = zatkc.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        this.opaqueSampler = zatkc.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.depthCompareSampler = zatkc.createSampler({
            compare: "less",
            magFilter: "nearest",
            minFilter: "nearest"
        });
        this.dummyDepth = zatkc.createTexture({
            size: [ 1, 1, 1 ],
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        var zatkd = zatkc.createCommandEncoder();
        var zatke = zatkd.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.dummyDepth.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        zatke.end();
        zatkc.queue.submit([ zatkd.finish() ]);
        this.buildPipelines();
    }
    buildPipelines() {
        var zatka = this.renderer.device;
        var zatkb = "struct Camera { viewProjection: mat4x4<f32>, view: mat4x4<f32>, params: vec4<f32> }; struct Model { model: mat4x4<f32>, color: vec4<f32> }; struct FragmentNode { color: vec4<f32>, viewZ: f32, next: u32, aux: u32 }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var<storage, read_write> nodes: array<FragmentNode>; @group(0) @binding(2) var<storage, read_write> heads: array<atomic<u32>>; @group(0) @binding(3) var<storage, read_write> counter: atomic<u32>; @group(0) @binding(4) var sceneDepth: texture_depth_2d; @group(0) @binding(5) var depthCompareSampler: sampler_comparison; @group(1) @binding(0) var<uniform> modelData: Model; struct VOut { @builtin(position) position: vec4<f32>, @location(0) viewZ: f32, @location(1) depth01: f32 }; @vertex fn insertVertex(@location(0) position: vec3<f32>) -> VOut { var output: VOut; let world = modelData.model * vec4<f32>(position, 1.0); let viewPosition = camera.view * world; output.viewZ = viewPosition.z; var clip = camera.viewProjection * world; clip.z = clip.z * 0.5 + clip.w * 0.5; output.depth01 = clip.z / clip.w; output.position = clip; return output; } @fragment fn insertFragment(input: VOut) { let alpha = clamp(modelData.color.a, 0.0, 1.0); if (alpha <= 0.0) { discard; } let depthUv = input.position.xy / vec2<f32>(camera.params.x, camera.params.y); let depthVisible = textureSampleCompareLevel(sceneDepth, depthCompareSampler, depthUv, input.depth01); if (depthVisible < 0.5) { discard; } let pixel = u32(input.position.x) + u32(input.position.y) * u32(camera.params.x); let node = atomicAdd(&counter, 1u); if (node >= u32(camera.params.w)) { discard; } nodes[node].color = vec4<f32>(modelData.color.rgb * alpha, alpha); nodes[node].viewZ = input.viewZ; nodes[node].aux = 0u; nodes[node].next = atomicExchange(&heads[pixel], node); }";
        this.insertModule = zatka.createShaderModule({
            code: zatkb
        });
        this.insertPipeline = zatka.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.insertModule,
                entryPoint: "insertVertex",
                buffers: [ {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    } ]
                } ]
            },
            fragment: {
                module: this.insertModule,
                entryPoint: "insertFragment",
                targets: []
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: false,
                depthCompare: "less"
            }
        });
        var zatkc = "struct Camera { viewProjection: mat4x4<f32>, view: mat4x4<f32>, params: vec4<f32> }; struct FragmentNode { color: vec4<f32>, viewZ: f32, next: u32, aux: u32 }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var<storage, read> nodes: array<FragmentNode>; @group(0) @binding(2) var<storage, read> heads: array<u32>; @group(0) @binding(3) var opaqueTexture: texture_2d<f32>; @group(0) @binding(4) var opaqueSampler: sampler; struct ROut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn resolveVertex(@builtin(vertex_index) vertexIndex: u32) -> ROut { var output: ROut; var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); let p = positions[vertexIndex]; output.position = vec4<f32>(p, 0.0, 1.0); output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return output; } @fragment fn resolveFragment(input: ROut) -> @location(0) vec4<f32> { let pixel = u32(input.position.x) + u32(input.position.y) * u32(camera.params.x); let opaque = textureSampleLevel(opaqueTexture, opaqueSampler, input.uv, 0.0); var sumColor = vec3<f32>(0.0, 0.0, 0.0); var sumWeight = 0.0; var revealage = 1.0; var idx = heads[pixel]; var guard = 0u; while (idx != 4294967295u && guard <= u32(camera.params.w)) { let node = nodes[idx]; let depth01 = clamp(-node.viewZ / camera.params.z, 0.0, 1.0); let weight = max(0.0001, pow(1.0 - depth01, 8.0)); sumColor = sumColor + node.color.rgb * weight; sumWeight = sumWeight + node.color.a * weight; revealage = revealage * (1.0 - node.color.a); idx = node.next; guard = guard + 1u; } if (sumWeight <= 0.0) { return opaque; } let avgColor = sumColor / sumWeight; let outColor = opaque.rgb * revealage + avgColor * (1.0 - revealage); return vec4<f32>(outColor, 1.0); }";
        this.resolveModule = zatka.createShaderModule({
            code: zatkc
        });
        this.resolvePipeline = zatka.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.resolveModule,
                entryPoint: "resolveVertex"
            },
            fragment: {
                module: this.resolveModule,
                entryPoint: "resolveFragment",
                targets: [ {
                    format: "rgba8unorm"
                } ]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
        this.resolveLayout = this.resolvePipeline.getBindGroupLayout(0);
        this.insertLayout = this.insertPipeline.getBindGroupLayout(0);
    }
    add(zatka) {
        if (!zatka || !zatka.geometry || !zatka.geometry.attributes || !zatka.geometry.attributes.position) throw new Error("OITRenderer.add requires an object with a position attribute");
        var zatkb = {
            source: zatka,
            geometry: zatka.geometry,
            matrix: zatka.matrixWorld instanceof Matrix4 ? zatka.matrixWorld : null,
            color: new Color(zatka.color !== undefined ? zatka.color : zatka.material && zatka.material.color !== undefined ? zatka.material.color : 16777215),
            opacity: zatka.opacity !== undefined ? zatka.opacity : zatka.material && zatka.material.opacity !== undefined ? zatka.material.opacity : 1,
            buffer: null,
            vertexBuffer: null,
            indexBuffer: null,
            vertexCount: 0,
            indexCount: 0,
            version: -1,
            bindGroup: null
        };
        this.objects.push(zatkb);
        return this;
    }
    remove(zatka) {
        for (var zatkb = 0; zatkb < this.objects.length; zatkb++) if (this.objects[zatkb].source === zatka || this.objects[zatkb] === zatka) {
            this.objects.splice(zatkb, 1);
            return this;
        }
        return this;
    }
    clear() {
        this.objects = [];
        return this;
    }
    resize(zatka, zatkb) {
        var zatkc = Math.max(1, Math.floor(zatka)), zatkd = Math.max(1, Math.floor(zatkb));
        if (zatkc === this.width && zatkd === this.height) return this;
        this.width = zatkc;
        this.height = zatkd;
        var zatke = this.renderer.device;
        this.headBuffer.destroy();
        this.headBuffer = zatke.createBuffer({
            size: this.width * this.height * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.sentinelFill = new Uint32Array(this.width * this.height).fill(this.SENTINEL);
        this.internalDepth.destroy();
        this.internalDepth = zatke.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.compositeTexture.destroy();
        this.compositeTexture = zatke.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        return this;
    }
    uploadObject(zatka, zatkb) {
        var zatkc = zatkb.geometry;
        var zatkd = zatkc.version === undefined ? 0 : zatkc.version;
        if (zatkb.version === zatkd && zatkb.vertexBuffer) return zatkb;
        var zatke = zatkc.attributes.position.array;
        if (zatkb.vertexBuffer) zatkb.vertexBuffer.destroy();
        if (zatkb.indexBuffer) {
            zatkb.indexBuffer.destroy();
            zatkb.indexBuffer = null;
        }
        zatkb.vertexBuffer = zatka.createBuffer({
            size: Math.max(16, zatke.byteLength),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        zatka.queue.writeBuffer(zatkb.vertexBuffer, 0, zatke);
        zatkb.vertexCount = zatke.length / 3;
        zatkb.indexCount = 0;
        if (zatkc.index && zatkc.index.length) {
            var zatkf = zatkc.index instanceof Uint32Array || zatkc.index instanceof Uint16Array ? zatkc.index : new Uint16Array(zatkc.index);
            var zatkg = zatkf instanceof Uint32Array ? zatkf : new Uint32Array(zatkf);
            zatkb.indexBuffer = zatka.createBuffer({
                size: Math.max(16, zatkg.byteLength),
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            zatka.queue.writeBuffer(zatkb.indexBuffer, 0, zatkg);
            zatkb.indexCount = zatkg.length;
        }
        if (!zatkb.buffer) zatkb.buffer = zatka.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        zatkb.version = zatkd;
        return zatkb;
    }
    writeModel(zatka) {
        var zatkb = new Float32Array(20);
        if (zatka.matrix) zatkb.set(zatka.matrix.elements, 0); else {
            zatkb[0] = 1;
            zatkb[5] = 1;
            zatkb[10] = 1;
            zatkb[15] = 1;
        }
        zatkb[16] = zatka.color.r;
        zatkb[17] = zatka.color.g;
        zatkb[18] = zatka.color.b;
        zatkb[19] = zatka.opacity === undefined ? 1 : zatka.opacity;
        this.renderer.device.queue.writeBuffer(zatka.buffer, 0, zatkb);
        return this;
    }
    render(zatka, zatkb, zatkc) {
        var zatkd = this.renderer.device;
        if (!zatkc || !zatkc.projectionMatrix || !zatkc.matrixWorldInverse) throw new Error("OITRenderer.render requires a camera");
        var zatke = zatkb ? zatkb instanceof GPUTexture ? zatkb.createView() : zatkb : this.dummyDepth.createView();
        var zatkf = (new Matrix4).multiplyMatrices(zatkc.projectionMatrix, zatkc.matrixWorldInverse);
        var zatkg = new Float32Array(36);
        zatkg.set(zatkf.elements, 0);
        zatkg.set(zatkc.matrixWorldInverse.elements, 16);
        zatkg[32] = this.width;
        zatkg[33] = this.height;
        zatkg[34] = this.far;
        zatkg[35] = this.nodeCapacity;
        zatkd.queue.writeBuffer(this.cameraBuffer, 0, zatkg);
        zatkd.queue.writeBuffer(this.headBuffer, 0, this.sentinelFill);
        zatkd.queue.writeBuffer(this.counterBuffer, 0, new Uint32Array(1));
        var zatkh = zatkd.createBindGroup({
            layout: this.insertLayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.cameraBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.nodeBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.headBuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.counterBuffer
                }
            }, {
                binding: 4,
                resource: zatke
            }, {
                binding: 5,
                resource: this.depthCompareSampler
            } ]
        });
        var zatki = zatkd.createCommandEncoder();
        var zatkj = zatki.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.internalDepth.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        zatkj.setPipeline(this.insertPipeline);
        zatkj.setBindGroup(0, zatkh);
        for (var zatkk = 0; zatkk < this.objects.length; zatkk++) {
            var zatkl = this.uploadObject(zatkd, this.objects[zatkk]);
            if (!zatkl.vertexCount) continue;
            this.writeModel(zatkl);
            if (!zatkl.bindGroup) zatkl.bindGroup = zatkd.createBindGroup({
                layout: this.insertPipeline.getBindGroupLayout(1),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: zatkl.buffer
                    }
                } ]
            });
            zatkj.setBindGroup(1, zatkl.bindGroup);
            zatkj.setVertexBuffer(0, zatkl.vertexBuffer);
            if (zatkl.indexBuffer) {
                zatkj.setIndexBuffer(zatkl.indexBuffer, "uint32");
                zatkj.drawIndexed(zatkl.indexCount);
            } else zatkj.draw(zatkl.vertexCount);
        }
        zatkj.end();
        var zatkm = zatkd.createBindGroup({
            layout: this.resolveLayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.cameraBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.nodeBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.headBuffer
                }
            }, {
                binding: 3,
                resource: zatka instanceof GPUTexture ? zatka.createView() : zatka
            }, {
                binding: 4,
                resource: this.opaqueSampler
            } ]
        });
        var zatkn = zatki.beginRenderPass({
            colorAttachments: [ {
                view: this.compositeTexture.createView(),
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
        zatkn.setPipeline(this.resolvePipeline);
        zatkn.setBindGroup(0, zatkm);
        zatkn.draw(3);
        zatkn.end();
        zatkd.queue.submit([ zatki.finish() ]);
        return this.compositeTexture;
    }
    async readStats() {
        var zatka = this.renderer.device;
        var zatkb = zatka.createCommandEncoder();
        zatkb.copyBufferToBuffer(this.counterBuffer, 0, this.counterStaging, 0, 4);
        zatka.queue.submit([ zatkb.finish() ]);
        await zatka.queue.onSubmittedWorkDone();
        await this.counterStaging.mapAsync(GPUMapMode.READ);
        var zatkc = new Uint32Array(this.counterStaging.getMappedRange())[0];
        this.counterStaging.unmap();
        this.stats.fragments = Math.min(zatkc, this.nodeCapacity);
        this.stats.overflow = zatkc > this.nodeCapacity ? zatkc - this.nodeCapacity : 0;
        return this.stats;
    }
    async readbackState() {
        var zatka = this.renderer.device;
        var zatkb = this.nodeCapacity * this.nodeStride;
        var zatkc = this.width * this.height * 4;
        var zatkd = zatka.createBuffer({
            size: zatkb + zatkc + 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zatke = zatka.createCommandEncoder();
        zatke.copyBufferToBuffer(this.nodeBuffer, 0, zatkd, 0, zatkb);
        zatke.copyBufferToBuffer(this.headBuffer, 0, zatkd, zatkb, zatkc);
        zatke.copyBufferToBuffer(this.counterBuffer, 0, zatkd, zatkb + zatkc, 4);
        zatka.queue.submit([ zatke.finish() ]);
        await zatka.queue.onSubmittedWorkDone();
        await zatkd.mapAsync(GPUMapMode.READ);
        var zatkf = new Uint8Array(zatkd.getMappedRange()).slice();
        zatkd.unmap();
        zatkd.destroy();
        var zatkg = new Uint32Array(zatkf.buffer, zatkb + zatkc, 1)[0];
        this.stats.fragments = Math.min(zatkg, this.nodeCapacity);
        this.stats.overflow = zatkg > this.nodeCapacity ? zatkg - this.nodeCapacity : 0;
        var zatkh = new Uint32Array(zatkf.buffer, 0, this.nodeCapacity * 8);
        var zatki = new Float32Array(zatkf.buffer, 0, this.nodeCapacity * 8);
        var zatkj = new Float32Array(this.nodeCapacity * 4);
        var zatkk = new Float32Array(this.nodeCapacity);
        var zatkl = new Uint32Array(this.nodeCapacity);
        for (var zatkm = 0; zatkm < this.nodeCapacity; zatkm++) {
            zatkj[zatkm * 4] = zatki[zatkm * 8];
            zatkj[zatkm * 4 + 1] = zatki[zatkm * 8 + 1];
            zatkj[zatkm * 4 + 2] = zatki[zatkm * 8 + 2];
            zatkj[zatkm * 4 + 3] = zatki[zatkm * 8 + 3];
            zatkk[zatkm] = zatki[zatkm * 8 + 4];
            zatkl[zatkm] = zatkh[zatkm * 8 + 5];
        }
        var zatkn = new Uint32Array(zatkf.buffer, zatkb, this.width * this.height);
        var zatko = 0;
        for (var zatkp = 0; zatkp < zatkn.length; zatkp++) if (zatkn[zatkp] !== this.SENTINEL) zatko++;
        this.stats.coveredPixels = zatko;
        return {
            counter: zatkg,
            colors: zatkj,
            viewZ: zatkk,
            next: zatkl,
            heads: zatkn,
            stats: this.stats
        };
    }
    async readPixels(zatka) {
        var zatkb = this.renderer.device;
        var zatkc = zatka || this.compositeTexture;
        var zatkd = Math.ceil(this.width * 4 / 256) * 256;
        var zatke = zatkb.createBuffer({
            size: zatkd * this.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zatkf = zatkb.createCommandEncoder();
        zatkf.copyTextureToBuffer({
            texture: zatkc
        }, {
            buffer: zatke,
            bytesPerRow: zatkd,
            rowsPerImage: this.height
        }, [ this.width, this.height, 1 ]);
        zatkb.queue.submit([ zatkf.finish() ]);
        await zatkb.queue.onSubmittedWorkDone();
        await zatke.mapAsync(GPUMapMode.READ);
        var zatkg = new Uint8Array(zatke.getMappedRange());
        var zatkh = new Uint8Array(this.width * 4 * this.height);
        for (var zatki = 0; zatki < this.height; zatki++) zatkh.set(zatkg.subarray(zatki * zatkd, zatki * zatkd + this.width * 4), zatki * this.width * 4);
        zatke.unmap();
        zatke.destroy();
        return zatkh;
    }
    dispose() {
        if (this.nodeBuffer) this.nodeBuffer.destroy();
        if (this.headBuffer) this.headBuffer.destroy();
        if (this.counterBuffer) this.counterBuffer.destroy();
        if (this.counterStaging) this.counterStaging.destroy();
        if (this.cameraBuffer) this.cameraBuffer.destroy();
        if (this.internalDepth) this.internalDepth.destroy();
        if (this.dummyDepth) this.dummyDepth.destroy();
        if (this.compositeTexture) this.compositeTexture.destroy();
        for (var zatka = 0; zatka < this.objects.length; zatka++) {
            var zatkb = this.objects[zatka];
            if (zatkb.buffer) zatkb.buffer.destroy();
            if (zatkb.vertexBuffer) zatkb.vertexBuffer.destroy();
            if (zatkb.indexBuffer) zatkb.indexBuffer.destroy();
        }
        this.nodeBuffer = null;
        this.headBuffer = null;
        this.counterBuffer = null;
        this.counterStaging = null;
        this.cameraBuffer = null;
        this.internalDepth = null;
        this.dummyDepth = null;
        this.compositeTexture = null;
        this.objects = [];
        return this;
    }
}

export { OITRenderer };

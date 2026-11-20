import { Matrix4, Vector3 } from "../math/index.js";

class VTSurface {
    constructor(zavia, zavib) {
        zavib = zavib || {};
        this.renderer = zavia;
        if (!zavia || !zavia.device) throw new Error("VTSurface requires an initialized WebGPU renderer");
        var zavic = zavia.device;
        this.vt = zavib.virtualTexture || null;
        this.shadowVT = zavib.shadowTexture || null;
        this.lightDirection = zavib.lightDirection instanceof Vector3 ? zavib.lightDirection.clone().normalize() : new Vector3(-.5, -1, -.3).normalize();
        this.shadowStrength = zavib.shadowStrength === undefined ? .8 : zavib.shadowStrength;
        this.lightExtent = zavib.lightExtent === undefined ? 8 : zavib.lightExtent;
        this.width = Math.max(1, Math.floor(zavib.width || 192));
        this.height = Math.max(1, Math.floor(zavib.height || 192));
        this.geometry = null;
        this.vertexCount = 0;
        this.feedbackWords = this.vt ? Math.ceil(this.vt.totalPages / 32) : 1;
        this.cameraBuffer = zavic.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.feedbackBuffer = zavic.createBuffer({
            size: this.feedbackWords * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.feedbackStaging = zavic.createBuffer({
            size: this.feedbackWords * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        this.feedbackTarget = zavic.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.feedbackDepth = zavic.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.buildPipelines();
    }
    buildPipelines() {
        var zavia = this.renderer.device;
        var zavib = this.vt;
        var zavic = zavib ? zavib.tableSize : 1;
        var zavid = zavib ? zavib.maxMip : 0;
        var zavie = zavib ? zavib.virtualSize : 1;
        var zavif = zavib ? zavib.pageSize : 1;
        var zavig = zavib ? zavib.totalPages : 1;
        var zavih = zavib ? zavib.pagesPerLayer : 1;
        var zavii = zavib ? zavib.mipBases.join(",") : "0";
        var zavij = zavib ? zavib.sampleWGSL("albedo", "albedoTable", "albedoTableSampler", "albedoAtlas", "albedoAtlasSampler", "vec4<f32>(0.5, 0.5, 0.5, 1.0)") : "";
        var zavik = this.shadowVT ? this.shadowVT.sampleWGSL("shadow", "shadowTable", "shadowTableSampler", "shadowAtlas", "shadowAtlasSampler", "vec4<f32>(0.0)") : "";
        var zavil = this.shadowVT ? zavik + " " : "";
        var zavim = this.shadowVT ? "@group(0) @binding(5) var shadowTable: texture_2d_array<f32>; @group(0) @binding(6) var shadowTableSampler: sampler; @group(0) @binding(7) var shadowAtlas: texture_2d<f32>; @group(0) @binding(8) var shadowAtlasSampler: sampler; " : "";
        var zavin = this.shadowVT ? "if (camera.params.x > 0.5) { let lightClip = camera.lightBasis * vec4<f32>(input.world, 1.0); let lightUv = vec2<f32>(lightClip.x * 0.5 + 0.5, 0.5 - lightClip.y * 0.5); let occlusion = shadowPage(lightUv, 0.0, 0.0); shade = shade * (1.0 - clamp(occlusion.r, 0.0, 1.0) * camera.params.y); } " : "";
        var zavio = "struct Camera { viewProjection: mat4x4<f32>, lightDirection: vec4<f32>, lightBasis: mat4x4<f32>, params: vec4<f32> }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var albedoTable: texture_2d_array<f32>; @group(0) @binding(2) var albedoTableSampler: sampler; @group(0) @binding(3) var albedoAtlas: texture_2d<f32>; @group(0) @binding(4) var albedoAtlasSampler: sampler; " + zavim + "struct VOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) world: vec3<f32> }; " + zavij + " " + zavil + " @vertex fn vertexMain(@location(0) position: vec3<f32>, @location(1) uv: vec2<f32>) -> VOut { var output: VOut; output.position = camera.viewProjection * vec4<f32>(position, 1.0); output.position.z = output.position.z * 0.5 + output.position.w * 0.5; output.uv = uv; output.world = position; return output; } @fragment fn fragmentMain(input: VOut) -> @location(0) vec4<f32> { var shade = 0.25; let dx = dpdx(input.world); let dy = dpdy(input.world); var n = cross(dx, dy); let nlen = length(n); if (nlen > 0.0000001) { n = n / nlen; let l = normalize(-camera.lightDirection.xyz); shade = 0.25 + 0.75 * max(dot(n, l), 0.0); } let tableMip = albedoTableMip(input.uv, " + zavie.toFixed(1) + ", " + zavif.toFixed(1) + ", " + zavid.toFixed(1) + "); var albedo = albedoPage(input.uv, 0.0, tableMip); " + zavin + " return vec4<f32>(albedo.rgb * shade, 1.0); }";
        this.shaderModule = zavia.createShaderModule({
            code: zavio
        });
        this.pipeline = zavia.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.shaderModule,
                entryPoint: "vertexMain",
                buffers: [ {
                    arrayStride: 20,
                    attributes: [ {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    }, {
                        shaderLocation: 1,
                        offset: 12,
                        format: "float32x2"
                    } ]
                } ]
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: "fragmentMain",
                targets: [ {
                    format: this.renderer.format
                } ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        var zavip = "struct Camera { viewProjection: mat4x4<f32>, lightDirection: vec4<f32>, lightBasis: mat4x4<f32>, params: vec4<f32> }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var<storage, read_write> feedback: array<atomic<u32>>; struct VOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) world: vec3<f32> }; @vertex fn vertexMain(@location(0) position: vec3<f32>, @location(1) uv: vec2<f32>) -> VOut { var output: VOut; output.position = camera.viewProjection * vec4<f32>(position, 1.0); output.position.z = output.position.z * 0.5 + output.position.w * 0.5; output.uv = uv; output.world = position; return output; } @fragment fn feedbackMain(input: VOut) -> @location(0) vec4<f32> { let dx = abs(dpdx(input.uv).x); let dy = abs(dpdy(input.uv).y); let density = max(max(dx, dy) * " + zavie.toFixed(1) + " / " + zavif.toFixed(1) + ", 0.000001); let m = clamp(floor(log2(density) + 0.5), 0.0, " + zavid.toFixed(1) + "); let side = max(floor(" + zavic.toFixed(1) + " / pow(2.0, m)), 1.0); let scaled = input.uv * vec2<f32>(side, side); let px = u32(clamp(floor(scaled.x), 0.0, side - 1.0)); let py = u32(clamp(floor(scaled.y), 0.0, side - 1.0)); let mipBases = array<u32, " + Math.max(1, zavib ? zavib.mipCount : 1) + ">(" + zavii + "); let mb = mipBases[u32(m)]; let id = 0u * " + zavih + "u + mb + py * u32(side) + px; atomicOr(&feedback[id / 32u], 1u << (id % 32u)); return vec4<f32>(0.0, 0.0, 0.0, 0.0); }";
        this.feedbackModule = zavia.createShaderModule({
            code: zavip
        });
        this.feedbackPipeline = zavia.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.feedbackModule,
                entryPoint: "vertexMain",
                buffers: [ {
                    arrayStride: 20,
                    attributes: [ {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    }, {
                        shaderLocation: 1,
                        offset: 12,
                        format: "float32x2"
                    } ]
                } ]
            },
            fragment: {
                module: this.feedbackModule,
                entryPoint: "feedbackMain",
                targets: [ {
                    format: "rgba8unorm",
                    writeMask: 0
                } ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.bindGroup = null;
        this.feedbackBindGroup = null;
    }
    setGeometry(zavia) {
        var zavib = this.renderer.device;
        var zavic = zavia.attributes.position, zavid = zavia.attributes.uv;
        if (!zavic || !zavic.array || !zavid || !zavid.array) throw new Error("VTSurface geometry needs position and uv attributes");
        var zavie = new Float32Array(zavic.array.length / 3 * 5);
        var zavif = zavic.array.length / 3;
        for (var zavig = 0; zavig < zavif; zavig++) {
            zavie[zavig * 5] = zavic.array[zavig * 3];
            zavie[zavig * 5 + 1] = zavic.array[zavig * 3 + 1];
            zavie[zavig * 5 + 2] = zavic.array[zavig * 3 + 2];
            zavie[zavig * 5 + 3] = zavid.array[zavig * 2];
            zavie[zavig * 5 + 4] = zavid.array[zavig * 2 + 1];
        }
        this.geometry = zavia;
        this.vertexCount = zavif;
        this.vertexBuffer = zavib.createBuffer({
            size: Math.max(16, zavie.byteLength),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        zavib.queue.writeBuffer(this.vertexBuffer, 0, zavie);
        if (zavia.index && zavia.index.length) {
            var zavih = zavia.index instanceof Uint32Array || zavia.index instanceof Uint16Array ? zavia.index : new Uint16Array(zavia.index);
            var zavii = zavih instanceof Uint32Array ? zavih : new Uint32Array(zavih);
            this.indexCount = zavii.length;
            this.indexBuffer = zavib.createBuffer({
                size: Math.max(16, zavii.byteLength),
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            zavib.queue.writeBuffer(this.indexBuffer, 0, zavii);
        } else {
            this.indexBuffer = null;
            this.indexCount = 0;
        }
        return this;
    }
    lightBasisMatrix() {
        var zavia = this.lightDirection.clone().normalize();
        var zavib = zavia.clone().negate();
        var zavic = Math.abs(zavib.y) > .9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        var zavid = (new Vector3).crossVectors(zavic, zavib).normalize();
        var zavie = (new Vector3).crossVectors(zavib, zavid).normalize();
        var zavif = new Vector3(0, 0, 0);
        var zavig = zavif.clone().addScaledVector(zavib, 20);
        var zavih = (new Matrix4).lookAt(zavig, zavif, zavie).invert();
        var zavii = this.lightExtent;
        var zavij = (new Matrix4).makeOrthographic(-zavii, zavii, zavii, -zavii, .1, 40);
        return (new Matrix4).multiplyMatrices(zavij, zavih);
    }
    writeCamera(zavia) {
        var zavib = new Float32Array(64);
        var zavic = zavia.isMatrix4 ? zavia : zavia.viewProjection ? zavia.viewProjection : (new Matrix4).multiplyMatrices(zavia.projectionMatrix, zavia.matrixWorldInverse);
        zavib.set(zavic.elements, 0);
        zavib[16] = this.lightDirection.x;
        zavib[17] = this.lightDirection.y;
        zavib[18] = this.lightDirection.z;
        zavib[19] = 0;
        zavib.set(this.lightBasisMatrix().elements, 20);
        zavib[36] = this.shadowVT ? 1 : 0;
        zavib[37] = this.shadowStrength;
        this.renderer.device.queue.writeBuffer(this.cameraBuffer, 0, zavib);
        return this;
    }
    ensureBindGroups() {
        var zavia = this.renderer.device;
        if (this.bindGroup || !this.vt) return this;
        var zavib = [ {
            binding: 0,
            resource: {
                buffer: this.cameraBuffer
            }
        }, {
            binding: 1,
            resource: this.vt.tableView
        }, {
            binding: 2,
            resource: this.vt.tableSampler
        }, {
            binding: 3,
            resource: this.vt.atlasView
        }, {
            binding: 4,
            resource: this.vt.atlasSampler
        } ];
        if (this.shadowVT) zavib.push({
            binding: 5,
            resource: this.shadowVT.tableView
        }, {
            binding: 6,
            resource: this.shadowVT.tableSampler
        }, {
            binding: 7,
            resource: this.shadowVT.atlasView
        }, {
            binding: 8,
            resource: this.shadowVT.atlasSampler
        });
        this.bindGroup = zavia.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: zavib
        });
        this.feedbackBindGroup = zavia.createBindGroup({
            layout: this.feedbackPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.cameraBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.feedbackBuffer
                }
            } ]
        });
        return this;
    }
    setShadowTexture(zavia) {
        this.shadowVT = zavia || null;
        this.bindGroup = null;
        this.buildPipelines();
        return this;
    }
    renderToTexture(zavia) {
        var zavib = this.renderer.device;
        var zavic = zavib.createTexture({
            size: [ this.width, this.height, 1 ],
            format: this.renderer.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        var zavid = zavib.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.ensureBindGroups();
        this.writeCamera(zavia);
        var zavie = zavib.createCommandEncoder();
        var zavif = zavie.beginRenderPass({
            colorAttachments: [ {
                view: zavic.createView(),
                clearValue: {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 1
                },
                loadOp: "clear",
                storeOp: "store"
            } ],
            depthStencilAttachment: {
                view: zavid.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        this.encodeDraw(zavif);
        zavif.end();
        zavib.queue.submit([ zavie.finish() ]);
        zavid.destroy();
        return zavic;
    }
    encodeDraw(zavia) {
        zavia.setPipeline(this.pipeline);
        zavia.setBindGroup(0, this.bindGroup);
        zavia.setVertexBuffer(0, this.vertexBuffer);
        if (this.indexBuffer) {
            zavia.setIndexBuffer(this.indexBuffer, "uint32");
            zavia.drawIndexed(this.indexCount);
        } else zavia.draw(this.vertexCount);
        return this;
    }
    async readPixels(zavia) {
        var zavib = this.renderer.device;
        var zavic = Math.ceil(this.width * 4 / 256) * 256;
        var zavid = zavib.createBuffer({
            size: zavic * this.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zavie = zavib.createCommandEncoder();
        zavie.copyTextureToBuffer({
            texture: zavia
        }, {
            buffer: zavid,
            bytesPerRow: zavic,
            rowsPerImage: this.height
        }, [ this.width, this.height, 1 ]);
        zavib.queue.submit([ zavie.finish() ]);
        await zavib.queue.onSubmittedWorkDone();
        await zavid.mapAsync(GPUMapMode.READ);
        var zavif = new Uint8Array(zavid.getMappedRange()).slice();
        zavid.unmap();
        zavid.destroy();
        return zavif;
    }
    collectFeedback(zavia) {
        var zavib = this.renderer.device;
        this.ensureBindGroups();
        this.writeCamera(zavia);
        zavib.queue.writeBuffer(this.feedbackBuffer, 0, new Uint32Array(this.feedbackWords));
        var zavic = zavib.createCommandEncoder();
        var zavid = zavic.beginRenderPass({
            colorAttachments: [ {
                view: this.feedbackTarget.createView(),
                clearValue: {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 1
                },
                loadOp: "clear",
                storeOp: "store"
            } ],
            depthStencilAttachment: {
                view: this.feedbackDepth.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        zavid.setPipeline(this.feedbackPipeline);
        zavid.setBindGroup(0, this.feedbackBindGroup);
        zavid.setVertexBuffer(0, this.vertexBuffer);
        if (this.indexBuffer) {
            zavid.setIndexBuffer(this.indexBuffer, "uint32");
            zavid.drawIndexed(this.indexCount);
        } else zavid.draw(this.vertexCount);
        zavid.end();
        zavic.copyBufferToBuffer(this.feedbackBuffer, 0, this.feedbackStaging, 0, this.feedbackWords * 4);
        zavib.queue.submit([ zavic.finish() ]);
        return this;
    }
    async readFeedback() {
        var zavia = this.renderer.device;
        await zavia.queue.onSubmittedWorkDone();
        await this.feedbackStaging.mapAsync(GPUMapMode.READ);
        var zavib = new Uint32Array(this.feedbackStaging.getMappedRange()).slice();
        this.feedbackStaging.unmap();
        return zavib;
    }
    dispose() {
        if (this.cameraBuffer) this.cameraBuffer.destroy();
        if (this.feedbackBuffer) this.feedbackBuffer.destroy();
        if (this.feedbackStaging) this.feedbackStaging.destroy();
        if (this.feedbackTarget) this.feedbackTarget.destroy();
        if (this.feedbackDepth) this.feedbackDepth.destroy();
        this.cameraBuffer = null;
        this.feedbackBuffer = null;
        this.feedbackStaging = null;
        this.feedbackTarget = null;
        this.feedbackDepth = null;
        return this;
    }
}

export { VTSurface };

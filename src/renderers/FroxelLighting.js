import { Color, Matrix4, Vector3 } from "../math/index.js";

class FroxelLighting {
    constructor(zassa, zassb) {
        zassb = zassb || {};
        this.renderer = zassa;
        if (!zassa || !zassa.device) throw new Error("FroxelLighting requires an initialized WebGPU renderer");
        var zassc = zassa.device;
        this.gridWidth = Math.max(4, Math.floor(zassb.gridWidth === undefined ? 160 : zassb.gridWidth));
        this.gridHeight = Math.max(4, Math.floor(zassb.gridHeight === undefined ? 90 : zassb.gridHeight));
        this.gridDepth = Math.max(4, Math.floor(zassb.gridDepth === undefined ? 64 : zassb.gridDepth));
        this.width = Math.max(1, Math.floor(zassb.width === undefined ? 192 : zassb.width));
        this.height = Math.max(1, Math.floor(zassb.height === undefined ? 192 : zassb.height));
        this.maxLights = Math.max(1, Math.floor(zassb.maxLights === undefined ? 8 : zassb.maxLights));
        this.density = zassb.density === undefined ? .02 : zassb.density;
        this.albedo = zassb.albedo === undefined ? .9 : zassb.albedo;
        this.phaseEccentricity = zassb.phaseEccentricity === undefined ? 0 : zassb.phaseEccentricity;
        this.temporalWeight = zassb.temporalWeight === undefined ? 0 : Math.min(.95, Math.max(0, zassb.temporalWeight));
        this.lights = [];
        this.currentSlot = 0;
        this.hasHistory = false;
        this.previousViewProjection = new Matrix4;
        this.stats = {
            frames: 0,
            lights: 0,
            froxels: this.gridWidth * this.gridHeight * this.gridDepth
        };
        this.computeParams = zassc.createBuffer({
            size: 192,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.lightBuffer = zassc.createBuffer({
            size: this.maxLights * 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.resolveParams = zassc.createBuffer({
            size: 96,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.froxelTextures = [];
        for (var zassd = 0; zassd < 2; zassd++) this.froxelTextures.push(zassc.createTexture({
            size: [ this.gridWidth, this.gridHeight, this.gridDepth ],
            dimension: "3d",
            format: "rgba32float",
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        }));
        this.compositeTexture = zassc.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        this.opaqueSampler = zassc.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.depthCompareSampler = zassc.createSampler({
            compare: "less-equal",
            magFilter: "nearest",
            minFilter: "nearest"
        });
        this.dummyDepth = zassc.createTexture({
            size: [ 1, 1, 1 ],
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        var zasse = zassc.createCommandEncoder();
        var zassf = zasse.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.dummyDepth.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        zassf.end();
        zassc.queue.submit([ zasse.finish() ]);
        this.buildPipelines();
    }
    buildPipelines() {
        var zassa = this.renderer.device;
        var zassb = this.maxLights;
        var zassc = "struct Params { invViewProjection: mat4x4<f32>, previousViewProjection: mat4x4<f32>, cameraPosition: vec4<f32>, lightParams: vec4<f32>, gridParams: vec4<f32>, mediaParams: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var<uniform> lights: array<vec4<f32>, " + zassb * 4 + ">; @group(0) @binding(2) var historyTexture: texture_3d<f32>; @group(0) @binding(3) var froxelTexture: texture_storage_3d<rgba32float, write>; fn smoothStepF(e0: f32, e1: f32, x: f32) -> f32 { let t = clamp((x - e0) / max(e1 - e0, 0.000001), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); } fn phaseValue(cosTheta: f32, g: f32) -> f32 { let g2 = g * g; let denom = 1.0 + g2 - 2.0 * g * cosTheta; return (1.0 - g2) / (12.566370614359172 * pow(denom, 1.5)); } @compute @workgroup_size(4, 4, 4) fn froxelMain(@builtin(global_invocation_id) id: vec3<u32>) { let gridW = u32(params.gridParams.x); let gridH = u32(params.gridParams.y); let gridK = u32(params.gridParams.z); if (id.x >= gridW || id.y >= gridH || id.z >= gridK) { return; } let ndcX = (f32(id.x) + 0.5) / f32(gridW) * 2.0 - 1.0; let ndcY = 1.0 - (f32(id.y) + 0.5) / f32(gridH) * 2.0; let z01 = (f32(id.z) + 0.5) / f32(gridK); var center4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, z01 * 2.0 - 1.0, 1.0); let worldCenter = center4.xyz / center4.w; let view = normalize(params.cameraPosition.xyz - worldCenter); var scattered = vec3<f32>(0.0, 0.0, 0.0); let lightCount = u32(params.lightParams.x); for (var i = 0u; i < " + zassb + "u; i = i + 1u) { if (i >= lightCount) { break; } let base = i * 4u; let lightPosition = lights[base].xyz; let lightDirection = normalize(lights[base + 1u].xyz); let lightColor = lights[base + 2u].rgb; let kind = lights[base + 3u].x; let distance = lights[base + 3u].y; let edge = lights[base + 3u].z; let inner = lights[base + 3u].w; var radiance = lightColor; if (kind > 0.5 && kind < 1.5) { radiance = radiance * phaseValue(dot(lightDirection, view), params.lightParams.w); } else if (kind > 1.5) { let toPoint = worldCenter - lightPosition; let dist = length(toPoint); let photonDirection = toPoint / max(dist, 0.0001); var attenuation = 1.0; if (distance > 0.0) { attenuation = max(0.0, 1.0 - dist / distance); } attenuation = attenuation / (1.0 + dist * dist * 0.015); if (kind > 2.5) { attenuation = attenuation * smoothStepF(edge, inner, dot(photonDirection, lightDirection)); } radiance = radiance * attenuation * phaseValue(dot(photonDirection, view), params.lightParams.w); } else { radiance = vec3<f32>(0.0, 0.0, 0.0); } scattered = scattered + radiance; } let sigmaS = params.lightParams.y * params.lightParams.z; var result = vec4<f32>(scattered * sigmaS, 1.0); if (params.mediaParams.x > 0.0 && params.mediaParams.y > 0.5) { var prev4 = params.previousViewProjection * vec4<f32>(worldCenter, 1.0); let prevClip = prev4.xyz / prev4.w; let prevXf = clamp((prevClip.x * 0.5 + 0.5) * f32(gridW), 0.0, f32(gridW) - 1.0); let prevX = u32(prevXf); let prevYf = clamp((0.5 - prevClip.y * 0.5) * f32(gridH), 0.0, f32(gridH) - 1.0); let prevY = u32(prevYf); let prevZf = clamp((prevClip.z * 0.5 + 0.5) * f32(gridK), 0.0, f32(gridK) - 1.0); let prevZ = u32(prevZf); let history = textureLoad(historyTexture, vec3<i32>(i32(prevX), i32(prevY), i32(prevZ)), 0); result = mix(result, history, params.mediaParams.x); } textureStore(froxelTexture, vec3<i32>(i32(id.x), i32(id.y), i32(id.z)), result); }";
        this.computeModule = zassa.createShaderModule({
            code: zassc
        });
        this.computePipeline = zassa.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.computeModule,
                entryPoint: "froxelMain"
            }
        });
        this.computeLayout = this.computePipeline.getBindGroupLayout(0);
        var zassd = "struct Params { invViewProjection: mat4x4<f32>, marchParams: vec4<f32>, gridParams: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var opaqueTexture: texture_2d<f32>; @group(0) @binding(2) var opaqueSampler: sampler; @group(0) @binding(3) var sceneDepth: texture_depth_2d; @group(0) @binding(4) var depthCompareSampler: sampler_comparison; @group(0) @binding(5) var froxelTexture: texture_3d<f32>; struct ROut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn resolveVertex(@builtin(vertex_index) vertexIndex: u32) -> ROut { var output: ROut; var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); let p = positions[vertexIndex]; output.position = vec4<f32>(p, 0.0, 1.0); output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return output; } @fragment fn resolveFragment(input: ROut) -> @location(0) vec4<f32> { let opaque = textureSampleLevel(opaqueTexture, opaqueSampler, input.uv, 0.0); let gridW = u32(params.gridParams.x); let gridH = u32(params.gridParams.y); let gridK = u32(params.marchParams.x); let density = params.marchParams.y; if (density <= 0.0 || gridK == 0u) { return vec4<f32>(opaque.rgb, 1.0); } let fx = clamp(u32(input.uv.x * f32(gridW)), 0u, gridW - 1u); let fy = clamp(u32(input.uv.y * f32(gridH)), 0u, gridH - 1u); let ndcX = input.uv.x * 2.0 - 1.0; let ndcY = 1.0 - input.uv.y * 2.0; var transmittance = 1.0; var accumulated = vec3<f32>(0.0, 0.0, 0.0); for (var k = 0u; k < gridK; k = k + 1u) { let z0 = f32(k) / f32(gridK); let z1 = f32(k + 1u) / f32(gridK); var p04 = params.invViewProjection * vec4<f32>(ndcX, ndcY, z0 * 2.0 - 1.0, 1.0); let world0 = p04.xyz / p04.w; var p14 = params.invViewProjection * vec4<f32>(ndcX, ndcY, z1 * 2.0 - 1.0, 1.0); let world1 = p14.xyz / p14.w; let sliceDistance = distance(world1, world0); let inFront0 = textureSampleCompareLevel(sceneDepth, depthCompareSampler, input.uv, z0); if (inFront0 < 0.5) { break; } let inFront1 = textureSampleCompareLevel(sceneDepth, depthCompareSampler, input.uv, z1); var fraction = 1.0; if (inFront1 < 0.5) { var lo = 0.0; var hi = 1.0; for (var b = 0u; b < 4u; b = b + 1u) { let mid = (lo + hi) * 0.5; let zm = z0 + mid * (z1 - z0); if (textureSampleCompareLevel(sceneDepth, depthCompareSampler, input.uv, zm) > 0.5) { lo = mid; } else { hi = mid; } } fraction = lo; } let dz = fraction * sliceDistance; if (dz > 0.0) { let texel = textureLoad(froxelTexture, vec3<i32>(i32(fx), i32(fy), i32(k)), 0); let segmentTransmittance = exp(-density * dz); accumulated = accumulated + transmittance * texel.rgb * (1.0 - segmentTransmittance) / density; transmittance = transmittance * segmentTransmittance; } if (inFront1 < 0.5) { break; } } let outColor = clamp(opaque.rgb * transmittance + accumulated, vec3<f32>(0.0), vec3<f32>(1.0)); return vec4<f32>(outColor, 1.0); }";
        this.resolveModule = zassa.createShaderModule({
            code: zassd
        });
        this.resolvePipeline = zassa.createRenderPipeline({
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
    }
    setLights(zassa) {
        var zassb = [];
        for (var zassc = 0; zassc < zassa.length; zassc++) {
            if (zassb.length >= this.maxLights) throw new Error("FroxelLighting supports at most " + this.maxLights + " lights");
            var zassd = zassa[zassc];
            var zasse = zassd.kind !== undefined ? zassd.kind : zassd.type === "DirectionalLight" ? 1 : zassd.type === "PointLight" ? 2 : zassd.type === "SpotLight" ? 3 : zassd.type === "directional" ? 1 : zassd.type === "point" ? 2 : zassd.type === "spot" ? 3 : 0;
            if (zasse !== 1 && zasse !== 2 && zasse !== 3) throw new Error("FroxelLighting light kind must be directional, point, or spot");
            var zassf = new Vector3;
            if (zassd.position) zassf.set(zassd.position.x !== undefined ? zassd.position.x : zassd.position[0] || 0, zassd.position.y !== undefined ? zassd.position.y : zassd.position[1] || 0, zassd.position.z !== undefined ? zassd.position.z : zassd.position[2] || 0);
            if (zassd.matrixWorld && zassd.matrixWorld.elements) zassf.setFromMatrixPosition(zassd.matrixWorld);
            var zassg = new Vector3(0, -1, 0);
            if (zassd.direction) zassg.set(zassd.direction.x !== undefined ? zassd.direction.x : zassd.direction[0] || 0, zassd.direction.y !== undefined ? zassd.direction.y : zassd.direction[1] || 0, zassd.direction.z !== undefined ? zassd.direction.z : zassd.direction[2] || 0); else if (zassd.target && zassd.target.position) zassg.copy(zassd.target.position).sub(zassf);
            if (zassg.lengthSq() < 1e-6) zassg.set(0, -1, 0);
            zassg.normalize();
            var zassh = new Color(zassd.color !== undefined ? zassd.color : 16777215);
            var zassi = zassd.intensity === undefined ? 1 : zassd.intensity;
            var zassj = zassd.angle === undefined ? Math.PI / 3 : zassd.angle;
            var zassk = zassd.penumbra === undefined ? 0 : zassd.penumbra;
            var zassl = Math.cos(zassj);
            var zassm = Math.cos(zassj * (1 - Math.min(.95, Math.max(0, zassk))));
            if (zassm - zassl < 1e-6) zassm = zassl + 1e-6;
            zassb.push({
                kind: zasse,
                position: zassf,
                direction: zassg,
                color: zassh,
                intensity: zassi,
                distance: zassd.distance === undefined ? 0 : zassd.distance,
                edge: zassl,
                inner: zassm
            });
        }
        this.lights = zassb;
        this.stats.lights = zassb.length;
        return this;
    }
    setMedia(zassa) {
        zassa = zassa || {};
        if (zassa.density !== undefined) this.density = zassa.density;
        if (zassa.albedo !== undefined) this.albedo = zassa.albedo;
        if (zassa.phaseEccentricity !== undefined) this.phaseEccentricity = zassa.phaseEccentricity;
        return this;
    }
    setTemporal(zassa) {
        this.temporalWeight = Math.min(.95, Math.max(0, zassa));
        return this;
    }
    writeLightUniform() {
        var zassa = new Float32Array(this.maxLights * 16);
        for (var zassb = 0; zassb < this.lights.length; zassb++) {
            var zassc = this.lights[zassb];
            var zassd = zassb * 16;
            zassa[zassd] = zassc.position.x;
            zassa[zassd + 1] = zassc.position.y;
            zassa[zassd + 2] = zassc.position.z;
            zassa[zassd + 3] = 0;
            zassa[zassd + 4] = zassc.direction.x;
            zassa[zassd + 5] = zassc.direction.y;
            zassa[zassd + 6] = zassc.direction.z;
            zassa[zassd + 7] = 0;
            zassa[zassd + 8] = zassc.color.r * zassc.intensity;
            zassa[zassd + 9] = zassc.color.g * zassc.intensity;
            zassa[zassd + 10] = zassc.color.b * zassc.intensity;
            zassa[zassd + 11] = 0;
            zassa[zassd + 12] = zassc.kind;
            zassa[zassd + 13] = zassc.distance;
            zassa[zassd + 14] = zassc.edge;
            zassa[zassd + 15] = zassc.inner;
        }
        this.renderer.device.queue.writeBuffer(this.lightBuffer, 0, zassa);
        return this;
    }
    render(zassa, zassb, zassc) {
        var zassd = this.renderer.device;
        if (!zassc || !zassc.projectionMatrix || !zassc.matrixWorldInverse) throw new Error("FroxelLighting.render requires a camera");
        var zasse = (new Matrix4).multiplyMatrices(zassc.projectionMatrix, zassc.matrixWorldInverse);
        var zassf = (new Matrix4).copy(zasse).invert();
        var zassg = zassc.position || new Vector3;
        var zassh = new Float32Array(48);
        zassh.set(zassf.elements, 0);
        zassh.set(this.previousViewProjection.elements, 16);
        zassh[32] = zassg.x;
        zassh[33] = zassg.y;
        zassh[34] = zassg.z;
        zassh[35] = 0;
        zassh[36] = this.lights.length;
        zassh[37] = this.density;
        zassh[38] = this.albedo;
        zassh[39] = this.phaseEccentricity;
        zassh[40] = this.gridWidth;
        zassh[41] = this.gridHeight;
        zassh[42] = this.gridDepth;
        zassh[43] = 0;
        zassh[44] = this.temporalWeight;
        zassh[45] = this.stats.frames > 0 ? 1 : 0;
        zassd.queue.writeBuffer(this.computeParams, 0, zassh);
        this.writeLightUniform();
        var zassi = new Float32Array(24);
        zassi.set(zassf.elements, 0);
        zassi[16] = this.gridDepth;
        zassi[17] = this.density;
        zassi[18] = 0;
        zassi[19] = 0;
        zassi[20] = this.gridWidth;
        zassi[21] = this.gridHeight;
        zassi[22] = 0;
        zassi[23] = 0;
        zassd.queue.writeBuffer(this.resolveParams, 0, zassi);
        var zassj = this.froxelTextures[1 - this.currentSlot];
        var zassk = this.froxelTextures[this.currentSlot];
        var zassl = zassd.createBindGroup({
            layout: this.computeLayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.computeParams
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.lightBuffer
                }
            }, {
                binding: 2,
                resource: zassj.createView()
            }, {
                binding: 3,
                resource: zassk.createView()
            } ]
        });
        var zassm = zassd.createCommandEncoder();
        var zassn = zassm.beginComputePass();
        zassn.setPipeline(this.computePipeline);
        zassn.setBindGroup(0, zassl);
        zassn.dispatchWorkgroups(Math.ceil(this.gridWidth / 4), Math.ceil(this.gridHeight / 4), Math.ceil(this.gridDepth / 4));
        zassn.end();
        var zasso = zassb ? zassb instanceof GPUTexture ? zassb.createView() : zassb : this.dummyDepth.createView();
        var zassp = zassd.createBindGroup({
            layout: this.resolveLayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.resolveParams
                }
            }, {
                binding: 1,
                resource: zassa instanceof GPUTexture ? zassa.createView() : zassa
            }, {
                binding: 2,
                resource: this.opaqueSampler
            }, {
                binding: 3,
                resource: zasso
            }, {
                binding: 4,
                resource: this.depthCompareSampler
            }, {
                binding: 5,
                resource: zassk.createView()
            } ]
        });
        var zassq = zassm.beginRenderPass({
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
        zassq.setPipeline(this.resolvePipeline);
        zassq.setBindGroup(0, zassp);
        zassq.draw(3);
        zassq.end();
        zassd.queue.submit([ zassm.finish() ]);
        this.currentSlot = 1 - this.currentSlot;
        this.previousViewProjection.copy(zasse);
        this.stats.frames++;
        return this.compositeTexture;
    }
    async readbackFroxels() {
        var zassa = this.renderer.device;
        var zassb = this.froxelTextures[1 - this.currentSlot];
        var zassc = this.gridWidth * 16;
        var zassd = Math.ceil(zassc / 256) * 256;
        var zasse = zassa.createBuffer({
            size: zassd * this.gridHeight * this.gridDepth,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zassf = zassa.createCommandEncoder();
        zassf.copyTextureToBuffer({
            texture: zassb
        }, {
            buffer: zasse,
            bytesPerRow: zassd,
            rowsPerImage: this.gridHeight
        }, [ this.gridWidth, this.gridHeight, this.gridDepth ]);
        zassa.queue.submit([ zassf.finish() ]);
        await zassa.queue.onSubmittedWorkDone();
        await zasse.mapAsync(GPUMapMode.READ);
        var zassg = new Uint8Array(zasse.getMappedRange()).slice();
        zasse.unmap();
        zasse.destroy();
        var zassh = zassd / 4;
        var zassi = new Float32Array(zassg.buffer, zassg.byteOffset, zassg.byteLength / 4);
        var zassj = new Float32Array(this.gridWidth * this.gridHeight * this.gridDepth * 4);
        var zassk = this.gridWidth * this.gridHeight;
        for (var zassl = 0; zassl < this.gridDepth; zassl++) {
            for (var zassm = 0; zassm < this.gridHeight; zassm++) {
                var zassn = zassl * zassh * this.gridHeight + zassm * zassh;
                var zasso = (zassl * zassk + zassm * this.gridWidth) * 4;
                for (var zassp = 0; zassp < this.gridWidth * 4; zassp++) zassj[zasso + zassp] = zassi[zassn + zassp];
            }
        }
        return zassj;
    }
    async readPixels(zassa) {
        var zassb = this.renderer.device;
        var zassc = zassa || this.compositeTexture;
        var zassd = Math.ceil(this.width * 4 / 256) * 256;
        var zasse = zassb.createBuffer({
            size: zassd * this.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zassf = zassb.createCommandEncoder();
        zassf.copyTextureToBuffer({
            texture: zassc
        }, {
            buffer: zasse,
            bytesPerRow: zassd,
            rowsPerImage: this.height
        }, [ this.width, this.height, 1 ]);
        zassb.queue.submit([ zassf.finish() ]);
        await zassb.queue.onSubmittedWorkDone();
        await zasse.mapAsync(GPUMapMode.READ);
        var zassg = new Uint8Array(zasse.getMappedRange());
        var zassh = new Uint8Array(this.width * 4 * this.height);
        for (var zassi = 0; zassi < this.height; zassi++) zassh.set(zassg.subarray(zassi * zassd, zassi * zassd + this.width * 4), zassi * this.width * 4);
        zasse.unmap();
        zasse.destroy();
        return zassh;
    }
    dispose() {
        if (this.computeParams) this.computeParams.destroy();
        if (this.lightBuffer) this.lightBuffer.destroy();
        if (this.resolveParams) this.resolveParams.destroy();
        for (var zassa = 0; zassa < this.froxelTextures.length; zassa++) if (this.froxelTextures[zassa]) this.froxelTextures[zassa].destroy();
        if (this.compositeTexture) this.compositeTexture.destroy();
        if (this.dummyDepth) this.dummyDepth.destroy();
        this.computeParams = null;
        this.lightBuffer = null;
        this.resolveParams = null;
        this.froxelTextures = [];
        this.compositeTexture = null;
        this.dummyDepth = null;
        return this;
    }
}

export { FroxelLighting };

import { Color, Matrix4, Vector3 } from "../math/index.js";

class FroxelLighting {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer;
        if (!renderer || !renderer.device) throw new Error("FroxelLighting requires an initialized WebGPU renderer");
        var device = renderer.device;
        this.gridWidth = Math.max(4, Math.floor(options.gridWidth === undefined ? 160 : options.gridWidth));
        this.gridHeight = Math.max(4, Math.floor(options.gridHeight === undefined ? 90 : options.gridHeight));
        this.gridDepth = Math.max(4, Math.floor(options.gridDepth === undefined ? 64 : options.gridDepth));
        this.width = Math.max(1, Math.floor(options.width === undefined ? 192 : options.width));
        this.height = Math.max(1, Math.floor(options.height === undefined ? 192 : options.height));
        this.maxLights = Math.max(1, Math.floor(options.maxLights === undefined ? 8 : options.maxLights));
        this.density = options.density === undefined ? 0.02 : options.density;
        this.albedo = options.albedo === undefined ? 0.9 : options.albedo;
        this.phaseEccentricity = options.phaseEccentricity === undefined ? 0 : options.phaseEccentricity;
        this.temporalWeight = options.temporalWeight === undefined ? 0 : Math.min(0.95, Math.max(0, options.temporalWeight));
        this.lights = [];
        this.currentSlot = 0;
        this.hasHistory = false;
        this.previousViewProjection = new Matrix4();
        this.stats = { frames: 0, lights: 0, froxels: this.gridWidth * this.gridHeight * this.gridDepth };
        this.computeParams = device.createBuffer({ size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.lightBuffer = device.createBuffer({ size: this.maxLights * 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.resolveParams = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.froxelTextures = [];
        for (var i = 0; i < 2; i++) this.froxelTextures.push(device.createTexture({ size: [this.gridWidth, this.gridHeight, this.gridDepth], dimension: "3d", format: "rgba32float", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC }));
        this.compositeTexture = device.createTexture({ size: [this.width, this.height, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        this.opaqueSampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
        this.depthCompareSampler = device.createSampler({ compare: "less-equal", magFilter: "nearest", minFilter: "nearest" });
        this.dummyDepth = device.createTexture({ size: [1, 1, 1], format: "depth32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        var dummyEncoder = device.createCommandEncoder();
        var dummyPass = dummyEncoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.dummyDepth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
        dummyPass.end();
        device.queue.submit([dummyEncoder.finish()]);
        this.buildPipelines();
    }
    buildPipelines() {
        var device = this.renderer.device;
        var maxLights = this.maxLights;
        var computeShader = "struct Params { invViewProjection: mat4x4<f32>, previousViewProjection: mat4x4<f32>, cameraPosition: vec4<f32>, lightParams: vec4<f32>, gridParams: vec4<f32>, mediaParams: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var<uniform> lights: array<vec4<f32>, " + (maxLights * 4) + ">; @group(0) @binding(2) var historyTexture: texture_3d<f32>; @group(0) @binding(3) var froxelTexture: texture_storage_3d<rgba32float, write>; fn smoothStepF(e0: f32, e1: f32, x: f32) -> f32 { let t = clamp((x - e0) / max(e1 - e0, 0.000001), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); } fn phaseValue(cosTheta: f32, g: f32) -> f32 { let g2 = g * g; let denom = 1.0 + g2 - 2.0 * g * cosTheta; return (1.0 - g2) / (12.566370614359172 * pow(denom, 1.5)); } @compute @workgroup_size(4, 4, 4) fn froxelMain(@builtin(global_invocation_id) id: vec3<u32>) { let gridW = u32(params.gridParams.x); let gridH = u32(params.gridParams.y); let gridK = u32(params.gridParams.z); if (id.x >= gridW || id.y >= gridH || id.z >= gridK) { return; } let ndcX = (f32(id.x) + 0.5) / f32(gridW) * 2.0 - 1.0; let ndcY = 1.0 - (f32(id.y) + 0.5) / f32(gridH) * 2.0; let z01 = (f32(id.z) + 0.5) / f32(gridK); var center4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, z01 * 2.0 - 1.0, 1.0); let worldCenter = center4.xyz / center4.w; let view = normalize(params.cameraPosition.xyz - worldCenter); var scattered = vec3<f32>(0.0, 0.0, 0.0); let lightCount = u32(params.lightParams.x); for (var i = 0u; i < " + maxLights + "u; i = i + 1u) { if (i >= lightCount) { break; } let base = i * 4u; let lightPosition = lights[base].xyz; let lightDirection = normalize(lights[base + 1u].xyz); let lightColor = lights[base + 2u].rgb; let kind = lights[base + 3u].x; let distance = lights[base + 3u].y; let edge = lights[base + 3u].z; let inner = lights[base + 3u].w; var radiance = lightColor; if (kind > 0.5 && kind < 1.5) { radiance = radiance * phaseValue(dot(lightDirection, view), params.lightParams.w); } else if (kind > 1.5) { let toPoint = worldCenter - lightPosition; let dist = length(toPoint); let photonDirection = toPoint / max(dist, 0.0001); var attenuation = 1.0; if (distance > 0.0) { attenuation = max(0.0, 1.0 - dist / distance); } attenuation = attenuation / (1.0 + dist * dist * 0.015); if (kind > 2.5) { attenuation = attenuation * smoothStepF(edge, inner, dot(photonDirection, lightDirection)); } radiance = radiance * attenuation * phaseValue(dot(photonDirection, view), params.lightParams.w); } else { radiance = vec3<f32>(0.0, 0.0, 0.0); } scattered = scattered + radiance; } let sigmaS = params.lightParams.y * params.lightParams.z; var result = vec4<f32>(scattered * sigmaS, 1.0); if (params.mediaParams.x > 0.0 && params.mediaParams.y > 0.5) { var prev4 = params.previousViewProjection * vec4<f32>(worldCenter, 1.0); let prevClip = prev4.xyz / prev4.w; let prevXf = clamp((prevClip.x * 0.5 + 0.5) * f32(gridW), 0.0, f32(gridW) - 1.0); let prevX = u32(prevXf); let prevYf = clamp((0.5 - prevClip.y * 0.5) * f32(gridH), 0.0, f32(gridH) - 1.0); let prevY = u32(prevYf); let prevZf = clamp((prevClip.z * 0.5 + 0.5) * f32(gridK), 0.0, f32(gridK) - 1.0); let prevZ = u32(prevZf); let history = textureLoad(historyTexture, vec3<i32>(i32(prevX), i32(prevY), i32(prevZ)), 0); result = mix(result, history, params.mediaParams.x); } textureStore(froxelTexture, vec3<i32>(i32(id.x), i32(id.y), i32(id.z)), result); }";
        this.computeModule = device.createShaderModule({ code: computeShader });
        this.computePipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.computeModule, entryPoint: "froxelMain" } });
        this.computeLayout = this.computePipeline.getBindGroupLayout(0);
        var resolveShader = "struct Params { invViewProjection: mat4x4<f32>, marchParams: vec4<f32>, gridParams: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var opaqueTexture: texture_2d<f32>; @group(0) @binding(2) var opaqueSampler: sampler; @group(0) @binding(3) var sceneDepth: texture_depth_2d; @group(0) @binding(4) var depthCompareSampler: sampler_comparison; @group(0) @binding(5) var froxelTexture: texture_3d<f32>; struct ROut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn resolveVertex(@builtin(vertex_index) vertexIndex: u32) -> ROut { var output: ROut; var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); let p = positions[vertexIndex]; output.position = vec4<f32>(p, 0.0, 1.0); output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return output; } @fragment fn resolveFragment(input: ROut) -> @location(0) vec4<f32> { let opaque = textureSampleLevel(opaqueTexture, opaqueSampler, input.uv, 0.0); let gridW = u32(params.gridParams.x); let gridH = u32(params.gridParams.y); let gridK = u32(params.marchParams.x); let density = params.marchParams.y; if (density <= 0.0 || gridK == 0u) { return vec4<f32>(opaque.rgb, 1.0); } let fx = clamp(u32(input.uv.x * f32(gridW)), 0u, gridW - 1u); let fy = clamp(u32(input.uv.y * f32(gridH)), 0u, gridH - 1u); let ndcX = input.uv.x * 2.0 - 1.0; let ndcY = 1.0 - input.uv.y * 2.0; var transmittance = 1.0; var accumulated = vec3<f32>(0.0, 0.0, 0.0); for (var k = 0u; k < gridK; k = k + 1u) { let z0 = f32(k) / f32(gridK); let z1 = f32(k + 1u) / f32(gridK); var p04 = params.invViewProjection * vec4<f32>(ndcX, ndcY, z0 * 2.0 - 1.0, 1.0); let world0 = p04.xyz / p04.w; var p14 = params.invViewProjection * vec4<f32>(ndcX, ndcY, z1 * 2.0 - 1.0, 1.0); let world1 = p14.xyz / p14.w; let sliceDistance = distance(world1, world0); let inFront0 = textureSampleCompareLevel(sceneDepth, depthCompareSampler, input.uv, z0); if (inFront0 < 0.5) { break; } let inFront1 = textureSampleCompareLevel(sceneDepth, depthCompareSampler, input.uv, z1); var fraction = 1.0; if (inFront1 < 0.5) { var lo = 0.0; var hi = 1.0; for (var b = 0u; b < 4u; b = b + 1u) { let mid = (lo + hi) * 0.5; let zm = z0 + mid * (z1 - z0); if (textureSampleCompareLevel(sceneDepth, depthCompareSampler, input.uv, zm) > 0.5) { lo = mid; } else { hi = mid; } } fraction = lo; } let dz = fraction * sliceDistance; if (dz > 0.0) { let texel = textureLoad(froxelTexture, vec3<i32>(i32(fx), i32(fy), i32(k)), 0); let segmentTransmittance = exp(-density * dz); accumulated = accumulated + transmittance * texel.rgb * (1.0 - segmentTransmittance) / density; transmittance = transmittance * segmentTransmittance; } if (inFront1 < 0.5) { break; } } let outColor = clamp(opaque.rgb * transmittance + accumulated, vec3<f32>(0.0), vec3<f32>(1.0)); return vec4<f32>(outColor, 1.0); }";
        this.resolveModule = device.createShaderModule({ code: resolveShader });
        this.resolvePipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.resolveModule, entryPoint: "resolveVertex" }, fragment: { module: this.resolveModule, entryPoint: "resolveFragment", targets: [{ format: "rgba8unorm" }] }, primitive: { topology: "triangle-list" } });
        this.resolveLayout = this.resolvePipeline.getBindGroupLayout(0);
    }
    setLights(lights) {
        var list = [];
        for (var i = 0; i < lights.length; i++) {
            if (list.length >= this.maxLights) throw new Error("FroxelLighting supports at most " + this.maxLights + " lights");
            var light = lights[i];
            var kind = light.kind !== undefined ? light.kind : light.type === "DirectionalLight" ? 1 : light.type === "PointLight" ? 2 : light.type === "SpotLight" ? 3 : light.type === "directional" ? 1 : light.type === "point" ? 2 : light.type === "spot" ? 3 : 0;
            if (kind !== 1 && kind !== 2 && kind !== 3) throw new Error("FroxelLighting light kind must be directional, point, or spot");
            var position = new Vector3();
            if (light.position) position.set(light.position.x !== undefined ? light.position.x : light.position[0] || 0, light.position.y !== undefined ? light.position.y : light.position[1] || 0, light.position.z !== undefined ? light.position.z : light.position[2] || 0);
            if (light.matrixWorld && light.matrixWorld.elements) position.setFromMatrixPosition(light.matrixWorld);
            var direction = new Vector3(0, -1, 0);
            if (light.direction) direction.set(light.direction.x !== undefined ? light.direction.x : light.direction[0] || 0, light.direction.y !== undefined ? light.direction.y : light.direction[1] || 0, light.direction.z !== undefined ? light.direction.z : light.direction[2] || 0);
            else if (light.target && light.target.position) direction.copy(light.target.position).sub(position);
            if (direction.lengthSq() < 0.000001) direction.set(0, -1, 0);
            direction.normalize();
            var color = new Color(light.color !== undefined ? light.color : 0xffffff);
            var intensity = light.intensity === undefined ? 1 : light.intensity;
            var angle = light.angle === undefined ? Math.PI / 3 : light.angle;
            var penumbra = light.penumbra === undefined ? 0 : light.penumbra;
            var edge = Math.cos(angle);
            var inner = Math.cos(angle * (1 - Math.min(0.95, Math.max(0, penumbra))));
            if (inner - edge < 0.000001) inner = edge + 0.000001;
            list.push({ kind: kind, position: position, direction: direction, color: color, intensity: intensity, distance: light.distance === undefined ? 0 : light.distance, edge: edge, inner: inner });
        }
        this.lights = list;
        this.stats.lights = list.length;
        return this;
    }
    setMedia(options) {
        options = options || {};
        if (options.density !== undefined) this.density = options.density;
        if (options.albedo !== undefined) this.albedo = options.albedo;
        if (options.phaseEccentricity !== undefined) this.phaseEccentricity = options.phaseEccentricity;
        return this;
    }
    setTemporal(weight) {
        this.temporalWeight = Math.min(0.95, Math.max(0, weight));
        return this;
    }
    writeLightUniform() {
        var data = new Float32Array(this.maxLights * 16);
        for (var i = 0; i < this.lights.length; i++) {
            var light = this.lights[i];
            var o = i * 16;
            data[o] = light.position.x; data[o + 1] = light.position.y; data[o + 2] = light.position.z; data[o + 3] = 0;
            data[o + 4] = light.direction.x; data[o + 5] = light.direction.y; data[o + 6] = light.direction.z; data[o + 7] = 0;
            data[o + 8] = light.color.r * light.intensity; data[o + 9] = light.color.g * light.intensity; data[o + 10] = light.color.b * light.intensity; data[o + 11] = 0;
            data[o + 12] = light.kind; data[o + 13] = light.distance; data[o + 14] = light.edge; data[o + 15] = light.inner;
        }
        this.renderer.device.queue.writeBuffer(this.lightBuffer, 0, data);
        return this;
    }
    render(opaqueTexture, sceneDepthTexture, camera) {
        var device = this.renderer.device;
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("FroxelLighting.render requires a camera");
        var viewProjection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var invViewProjection = new Matrix4().copy(viewProjection).invert();
        var cameraPosition = camera.position || new Vector3();
        var computeData = new Float32Array(48);
        computeData.set(invViewProjection.elements, 0);
        computeData.set(this.previousViewProjection.elements, 16);
        computeData[32] = cameraPosition.x; computeData[33] = cameraPosition.y; computeData[34] = cameraPosition.z; computeData[35] = 0;
        computeData[36] = this.lights.length;
        computeData[37] = this.density;
        computeData[38] = this.albedo;
        computeData[39] = this.phaseEccentricity;
        computeData[40] = this.gridWidth;
        computeData[41] = this.gridHeight;
        computeData[42] = this.gridDepth;
        computeData[43] = 0;
        computeData[44] = this.temporalWeight;
        computeData[45] = this.stats.frames > 0 ? 1 : 0;
        device.queue.writeBuffer(this.computeParams, 0, computeData);
        this.writeLightUniform();
        var resolveData = new Float32Array(24);
        resolveData.set(invViewProjection.elements, 0);
        resolveData[16] = this.gridDepth;
        resolveData[17] = this.density;
        resolveData[18] = 0;
        resolveData[19] = 0;
        resolveData[20] = this.gridWidth;
        resolveData[21] = this.gridHeight;
        resolveData[22] = 0;
        resolveData[23] = 0;
        device.queue.writeBuffer(this.resolveParams, 0, resolveData);
        var historyTexture = this.froxelTextures[1 - this.currentSlot];
        var currentTexture = this.froxelTextures[this.currentSlot];
        var computeBindGroup = device.createBindGroup({ layout: this.computeLayout, entries: [{ binding: 0, resource: { buffer: this.computeParams } }, { binding: 1, resource: { buffer: this.lightBuffer } }, { binding: 2, resource: historyTexture.createView() }, { binding: 3, resource: currentTexture.createView() }] });
        var encoder = device.createCommandEncoder();
        var computePass = encoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.gridWidth / 4), Math.ceil(this.gridHeight / 4), Math.ceil(this.gridDepth / 4));
        computePass.end();
        var sceneDepthView = sceneDepthTexture ? (sceneDepthTexture instanceof GPUTexture ? sceneDepthTexture.createView() : sceneDepthTexture) : this.dummyDepth.createView();
        var resolveBindGroup = device.createBindGroup({ layout: this.resolveLayout, entries: [{ binding: 0, resource: { buffer: this.resolveParams } }, { binding: 1, resource: opaqueTexture instanceof GPUTexture ? opaqueTexture.createView() : opaqueTexture }, { binding: 2, resource: this.opaqueSampler }, { binding: 3, resource: sceneDepthView }, { binding: 4, resource: this.depthCompareSampler }, { binding: 5, resource: currentTexture.createView() }] });
        var resolvePass = encoder.beginRenderPass({ colorAttachments: [{ view: this.compositeTexture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
        resolvePass.setPipeline(this.resolvePipeline);
        resolvePass.setBindGroup(0, resolveBindGroup);
        resolvePass.draw(3);
        resolvePass.end();
        device.queue.submit([encoder.finish()]);
        this.currentSlot = 1 - this.currentSlot;
        this.previousViewProjection.copy(viewProjection);
        this.stats.frames++;
        return this.compositeTexture;
    }
    async readbackFroxels() {
        var device = this.renderer.device;
        var texture = this.froxelTextures[1 - this.currentSlot];
        var rowBytes = this.gridWidth * 16;
        var bpr = Math.ceil(rowBytes / 256) * 256;
        var staging = device.createBuffer({ size: bpr * this.gridHeight * this.gridDepth, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: texture }, { buffer: staging, bytesPerRow: bpr, rowsPerImage: this.gridHeight }, [this.gridWidth, this.gridHeight, this.gridDepth]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await staging.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(staging.getMappedRange()).slice();
        staging.unmap();
        staging.destroy();
        var floatsPerRow = bpr / 4;
        var view = new Float32Array(mapped.buffer, mapped.byteOffset, mapped.byteLength / 4);
        var result = new Float32Array(this.gridWidth * this.gridHeight * this.gridDepth * 4);
        var texelsPerSlice = this.gridWidth * this.gridHeight;
        for (var slice = 0; slice < this.gridDepth; slice++) {
            for (var row = 0; row < this.gridHeight; row++) {
                var src = slice * floatsPerRow * this.gridHeight + row * floatsPerRow;
                var dst = (slice * texelsPerSlice + row * this.gridWidth) * 4;
                for (var x = 0; x < this.gridWidth * 4; x++) result[dst + x] = view[src + x];
            }
        }
        return result;
    }
    async readPixels(texture) {
        var device = this.renderer.device;
        var target = texture || this.compositeTexture;
        var bpr = Math.ceil(this.width * 4 / 256) * 256;
        var buffer = device.createBuffer({ size: bpr * this.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: target }, { buffer: buffer, bytesPerRow: bpr, rowsPerImage: this.height }, [this.width, this.height, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await buffer.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(buffer.getMappedRange());
        var result = new Uint8Array(this.width * 4 * this.height);
        for (var row = 0; row < this.height; row++) result.set(mapped.subarray(row * bpr, row * bpr + this.width * 4), row * this.width * 4);
        buffer.unmap();
        buffer.destroy();
        return result;
    }
    dispose() {
        if (this.computeParams) this.computeParams.destroy();
        if (this.lightBuffer) this.lightBuffer.destroy();
        if (this.resolveParams) this.resolveParams.destroy();
        for (var i = 0; i < this.froxelTextures.length; i++) if (this.froxelTextures[i]) this.froxelTextures[i].destroy();
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

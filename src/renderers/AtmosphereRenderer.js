import { Matrix4, Vector3 } from "../math/index.js";

class AtmosphereRenderer {
    constructor(renderer, options) {
        options = options || {};
        if (!renderer || !renderer.device) throw new Error("AtmosphereRenderer requires an initialized WebGPU renderer");
        this.renderer = renderer;
        var device = renderer.device;
        this.planetRadius = options.planetRadius === undefined ? 6360000 : Number(options.planetRadius);
        this.atmosphereRadius = options.atmosphereRadius === undefined ? 6420000 : Number(options.atmosphereRadius);
        if (!(this.atmosphereRadius > this.planetRadius)) throw new Error("AtmosphereRenderer requires atmosphereRadius greater than planetRadius");
        this.planetCenter = new Vector3(0, -this.planetRadius, 0);
        if (options.planetCenter !== undefined) this.applyCenter(options.planetCenter);
        this.rayleighHeight = options.rayleighHeight === undefined ? 8000 : Number(options.rayleighHeight);
        this.mieHeight = options.mieHeight === undefined ? 1200 : Number(options.mieHeight);
        this.rayleighBeta = [5.802e-6, 13.558e-6, 33.1e-6];
        if (options.rayleighBeta !== undefined) this.applyBeta(options.rayleighBeta);
        this.mieBeta = options.mieBeta === undefined ? 21e-6 : Number(options.mieBeta);
        this.mieG = Math.min(0.95, Math.max(-0.95, options.mieG === undefined ? 0.76 : Number(options.mieG)));
        this.sunDirection = new Vector3(0, 1, 0);
        if (options.sunDirection !== undefined) this.applySun(options.sunDirection);
        this.sunIntensity = options.sunIntensity === undefined ? 20 : Number(options.sunIntensity);
        this.samples = Math.max(1, Math.min(64, Math.floor(options.samples === undefined ? 8 : options.samples)));
        this.lightSamples = Math.max(1, Math.min(64, Math.floor(options.lightSamples === undefined ? 4 : options.lightSamples)));
        this.skyWidth = Math.max(1, Math.floor(options.skyWidth === undefined ? 256 : options.skyWidth));
        this.skyHeight = Math.max(1, Math.floor(options.skyHeight === undefined ? 128 : options.skyHeight));
        this.width = Math.max(1, Math.floor(options.width === undefined ? 192 : options.width));
        this.height = Math.max(1, Math.floor(options.height === undefined ? 192 : options.height));
        this.stats = { frames: 0, skyRenders: 0, skyPixels: this.skyWidth * this.skyHeight };
        this.skyParams = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.aerialParams = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.skyTexture = device.createTexture({ size: [this.skyWidth, this.skyHeight, 1], format: "rgba32float", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
        this.compositeTexture = device.createTexture({ size: [this.width, this.height, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        this.opaqueSampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
        this.dummyDepth = device.createTexture({ size: [1, 1, 1], format: "depth32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        var dummyEncoder = device.createCommandEncoder();
        var dummyPass = dummyEncoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.dummyDepth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
        dummyPass.end();
        device.queue.submit([dummyEncoder.finish()]);
        this.buildPipelines();
    }
    applyCenter(value) {
        if (value.length !== undefined && !value.isVector3) this.planetCenter.set(Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0);
        else this.planetCenter.set(value.x !== undefined ? Number(value.x) || 0 : 0, value.y !== undefined ? Number(value.y) || 0 : 0, value.z !== undefined ? Number(value.z) || 0 : 0);
    }
    applyBeta(value) {
        if (value.length !== undefined) { this.rayleighBeta[0] = Number(value[0]) || 0; this.rayleighBeta[1] = Number(value[1]) || 0; this.rayleighBeta[2] = Number(value[2]) || 0; }
        else { this.rayleighBeta[0] = value.r !== undefined ? Number(value.r) || 0 : Number(value.x) || 0; this.rayleighBeta[1] = value.g !== undefined ? Number(value.g) || 0 : Number(value.y) || 0; this.rayleighBeta[2] = value.b !== undefined ? Number(value.b) || 0 : Number(value.z) || 0; }
    }
    applySun(value) {
        var x = value.x !== undefined ? value.x : value[0] || 0;
        var y = value.y !== undefined ? value.y : value[1] || 0;
        var z = value.z !== undefined ? value.z : value[2] || 0;
        var length = Math.sqrt(x * x + y * y + z * z);
        if (!(length > 0)) throw new Error("AtmosphereRenderer sun direction must be non-zero");
        this.sunDirection.set(x / length, y / length, z / length);
    }
    atmosphereCode() {
        var n = this.samples, m = this.lightSamples;
        return "struct AtmosResult { inscatter: vec3<f32>, transmittance: vec3<f32> }; fn hgPhase(cosTheta: f32, g: f32) -> f32 { let g2 = g * g; return (1.0 - g2) / (12.566370614359172 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5)); } fn raySphereT(rayOrigin: vec3<f32>, rayDir: vec3<f32>, center: vec3<f32>, radius: f32) -> vec2<f32> { let oc = rayOrigin - center; let b = dot(oc, rayDir); let c = dot(oc, oc) - radius * radius; let disc = b * b - c; if (disc < 0.0) { return vec2<f32>(-1e30, -1e30); } let s = sqrt(disc); return vec2<f32>(-b - s, -b + s); } fn atmosphereMarch(rayOrigin: vec3<f32>, rayDir: vec3<f32>, tStart: f32, tEnd: f32, sunDir: vec3<f32>, sunIntensity: f32, planetCenter: vec3<f32>, planetRadius: f32, atmosphereRadius: f32, heightR: f32, heightM: f32, betaR: vec3<f32>, betaM: f32, g: f32) -> AtmosResult { var result: AtmosResult; result.inscatter = vec3<f32>(0.0, 0.0, 0.0); result.transmittance = vec3<f32>(1.0, 1.0, 1.0); if (tEnd <= tStart) { return result; } let ds = (tEnd - tStart) / " + n + ".0; let cosTheta = dot(rayDir, sunDir); let phaseR = 0.05968310365946075 * (1.0 + cosTheta * cosTheta); let phaseM = hgPhase(cosTheta, g); var odR = 0.0; var odM = 0.0; for (var i = 0u; i < " + n + "u; i = i + 1u) { let t = tStart + (f32(i) + 0.5) * ds; let p = rayOrigin + rayDir * t; let h = length(p - planetCenter) - planetRadius; let dR = exp(-h / heightR); let dM = exp(-h / heightM); var shadowed = false; var lightOdR = 0.0; var lightOdM = 0.0; let planetHit = raySphereT(p, sunDir, planetCenter, planetRadius); if (planetHit.x > 0.0) { shadowed = true; } else { let lightExit = raySphereT(p, sunDir, planetCenter, atmosphereRadius).y; let ls = lightExit / " + m + ".0; for (var j = 0u; j < " + m + "u; j = j + 1u) { let lp = p + sunDir * ((f32(j) + 0.5) * ls); let lh = length(lp - planetCenter) - planetRadius; lightOdR = lightOdR + exp(-lh / heightR) * ls; lightOdM = lightOdM + exp(-lh / heightM) * ls; } } if (!shadowed) { let tau = betaR * (odR + 0.5 * dR * ds + lightOdR) + vec3<f32>(betaM * (odM + 0.5 * dM * ds + lightOdM)); let ext = exp(-tau); result.inscatter = result.inscatter + (betaR * dR * phaseR + vec3<f32>(betaM * dM * phaseM)) * ext * ds * sunIntensity; } odR = odR + dR * ds; odM = odM + dM * ds; } result.transmittance = exp(-(betaR * odR + vec3<f32>(betaM * odM))); return result; }";
    }
    buildPipelines() {
        var device = this.renderer.device;
        var shared = this.atmosphereCode();
        var skyShader = "struct Params { sun: vec4<f32>, planetCenter: vec4<f32>, planetParams: vec4<f32>, betaPack: vec4<f32>, screenParams: vec4<f32>, cameraPosition: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var skyTexture: texture_storage_2d<rgba32float, write>; " + shared + " @compute @workgroup_size(8, 8) fn skyMain(@builtin(global_invocation_id) id: vec3<u32>) { let skyW = u32(params.screenParams.y); let skyH = u32(params.screenParams.z); if (id.x >= skyW || id.y >= skyH) { return; } let u = (f32(id.x) + 0.5) / f32(skyW); let v = (f32(id.y) + 0.5) / f32(skyH); let azimuth = u * 2.0 * 3.141592653589793 - 3.141592653589793; let elevation = (0.5 - v) * 3.141592653589793; let dir = vec3<f32>(cos(elevation) * sin(azimuth), sin(elevation), cos(elevation) * cos(azimuth)); let shell = raySphereT(params.cameraPosition.xyz, dir, params.planetCenter.xyz, params.planetParams.y); let hit = raySphereT(params.cameraPosition.xyz, dir, params.planetCenter.xyz, params.planetParams.x); var tStart = max(0.0, shell.x); var tEnd = shell.y; if (hit.x > 0.0) { tEnd = min(tEnd, hit.x); } var outColor = vec4<f32>(0.0, 0.0, 0.0, 1.0); if (tEnd > tStart) { let march = atmosphereMarch(params.cameraPosition.xyz, dir, tStart, tEnd, params.sun.xyz, params.sun.w, params.planetCenter.xyz, params.planetParams.x, params.planetParams.y, params.planetParams.z, params.planetParams.w, params.betaPack.rgb, params.betaPack.w, params.screenParams.x); outColor = vec4<f32>(march.inscatter, 1.0); } textureStore(skyTexture, vec2<i32>(i32(id.x), i32(id.y)), outColor); }";
        this.skyModule = device.createShaderModule({ code: skyShader });
        this.skyPipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.skyModule, entryPoint: "skyMain" } });
        this.skyLayout = this.skyPipeline.getBindGroupLayout(0);
        var aerialShader = "struct Params { invViewProjection: mat4x4<f32>, sun: vec4<f32>, planetCenter: vec4<f32>, planetParams: vec4<f32>, betaPack: vec4<f32>, screenParams: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var opaqueTexture: texture_2d<f32>; @group(0) @binding(2) var opaqueSampler: sampler; @group(0) @binding(3) var sceneDepth: texture_depth_2d; " + shared + " struct AOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn aerialVertex(@builtin(vertex_index) vertexIndex: u32) -> AOut { var output: AOut; var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); let p = positions[vertexIndex]; output.position = vec4<f32>(p, 0.0, 1.0); output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return output; } @fragment fn aerialFragment(input: AOut) -> @location(0) vec4<f32> { let screenW = u32(params.screenParams.y); let screenH = u32(params.screenParams.z); let pix = clamp(vec2<i32>(i32(input.position.x), i32(input.position.y)), vec2<i32>(0, 0), vec2<i32>(i32(screenW) - 1, i32(screenH) - 1)); let uv = input.position.xy / vec2<f32>(f32(screenW), f32(screenH)); let opaque = textureSampleLevel(opaqueTexture, opaqueSampler, uv, 0.0); let ndcX = uv.x * 2.0 - 1.0; let ndcY = 1.0 - uv.y * 2.0; var near4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, -1.0, 1.0); let nearPoint = near4.xyz / near4.w; var far4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, 1.0, 1.0); let farPoint = far4.xyz / far4.w; let rayDir = normalize(farPoint - nearPoint); var tEnd = 1e30; if (params.screenParams.w > 0.5) { let depth01 = textureLoad(sceneDepth, pix, 0); var scene4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, depth01 * 2.0 - 1.0, 1.0); let scenePoint = scene4.xyz / scene4.w; tEnd = dot(scenePoint - nearPoint, rayDir); } let shell = raySphereT(nearPoint, rayDir, params.planetCenter.xyz, params.planetParams.y); let hit = raySphereT(nearPoint, rayDir, params.planetCenter.xyz, params.planetParams.x); var tStart = max(0.0, shell.x); var marchEnd = min(tEnd, shell.y); if (hit.x > 0.0) { marchEnd = min(marchEnd, hit.x); } let march = atmosphereMarch(nearPoint, rayDir, tStart, marchEnd, params.sun.xyz, params.sun.w, params.planetCenter.xyz, params.planetParams.x, params.planetParams.y, params.planetParams.z, params.planetParams.w, params.betaPack.rgb, params.betaPack.w, params.screenParams.x); let outColor = clamp(opaque.rgb * march.transmittance + march.inscatter, vec3<f32>(0.0), vec3<f32>(1.0)); return vec4<f32>(outColor, 1.0); }";
        this.aerialModule = device.createShaderModule({ code: aerialShader });
        this.aerialPipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.aerialModule, entryPoint: "aerialVertex" }, fragment: { module: this.aerialModule, entryPoint: "aerialFragment", targets: [{ format: "rgba8unorm" }] }, primitive: { topology: "triangle-list" } });
        this.aerialLayout = this.aerialPipeline.getBindGroupLayout(0);
    }
    setSun(direction, intensity) {
        this.applySun(direction);
        if (intensity !== undefined) this.sunIntensity = Number(intensity);
        return this;
    }
    setAtmosphere(options) {
        options = options || {};
        var nextPlanetRadius = options.planetRadius !== undefined ? Number(options.planetRadius) : this.planetRadius;
        var nextAtmosphereRadius = options.atmosphereRadius !== undefined ? Number(options.atmosphereRadius) : this.atmosphereRadius;
        if (!(nextAtmosphereRadius > nextPlanetRadius)) throw new Error("AtmosphereRenderer requires atmosphereRadius greater than planetRadius");
        this.planetRadius = nextPlanetRadius;
        this.atmosphereRadius = nextAtmosphereRadius;
        if (options.planetCenter !== undefined) this.applyCenter(options.planetCenter);
        if (options.rayleighHeight !== undefined) this.rayleighHeight = Number(options.rayleighHeight);
        if (options.mieHeight !== undefined) this.mieHeight = Number(options.mieHeight);
        if (options.rayleighBeta !== undefined) this.applyBeta(options.rayleighBeta);
        if (options.mieBeta !== undefined) this.mieBeta = Number(options.mieBeta);
        if (options.mieG !== undefined) this.mieG = Math.min(0.95, Math.max(-0.95, Number(options.mieG)));
        return this;
    }
    planetData() {
        return [this.planetCenter.x, this.planetCenter.y, this.planetCenter.z, this.planetRadius, this.atmosphereRadius, this.rayleighHeight, this.mieHeight, this.rayleighBeta[0], this.rayleighBeta[1], this.rayleighBeta[2], this.mieBeta, this.mieG];
    }
    renderSky(camera) {
        if (!camera || camera.position === undefined) throw new Error("AtmosphereRenderer.renderSky requires a camera");
        var device = this.renderer.device;
        var d = new Float32Array(24);
        d[0] = this.sunDirection.x; d[1] = this.sunDirection.y; d[2] = this.sunDirection.z; d[3] = this.sunIntensity;
        d[4] = this.planetCenter.x; d[5] = this.planetCenter.y; d[6] = this.planetCenter.z; d[7] = 0;
        d[8] = this.planetRadius; d[9] = this.atmosphereRadius; d[10] = this.rayleighHeight; d[11] = this.mieHeight;
        d[12] = this.rayleighBeta[0]; d[13] = this.rayleighBeta[1]; d[14] = this.rayleighBeta[2]; d[15] = this.mieBeta;
        d[16] = this.mieG; d[17] = this.skyWidth; d[18] = this.skyHeight; d[19] = 0;
        d[20] = camera.position.x; d[21] = camera.position.y; d[22] = camera.position.z; d[23] = 0;
        device.queue.writeBuffer(this.skyParams, 0, d);
        var bindGroup = device.createBindGroup({ layout: this.skyLayout, entries: [{ binding: 0, resource: { buffer: this.skyParams } }, { binding: 1, resource: this.skyTexture.createView() }] });
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.skyPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(this.skyWidth / 8), Math.ceil(this.skyHeight / 8));
        pass.end();
        device.queue.submit([encoder.finish()]);
        this.stats.skyRenders++;
        return this.skyTexture;
    }
    render(opaqueTexture, sceneDepthTexture, camera) {
        var device = this.renderer.device;
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("AtmosphereRenderer.render requires a camera");
        var viewProjection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var invViewProjection = new Matrix4().copy(viewProjection).invert();
        var hasDepth = !!sceneDepthTexture;
        var d = new Float32Array(36);
        d.set(invViewProjection.elements, 0);
        d[16] = this.sunDirection.x; d[17] = this.sunDirection.y; d[18] = this.sunDirection.z; d[19] = this.sunIntensity;
        d[20] = this.planetCenter.x; d[21] = this.planetCenter.y; d[22] = this.planetCenter.z; d[23] = 0;
        d[24] = this.planetRadius; d[25] = this.atmosphereRadius; d[26] = this.rayleighHeight; d[27] = this.mieHeight;
        d[28] = this.rayleighBeta[0]; d[29] = this.rayleighBeta[1]; d[30] = this.rayleighBeta[2]; d[31] = this.mieBeta;
        d[32] = this.mieG; d[33] = this.width; d[34] = this.height; d[35] = hasDepth ? 1 : 0;
        device.queue.writeBuffer(this.aerialParams, 0, d);
        var depthView = sceneDepthTexture ? (sceneDepthTexture instanceof GPUTexture ? sceneDepthTexture.createView() : sceneDepthTexture) : this.dummyDepth.createView();
        var bindGroup = device.createBindGroup({ layout: this.aerialLayout, entries: [{ binding: 0, resource: { buffer: this.aerialParams } }, { binding: 1, resource: opaqueTexture instanceof GPUTexture ? opaqueTexture.createView() : opaqueTexture }, { binding: 2, resource: this.opaqueSampler }, { binding: 3, resource: depthView }] });
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.compositeTexture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
        pass.setPipeline(this.aerialPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);
        this.stats.frames++;
        return this.compositeTexture;
    }
    async readbackSky() {
        var device = this.renderer.device;
        var rowBytes = this.skyWidth * 16;
        var bpr = Math.ceil(rowBytes / 256) * 256;
        var staging = device.createBuffer({ size: bpr * this.skyHeight, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: this.skyTexture }, { buffer: staging, bytesPerRow: bpr }, [this.skyWidth, this.skyHeight, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await staging.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(staging.getMappedRange()).slice();
        staging.unmap();
        staging.destroy();
        var floatsPerRow = bpr / 4;
        var view = new Float32Array(mapped.buffer, mapped.byteOffset, mapped.byteLength / 4);
        var result = new Float32Array(this.skyWidth * this.skyHeight * 4);
        for (var row = 0; row < this.skyHeight; row++) {
            var src = row * floatsPerRow;
            var dst = row * this.skyWidth * 4;
            for (var x = 0; x < this.skyWidth * 4; x++) result[dst + x] = view[src + x];
        }
        return result;
    }
    async readPixels(texture) {
        var device = this.renderer.device;
        var target = texture || this.compositeTexture;
        var bpr = Math.ceil(this.width * 4 / 256) * 256;
        var buffer = device.createBuffer({ size: bpr * this.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: target }, { buffer: buffer, bytesPerRow: bpr }, [this.width, this.height, 1]);
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
        if (this.skyParams) this.skyParams.destroy();
        if (this.aerialParams) this.aerialParams.destroy();
        if (this.skyTexture) this.skyTexture.destroy();
        if (this.compositeTexture) this.compositeTexture.destroy();
        if (this.dummyDepth) this.dummyDepth.destroy();
        this.skyParams = null;
        this.aerialParams = null;
        this.skyTexture = null;
        this.compositeTexture = null;
        this.dummyDepth = null;
        return this;
    }
}

export { AtmosphereRenderer };

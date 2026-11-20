import { Matrix4, Vector3 } from "../math/index.js";

class AtmosphereRenderer {
    constructor(zasfa, zasfb) {
        zasfb = zasfb || {};
        if (!zasfa || !zasfa.device) throw new Error("AtmosphereRenderer requires an initialized WebGPU renderer");
        this.renderer = zasfa;
        var zasfc = zasfa.device;
        this.planetRadius = zasfb.planetRadius === undefined ? 636e4 : Number(zasfb.planetRadius);
        this.atmosphereRadius = zasfb.atmosphereRadius === undefined ? 642e4 : Number(zasfb.atmosphereRadius);
        if (!(this.atmosphereRadius > this.planetRadius)) throw new Error("AtmosphereRenderer requires atmosphereRadius greater than planetRadius");
        this.planetCenter = new Vector3(0, -this.planetRadius, 0);
        if (zasfb.planetCenter !== undefined) this.applyCenter(zasfb.planetCenter);
        this.rayleighHeight = zasfb.rayleighHeight === undefined ? 8e3 : Number(zasfb.rayleighHeight);
        this.mieHeight = zasfb.mieHeight === undefined ? 1200 : Number(zasfb.mieHeight);
        this.rayleighBeta = [ 5802e-9, 13558e-9, 331e-7 ];
        if (zasfb.rayleighBeta !== undefined) this.applyBeta(zasfb.rayleighBeta);
        this.mieBeta = zasfb.mieBeta === undefined ? 21e-6 : Number(zasfb.mieBeta);
        this.mieG = Math.min(.95, Math.max(-.95, zasfb.mieG === undefined ? .76 : Number(zasfb.mieG)));
        this.sunDirection = new Vector3(0, 1, 0);
        if (zasfb.sunDirection !== undefined) this.applySun(zasfb.sunDirection);
        this.sunIntensity = zasfb.sunIntensity === undefined ? 20 : Number(zasfb.sunIntensity);
        this.samples = Math.max(1, Math.min(64, Math.floor(zasfb.samples === undefined ? 8 : zasfb.samples)));
        this.lightSamples = Math.max(1, Math.min(64, Math.floor(zasfb.lightSamples === undefined ? 4 : zasfb.lightSamples)));
        this.skyWidth = Math.max(1, Math.floor(zasfb.skyWidth === undefined ? 256 : zasfb.skyWidth));
        this.skyHeight = Math.max(1, Math.floor(zasfb.skyHeight === undefined ? 128 : zasfb.skyHeight));
        this.width = Math.max(1, Math.floor(zasfb.width === undefined ? 192 : zasfb.width));
        this.height = Math.max(1, Math.floor(zasfb.height === undefined ? 192 : zasfb.height));
        this.stats = {
            frames: 0,
            skyRenders: 0,
            skyPixels: this.skyWidth * this.skyHeight
        };
        this.skyParams = zasfc.createBuffer({
            size: 96,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.aerialParams = zasfc.createBuffer({
            size: 144,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.skyTexture = zasfc.createTexture({
            size: [ this.skyWidth, this.skyHeight, 1 ],
            format: "rgba32float",
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        this.compositeTexture = zasfc.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        this.opaqueSampler = zasfc.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.dummyDepth = zasfc.createTexture({
            size: [ 1, 1, 1 ],
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        var zasfd = zasfc.createCommandEncoder();
        var zasfe = zasfd.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.dummyDepth.createView(),
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        zasfe.end();
        zasfc.queue.submit([ zasfd.finish() ]);
        this.buildPipelines();
    }
    applyCenter(zasfa) {
        if (zasfa.length !== undefined && !zasfa.isVector3) this.planetCenter.set(Number(zasfa[0]) || 0, Number(zasfa[1]) || 0, Number(zasfa[2]) || 0); else this.planetCenter.set(zasfa.x !== undefined ? Number(zasfa.x) || 0 : 0, zasfa.y !== undefined ? Number(zasfa.y) || 0 : 0, zasfa.z !== undefined ? Number(zasfa.z) || 0 : 0);
    }
    applyBeta(zasfa) {
        if (zasfa.length !== undefined) {
            this.rayleighBeta[0] = Number(zasfa[0]) || 0;
            this.rayleighBeta[1] = Number(zasfa[1]) || 0;
            this.rayleighBeta[2] = Number(zasfa[2]) || 0;
        } else {
            this.rayleighBeta[0] = zasfa.r !== undefined ? Number(zasfa.r) || 0 : Number(zasfa.x) || 0;
            this.rayleighBeta[1] = zasfa.g !== undefined ? Number(zasfa.g) || 0 : Number(zasfa.y) || 0;
            this.rayleighBeta[2] = zasfa.b !== undefined ? Number(zasfa.b) || 0 : Number(zasfa.z) || 0;
        }
    }
    applySun(zasfa) {
        var zasfb = zasfa.x !== undefined ? zasfa.x : zasfa[0] || 0;
        var zasfc = zasfa.y !== undefined ? zasfa.y : zasfa[1] || 0;
        var zasfd = zasfa.z !== undefined ? zasfa.z : zasfa[2] || 0;
        var zasfe = Math.sqrt(zasfb * zasfb + zasfc * zasfc + zasfd * zasfd);
        if (!(zasfe > 0)) throw new Error("AtmosphereRenderer sun direction must be non-zero");
        this.sunDirection.set(zasfb / zasfe, zasfc / zasfe, zasfd / zasfe);
    }
    atmosphereCode() {
        var zasfa = this.samples, zasfb = this.lightSamples;
        return "struct AtmosResult { inscatter: vec3<f32>, transmittance: vec3<f32> }; fn hgPhase(cosTheta: f32, g: f32) -> f32 { let g2 = g * g; return (1.0 - g2) / (12.566370614359172 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5)); } fn raySphereT(rayOrigin: vec3<f32>, rayDir: vec3<f32>, center: vec3<f32>, radius: f32) -> vec2<f32> { let oc = rayOrigin - center; let b = dot(oc, rayDir); let c = dot(oc, oc) - radius * radius; let disc = b * b - c; if (disc < 0.0) { return vec2<f32>(-1e30, -1e30); } let s = sqrt(disc); return vec2<f32>(-b - s, -b + s); } fn atmosphereMarch(rayOrigin: vec3<f32>, rayDir: vec3<f32>, tStart: f32, tEnd: f32, sunDir: vec3<f32>, sunIntensity: f32, planetCenter: vec3<f32>, planetRadius: f32, atmosphereRadius: f32, heightR: f32, heightM: f32, betaR: vec3<f32>, betaM: f32, g: f32) -> AtmosResult { var result: AtmosResult; result.inscatter = vec3<f32>(0.0, 0.0, 0.0); result.transmittance = vec3<f32>(1.0, 1.0, 1.0); if (tEnd <= tStart) { return result; } let ds = (tEnd - tStart) / " + zasfa + ".0; let cosTheta = dot(rayDir, sunDir); let phaseR = 0.05968310365946075 * (1.0 + cosTheta * cosTheta); let phaseM = hgPhase(cosTheta, g); var odR = 0.0; var odM = 0.0; for (var i = 0u; i < " + zasfa + "u; i = i + 1u) { let t = tStart + (f32(i) + 0.5) * ds; let p = rayOrigin + rayDir * t; let h = length(p - planetCenter) - planetRadius; let dR = exp(-h / heightR); let dM = exp(-h / heightM); var shadowed = false; var lightOdR = 0.0; var lightOdM = 0.0; let planetHit = raySphereT(p, sunDir, planetCenter, planetRadius); if (planetHit.x > 0.0) { shadowed = true; } else { let lightExit = raySphereT(p, sunDir, planetCenter, atmosphereRadius).y; let ls = lightExit / " + zasfb + ".0; for (var j = 0u; j < " + zasfb + "u; j = j + 1u) { let lp = p + sunDir * ((f32(j) + 0.5) * ls); let lh = length(lp - planetCenter) - planetRadius; lightOdR = lightOdR + exp(-lh / heightR) * ls; lightOdM = lightOdM + exp(-lh / heightM) * ls; } } if (!shadowed) { let tau = betaR * (odR + 0.5 * dR * ds + lightOdR) + vec3<f32>(betaM * (odM + 0.5 * dM * ds + lightOdM)); let ext = exp(-tau); result.inscatter = result.inscatter + (betaR * dR * phaseR + vec3<f32>(betaM * dM * phaseM)) * ext * ds * sunIntensity; } odR = odR + dR * ds; odM = odM + dM * ds; } result.transmittance = exp(-(betaR * odR + vec3<f32>(betaM * odM))); return result; }";
    }
    buildPipelines() {
        var zasfa = this.renderer.device;
        var zasfb = this.atmosphereCode();
        var zasfc = "struct Params { sun: vec4<f32>, planetCenter: vec4<f32>, planetParams: vec4<f32>, betaPack: vec4<f32>, screenParams: vec4<f32>, cameraPosition: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var skyTexture: texture_storage_2d<rgba32float, write>; " + zasfb + " @compute @workgroup_size(8, 8) fn skyMain(@builtin(global_invocation_id) id: vec3<u32>) { let skyW = u32(params.screenParams.y); let skyH = u32(params.screenParams.z); if (id.x >= skyW || id.y >= skyH) { return; } let u = (f32(id.x) + 0.5) / f32(skyW); let v = (f32(id.y) + 0.5) / f32(skyH); let azimuth = u * 2.0 * 3.141592653589793 - 3.141592653589793; let elevation = (0.5 - v) * 3.141592653589793; let dir = vec3<f32>(cos(elevation) * sin(azimuth), sin(elevation), cos(elevation) * cos(azimuth)); let shell = raySphereT(params.cameraPosition.xyz, dir, params.planetCenter.xyz, params.planetParams.y); let hit = raySphereT(params.cameraPosition.xyz, dir, params.planetCenter.xyz, params.planetParams.x); var tStart = max(0.0, shell.x); var tEnd = shell.y; if (hit.x > 0.0) { tEnd = min(tEnd, hit.x); } var outColor = vec4<f32>(0.0, 0.0, 0.0, 1.0); if (tEnd > tStart) { let march = atmosphereMarch(params.cameraPosition.xyz, dir, tStart, tEnd, params.sun.xyz, params.sun.w, params.planetCenter.xyz, params.planetParams.x, params.planetParams.y, params.planetParams.z, params.planetParams.w, params.betaPack.rgb, params.betaPack.w, params.screenParams.x); outColor = vec4<f32>(march.inscatter, 1.0); } textureStore(skyTexture, vec2<i32>(i32(id.x), i32(id.y)), outColor); }";
        this.skyModule = zasfa.createShaderModule({
            code: zasfc
        });
        this.skyPipeline = zasfa.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.skyModule,
                entryPoint: "skyMain"
            }
        });
        this.skyLayout = this.skyPipeline.getBindGroupLayout(0);
        var zasfd = "struct Params { invViewProjection: mat4x4<f32>, sun: vec4<f32>, planetCenter: vec4<f32>, planetParams: vec4<f32>, betaPack: vec4<f32>, screenParams: vec4<f32> }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var opaqueTexture: texture_2d<f32>; @group(0) @binding(2) var opaqueSampler: sampler; @group(0) @binding(3) var sceneDepth: texture_depth_2d; " + zasfb + " struct AOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn aerialVertex(@builtin(vertex_index) vertexIndex: u32) -> AOut { var output: AOut; var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); let p = positions[vertexIndex]; output.position = vec4<f32>(p, 0.0, 1.0); output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return output; } @fragment fn aerialFragment(input: AOut) -> @location(0) vec4<f32> { let screenW = u32(params.screenParams.y); let screenH = u32(params.screenParams.z); let pix = clamp(vec2<i32>(i32(input.position.x), i32(input.position.y)), vec2<i32>(0, 0), vec2<i32>(i32(screenW) - 1, i32(screenH) - 1)); let uv = input.position.xy / vec2<f32>(f32(screenW), f32(screenH)); let opaque = textureSampleLevel(opaqueTexture, opaqueSampler, uv, 0.0); let ndcX = uv.x * 2.0 - 1.0; let ndcY = 1.0 - uv.y * 2.0; var near4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, -1.0, 1.0); let nearPoint = near4.xyz / near4.w; var far4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, 1.0, 1.0); let farPoint = far4.xyz / far4.w; let rayDir = normalize(farPoint - nearPoint); var tEnd = 1e30; if (params.screenParams.w > 0.5) { let depth01 = textureLoad(sceneDepth, pix, 0); var scene4 = params.invViewProjection * vec4<f32>(ndcX, ndcY, depth01 * 2.0 - 1.0, 1.0); let scenePoint = scene4.xyz / scene4.w; tEnd = dot(scenePoint - nearPoint, rayDir); } let shell = raySphereT(nearPoint, rayDir, params.planetCenter.xyz, params.planetParams.y); let hit = raySphereT(nearPoint, rayDir, params.planetCenter.xyz, params.planetParams.x); var tStart = max(0.0, shell.x); var marchEnd = min(tEnd, shell.y); if (hit.x > 0.0) { marchEnd = min(marchEnd, hit.x); } let march = atmosphereMarch(nearPoint, rayDir, tStart, marchEnd, params.sun.xyz, params.sun.w, params.planetCenter.xyz, params.planetParams.x, params.planetParams.y, params.planetParams.z, params.planetParams.w, params.betaPack.rgb, params.betaPack.w, params.screenParams.x); let outColor = clamp(opaque.rgb * march.transmittance + march.inscatter, vec3<f32>(0.0), vec3<f32>(1.0)); return vec4<f32>(outColor, 1.0); }";
        this.aerialModule = zasfa.createShaderModule({
            code: zasfd
        });
        this.aerialPipeline = zasfa.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.aerialModule,
                entryPoint: "aerialVertex"
            },
            fragment: {
                module: this.aerialModule,
                entryPoint: "aerialFragment",
                targets: [ {
                    format: "rgba8unorm"
                } ]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
        this.aerialLayout = this.aerialPipeline.getBindGroupLayout(0);
    }
    setSun(zasfa, zasfb) {
        this.applySun(zasfa);
        if (zasfb !== undefined) this.sunIntensity = Number(zasfb);
        return this;
    }
    setAtmosphere(zasfa) {
        zasfa = zasfa || {};
        var zasfb = zasfa.planetRadius !== undefined ? Number(zasfa.planetRadius) : this.planetRadius;
        var zasfc = zasfa.atmosphereRadius !== undefined ? Number(zasfa.atmosphereRadius) : this.atmosphereRadius;
        if (!(zasfc > zasfb)) throw new Error("AtmosphereRenderer requires atmosphereRadius greater than planetRadius");
        this.planetRadius = zasfb;
        this.atmosphereRadius = zasfc;
        if (zasfa.planetCenter !== undefined) this.applyCenter(zasfa.planetCenter);
        if (zasfa.rayleighHeight !== undefined) this.rayleighHeight = Number(zasfa.rayleighHeight);
        if (zasfa.mieHeight !== undefined) this.mieHeight = Number(zasfa.mieHeight);
        if (zasfa.rayleighBeta !== undefined) this.applyBeta(zasfa.rayleighBeta);
        if (zasfa.mieBeta !== undefined) this.mieBeta = Number(zasfa.mieBeta);
        if (zasfa.mieG !== undefined) this.mieG = Math.min(.95, Math.max(-.95, Number(zasfa.mieG)));
        return this;
    }
    planetData() {
        return [ this.planetCenter.x, this.planetCenter.y, this.planetCenter.z, this.planetRadius, this.atmosphereRadius, this.rayleighHeight, this.mieHeight, this.rayleighBeta[0], this.rayleighBeta[1], this.rayleighBeta[2], this.mieBeta, this.mieG ];
    }
    renderSky(zasfa) {
        if (!zasfa || zasfa.position === undefined) throw new Error("AtmosphereRenderer.renderSky requires a camera");
        var zasfb = this.renderer.device;
        var zasfc = new Float32Array(24);
        zasfc[0] = this.sunDirection.x;
        zasfc[1] = this.sunDirection.y;
        zasfc[2] = this.sunDirection.z;
        zasfc[3] = this.sunIntensity;
        zasfc[4] = this.planetCenter.x;
        zasfc[5] = this.planetCenter.y;
        zasfc[6] = this.planetCenter.z;
        zasfc[7] = 0;
        zasfc[8] = this.planetRadius;
        zasfc[9] = this.atmosphereRadius;
        zasfc[10] = this.rayleighHeight;
        zasfc[11] = this.mieHeight;
        zasfc[12] = this.rayleighBeta[0];
        zasfc[13] = this.rayleighBeta[1];
        zasfc[14] = this.rayleighBeta[2];
        zasfc[15] = this.mieBeta;
        zasfc[16] = this.mieG;
        zasfc[17] = this.skyWidth;
        zasfc[18] = this.skyHeight;
        zasfc[19] = 0;
        zasfc[20] = zasfa.position.x;
        zasfc[21] = zasfa.position.y;
        zasfc[22] = zasfa.position.z;
        zasfc[23] = 0;
        zasfb.queue.writeBuffer(this.skyParams, 0, zasfc);
        var zasfd = zasfb.createBindGroup({
            layout: this.skyLayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.skyParams
                }
            }, {
                binding: 1,
                resource: this.skyTexture.createView()
            } ]
        });
        var zasfe = zasfb.createCommandEncoder();
        var zasff = zasfe.beginComputePass();
        zasff.setPipeline(this.skyPipeline);
        zasff.setBindGroup(0, zasfd);
        zasff.dispatchWorkgroups(Math.ceil(this.skyWidth / 8), Math.ceil(this.skyHeight / 8));
        zasff.end();
        zasfb.queue.submit([ zasfe.finish() ]);
        this.stats.skyRenders++;
        return this.skyTexture;
    }
    render(zasfa, zasfb, zasfc) {
        var zasfd = this.renderer.device;
        if (!zasfc || !zasfc.projectionMatrix || !zasfc.matrixWorldInverse) throw new Error("AtmosphereRenderer.render requires a camera");
        var zasfe = (new Matrix4).multiplyMatrices(zasfc.projectionMatrix, zasfc.matrixWorldInverse);
        var zasff = (new Matrix4).copy(zasfe).invert();
        var zasfg = !!zasfb;
        var zasfh = new Float32Array(36);
        zasfh.set(zasff.elements, 0);
        zasfh[16] = this.sunDirection.x;
        zasfh[17] = this.sunDirection.y;
        zasfh[18] = this.sunDirection.z;
        zasfh[19] = this.sunIntensity;
        zasfh[20] = this.planetCenter.x;
        zasfh[21] = this.planetCenter.y;
        zasfh[22] = this.planetCenter.z;
        zasfh[23] = 0;
        zasfh[24] = this.planetRadius;
        zasfh[25] = this.atmosphereRadius;
        zasfh[26] = this.rayleighHeight;
        zasfh[27] = this.mieHeight;
        zasfh[28] = this.rayleighBeta[0];
        zasfh[29] = this.rayleighBeta[1];
        zasfh[30] = this.rayleighBeta[2];
        zasfh[31] = this.mieBeta;
        zasfh[32] = this.mieG;
        zasfh[33] = this.width;
        zasfh[34] = this.height;
        zasfh[35] = zasfg ? 1 : 0;
        zasfd.queue.writeBuffer(this.aerialParams, 0, zasfh);
        var zasfi = zasfb ? zasfb instanceof GPUTexture ? zasfb.createView() : zasfb : this.dummyDepth.createView();
        var zasfj = zasfd.createBindGroup({
            layout: this.aerialLayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.aerialParams
                }
            }, {
                binding: 1,
                resource: zasfa instanceof GPUTexture ? zasfa.createView() : zasfa
            }, {
                binding: 2,
                resource: this.opaqueSampler
            }, {
                binding: 3,
                resource: zasfi
            } ]
        });
        var zasfk = zasfd.createCommandEncoder();
        var zasfl = zasfk.beginRenderPass({
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
        zasfl.setPipeline(this.aerialPipeline);
        zasfl.setBindGroup(0, zasfj);
        zasfl.draw(3);
        zasfl.end();
        zasfd.queue.submit([ zasfk.finish() ]);
        this.stats.frames++;
        return this.compositeTexture;
    }
    async readbackSky() {
        var zasfa = this.renderer.device;
        var zasfb = this.skyWidth * 16;
        var zasfc = Math.ceil(zasfb / 256) * 256;
        var zasfd = zasfa.createBuffer({
            size: zasfc * this.skyHeight,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zasfe = zasfa.createCommandEncoder();
        zasfe.copyTextureToBuffer({
            texture: this.skyTexture
        }, {
            buffer: zasfd,
            bytesPerRow: zasfc
        }, [ this.skyWidth, this.skyHeight, 1 ]);
        zasfa.queue.submit([ zasfe.finish() ]);
        await zasfa.queue.onSubmittedWorkDone();
        await zasfd.mapAsync(GPUMapMode.READ);
        var zasff = new Uint8Array(zasfd.getMappedRange()).slice();
        zasfd.unmap();
        zasfd.destroy();
        var zasfg = zasfc / 4;
        var zasfh = new Float32Array(zasff.buffer, zasff.byteOffset, zasff.byteLength / 4);
        var zasfi = new Float32Array(this.skyWidth * this.skyHeight * 4);
        for (var zasfj = 0; zasfj < this.skyHeight; zasfj++) {
            var zasfk = zasfj * zasfg;
            var zasfl = zasfj * this.skyWidth * 4;
            for (var zasfm = 0; zasfm < this.skyWidth * 4; zasfm++) zasfi[zasfl + zasfm] = zasfh[zasfk + zasfm];
        }
        return zasfi;
    }
    async readPixels(zasfa) {
        var zasfb = this.renderer.device;
        var zasfc = zasfa || this.compositeTexture;
        var zasfd = Math.ceil(this.width * 4 / 256) * 256;
        var zasfe = zasfb.createBuffer({
            size: zasfd * this.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zasff = zasfb.createCommandEncoder();
        zasff.copyTextureToBuffer({
            texture: zasfc
        }, {
            buffer: zasfe,
            bytesPerRow: zasfd
        }, [ this.width, this.height, 1 ]);
        zasfb.queue.submit([ zasff.finish() ]);
        await zasfb.queue.onSubmittedWorkDone();
        await zasfe.mapAsync(GPUMapMode.READ);
        var zasfg = new Uint8Array(zasfe.getMappedRange());
        var zasfh = new Uint8Array(this.width * 4 * this.height);
        for (var zasfi = 0; zasfi < this.height; zasfi++) zasfh.set(zasfg.subarray(zasfi * zasfd, zasfi * zasfd + this.width * 4), zasfi * this.width * 4);
        zasfe.unmap();
        zasfe.destroy();
        return zasfh;
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

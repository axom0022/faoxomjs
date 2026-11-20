import { ACESFilmicToneMapping, AdditiveBlending, DoubleSide, ReinhardToneMapping } from "../core/index.js";

import { DirectionalLight, Light } from "../lights/index.js";

import { BasicMaterial, LineBasicMaterial, LineMaterial, PointsMaterial, parallaxOcclusionWGSL } from "../materials/index.js";

import { Color, Matrix4, Vector3, faoxomvalue } from "../math/index.js";

import { InstancedMesh, Line, LineLoop, LineSegments, Mesh, Points } from "../objects/index.js";

import { CubeTexture } from "../textures/index.js";

import { GPUDrivenPipeline } from "./GPUDrivenPipeline.js";

import { WebGPUResourceManager } from "./WebGPUResourceManager.js";

class WebGPURenderer {
    constructor(zauma) {
        zauma = zauma || {};
        this.canvas = zauma.canvas || null;
        this.device = null;
        this.adapter = null;
        this.context = null;
        this.format = null;
        this.depthTexture = null;
        this.depthView = null;
        this.shadowTexture = null;
        this.shadowView = null;
        this.shadowSampler = null;
        this.shadowSize = 1024;
        this.shadowReady = false;
        this.shadowPipeline = null;
        this.shadowMatrix = new Matrix4;
        this.width = 1;
        this.height = 1;
        this.pixelRatio = faoxomvalue(zauma.pixelRatio, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
        this.resourceManager = null;
        this.pipelineCache = {};
        this.postProcessing = null;
        this._postLock = false;
        this.gpudriven = null;
        this.gpudrivenEnabled = false;
        this.maxLights = 8;
        this.cameraBuffer = null;
        this.lightBuffer = null;
        this.lightData = new Float32Array(4 + 8 * 20);
        this._modelBuffers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._shadowModelBuffers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._syntheticAttributes = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._skinIndexWrappers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._skinWeightWrappers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._skinPackCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._morphPackCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._morphZeroWrappers = {};
        this._instanceData = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._identityInstanceBuffer = null;
        this.info = {
            render: {
                calls: 0,
                triangles: 0,
                frame: 0
            }
        };
        this.profiler = null;
        this.ledger = null;
        this._cssWidth = undefined;
        this._cssHeight = undefined;
        this.initialized = false;
        this.clearColor = zauma.clearColor instanceof Color ? zauma.clearColor : new Color(faoxomvalue(zauma.clearColor, 0));
        this.cameraRelative = zauma.cameraRelative === true;
        this.exposure = faoxomvalue(zauma.exposure, 1);
        this.toneMapping = zauma.toneMapping === "aces" || zauma.toneMapping === ACESFilmicToneMapping || zauma.toneMapping === 2 ? 2 : zauma.toneMapping === "reinhard" || zauma.toneMapping === ReinhardToneMapping || zauma.toneMapping === 1 ? 1 : faoxomvalue(zauma.toneMapping, 0);
        this.gamma = faoxomvalue(zauma.gamma, 2.2);
    }
    async init() {
        if (this.initialized) return this;
        if (!this.canvas || !this.canvas.getContext || typeof navigator === "undefined" || !navigator.gpu) throw new Error("WebGPU is not available");
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) throw new Error("WebGPU adapter request failed");
        this.device = await this.adapter.requestDevice();
        this.context = this.canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "premultiplied"
        });
        this.resourceManager = new WebGPUResourceManager(this.device);
        if (this.device.addEventListener) this.device.addEventListener("uncapturederror", function(zauma) {
            if (typeof console !== "undefined" && console.error) console.error("WebGPU uncaptured error: " + (zauma && zauma.error ? zauma.error.message : "unknown"));
        });
        var zauma = this;
        this.device.lost.then(function() {
            zauma.initialized = false;
            zauma.device = null;
        });
        this.initialized = true;
        this.resize(this.canvas.clientWidth || this.canvas.width || 1, this.canvas.clientHeight || this.canvas.height || 1);
        return this;
    }
    resize(zauma, zaumb) {
        this._cssWidth = zauma;
        this._cssHeight = zaumb;
        this.width = Math.max(1, Math.floor(zauma * this.pixelRatio));
        this.height = Math.max(1, Math.floor(zaumb * this.pixelRatio));
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
        if (this.device) {
            if (this.depthTexture) this.depthTexture.destroy();
            this.depthTexture = this.device.createTexture({
                size: [ this.width, this.height, 1 ],
                format: "depth24plus",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            });
            this.depthView = this.depthTexture.createView();
        }
        return this;
    }
    setSize(zauma, zaumb) {
        return this.resize(zauma, zaumb);
    }
    getCapabilities() {
        return {
            webgpu: !!this.device,
            adapter: this.adapter ? {
                vendor: this.adapter.info ? this.adapter.info.vendor : "",
                architecture: this.adapter.info ? this.adapter.info.architecture : ""
            } : null,
            format: this.format,
            width: this.width,
            height: this.height,
            maxLights: this.maxLights
        };
    }
    shader(zauma) {
        zauma = zauma || "";
        if (!this._shaderModuleCache) this._shaderModuleCache = {};
        if (this._shaderModuleCache[zauma]) return this._shaderModuleCache[zauma];
        this._nodeBaseCode = this._nodeBaseCode === undefined ? null : this._nodeBaseCode;
        var zaumb = "struct Camera { viewProj: mat4x4<f32>, cameraPosition: vec4<f32>, params: vec4<f32>, shadowMatrix: mat4x4<f32>, shadowParams: vec4<f32> }; struct LightData { position: vec4<f32>, direction: vec4<f32>, color: vec4<f32>, factors: vec4<f32>, kind: vec4<f32> }; struct Lights { count: vec4<f32>, lights: array<LightData, 8> }; struct Model { model: mat4x4<f32>, normal: mat4x4<f32>, baseColor: vec4<f32>, params: vec4<f32>, emissive: vec4<f32>, extra: vec4<f32>, skinData: vec4<f32>, morphWeights: vec4<f32>, flags: vec4<f32>, shading: vec4<f32>, extra2: vec4<f32> }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var shadowTexture: texture_depth_2d; @group(0) @binding(2) var shadowSampler: sampler_comparison; @group(0) @binding(3) var<uniform> lights: Lights; @group(1) @binding(0) var<uniform> modelData: Model; @group(1) @binding(1) var baseTexture: texture_2d<f32>; @group(1) @binding(2) var baseSampler: sampler; @group(1) @binding(3) var normalTexture: texture_2d<f32>; @group(1) @binding(4) var normalSampler: sampler; @group(1) @binding(5) var roughnessTexture: texture_2d<f32>; @group(1) @binding(6) var roughnessSampler: sampler; @group(1) @binding(7) var metalnessTexture: texture_2d<f32>; @group(1) @binding(8) var metalnessSampler: sampler; @group(1) @binding(9) var aoTexture: texture_2d<f32>; @group(1) @binding(10) var aoSampler: sampler; @group(1) @binding(11) var emissiveTexture: texture_2d<f32>; @group(1) @binding(12) var emissiveSampler: sampler; @group(1) @binding(13) var environmentTexture: texture_cube<f32>; @group(1) @binding(14) var environmentSampler: sampler; @group(1) @binding(15) var parallaxTexture: texture_2d<f32>; @group(1) @binding(16) var parallaxSampler: sampler; @group(2) @binding(0) var<storage, read> bones: array<mat4x4<f32>>; struct VertexInput { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) skinIndex: vec4<u32>, @location(4) skinWeight: vec4<f32>, @location(5) morph0: vec3<f32>, @location(6) morph1: vec3<f32>, @location(7) morph2: vec3<f32>, @location(8) morph3: vec3<f32>, @location(9) color: vec3<f32>, @location(10) instanceMatrix0: vec4<f32>, @location(11) instanceMatrix1: vec4<f32>, @location(12) instanceMatrix2: vec4<f32>, @location(13) instanceMatrix3: vec4<f32> }; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) worldPosition: vec3<f32>, @location(1) worldNormal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) color: vec3<f32> }; @vertex fn vertexMain(input: VertexInput) -> VertexOutput { var output: VertexOutput; var localPosition = input.position; var localNormal = input.normal; if (modelData.skinData.x > 0.5) { let skinMatrix = bones[input.skinIndex.x] * input.skinWeight.x + bones[input.skinIndex.y] * input.skinWeight.y + bones[input.skinIndex.z] * input.skinWeight.z + bones[input.skinIndex.w] * input.skinWeight.w; localPosition = (skinMatrix * vec4<f32>(localPosition, 1.0)).xyz; localNormal = (skinMatrix * vec4<f32>(localNormal, 0.0)).xyz; } if (modelData.skinData.y > 0.5) { localPosition = localPosition + input.morph0 * modelData.morphWeights.x + input.morph1 * modelData.morphWeights.y + input.morph2 * modelData.morphWeights.z + input.morph3 * modelData.morphWeights.w; } if (modelData.skinData.z > 0.5) { let instanceMatrix = mat4x4<f32>(input.instanceMatrix0, input.instanceMatrix1, input.instanceMatrix2, input.instanceMatrix3); localPosition = (instanceMatrix * vec4<f32>(localPosition, 1.0)).xyz; localNormal = mat3x3<f32>(instanceMatrix[0].xyz, instanceMatrix[1].xyz, instanceMatrix[2].xyz) * localNormal; } let world = modelData.model * vec4<f32>(localPosition, 1.0); output.position = camera.viewProj * world; output.position.z = output.position.z * 0.5 + output.position.w * 0.5; output.worldPosition = world.xyz; output.worldNormal = normalize((modelData.normal * vec4<f32>(localNormal, 0.0)).xyz); output.uv = input.uv; output.color = input.color; return output; } fn distributionGGX(n: vec3<f32>, h: vec3<f32>, a: f32) -> f32 { let a2 = a * a; let nh = max(dot(n, h), 0.0); let nh2 = nh * nh; let dterm = nh2 * (a2 - 1.0) + 1.0; return a2 / max(3.14159265359 * dterm * dterm, 0.00000001); } fn distributionGGXAnisotropic(n: vec3<f32>, h: vec3<f32>, t: vec3<f32>, b: vec3<f32>, at: f32, ab: f32) -> f32 { let nh = max(dot(n, h), 0.0); let th = dot(t, h) / at; let bh = dot(b, h) / ab; let denom = th * th + bh * bh + nh * nh; return 1.0 / max(3.14159265359 * at * ab * denom * denom, 0.00000001); } fn geometrySchlickGGX(n: f32, k: f32) -> f32 { return n / max(n * (1.0 - k) + k, 0.0001); } fn geometrySmith(n: vec3<f32>, v: vec3<f32>, l: vec3<f32>, k: f32) -> f32 { return geometrySchlickGGX(max(dot(n, v), 0.0), k) * geometrySchlickGGX(max(dot(n, l), 0.0), k); } fn fresnelSchlick(c: f32, f0: vec3<f32>) -> vec3<f32> { return f0 + (vec3<f32>(1.0) - f0) * pow(1.0 - c, 5.0); } fn fresnelScalar(c: f32, f0: f32) -> f32 { return f0 + (1.0 - f0) * pow(1.0 - c, 5.0); } fn smoothStepF(e0: f32, e1: f32, x: f32) -> f32 { let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); } fn thinFilmF0(f0: vec3<f32>, eta2: f32, thickness: f32, cosTheta1: f32) -> vec3<f32> { if (thickness <= 0.0) { return f0; } let sin2 = (1.0 - cosTheta1 * cosTheta1) / (eta2 * eta2); if (sin2 >= 1.0) { return f0; } let cos2 = sqrt(1.0 - sin2); let r12a = (eta2 * cosTheta1 - cos2) / (eta2 * cosTheta1 + cos2); let r12 = r12a * r12a; let r23 = clamp(f0, vec3<f32>(0.0), vec3<f32>(1.0)); let delta = 4.0 * 3.14159265359 * eta2 * thickness * cos2 / vec3<f32>(680.0, 550.0, 440.0); let interference = 2.0 * sqrt(r12 * r23) * cos(delta); return clamp((r12 + r23 + interference) / max(1.0 + r12 * r23 + interference, vec3<f32>(0.0001)), vec3<f32>(0.0), vec3<f32>(1.0)); } @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> { " + parallaxOcclusionWGSL + " let sampled = textureSample(baseTexture, baseSampler, pomUv);  let normalSample = textureSample(normalTexture, normalSampler, pomUv); let roughnessSample = textureSample(roughnessTexture, roughnessSampler, pomUv); let metalnessSample = textureSample(metalnessTexture, metalnessSampler, pomUv); let aoSample = textureSample(aoTexture, aoSampler, pomUv); let emissiveSample = textureSample(emissiveTexture, emissiveSampler, pomUv); let n = normalize(input.worldNormal + (normalSample.xyz * 2.0 - vec3<f32>(1.0)) * modelData.extra.w); let v = normalize(camera.cameraPosition.xyz - input.worldPosition); var base = modelData.baseColor.rgb * sampled.rgb; var alpha = modelData.baseColor.a * sampled.a; if (modelData.flags.z > 0.5 && alpha < modelData.flags.w) { discard; } if (modelData.flags.y > 0.5) { base = base * input.color; } if (modelData.flags.x > 0.5) { return vec4<f32>(base, alpha); } let metallic = clamp(modelData.params.x * metalnessSample.b, 0.0, 1.0); let roughness = clamp(modelData.params.y * roughnessSample.g, 0.04, 1.0); let clearcoat = clamp(modelData.params.z, 0.0, 1.0); let transmission = clamp(modelData.params.w, 0.0, 1.0); let coatR = clamp(modelData.shading.z, 0.04, 1.0); let coatA = coatR * coatR; let aBase = roughness * roughness; var anisoT = vec3<f32>(1.0, 0.0, 0.0); var anisoB = vec3<f32>(0.0, 1.0, 0.0); var at = aBase; var ab = aBase; var anisoOn = modelData.extra.z > 0.0; if (anisoOn) { let anisoStrength = clamp(modelData.extra.z, 0.0, 1.0); let dp1 = dpdx(input.worldPosition); let dp2 = dpdy(input.worldPosition); let du1 = dpdx(input.uv); let du2 = dpdy(input.uv); let det = du1.x * du2.y - du2.x * du1.y; if (abs(det) > 0.0000001) { let dpdu = (dp1 * du2.y - dp2 * du1.y) / det; let tRaw = normalize(dpdu); anisoT = normalize(tRaw - n * dot(tRaw, n)); anisoB = normalize(cross(n, anisoT)); let rotCa = cos(modelData.extra2.x); let rotSa = sin(modelData.extra2.x); let rotT = anisoT * rotCa + anisoB * rotSa; let rotB = anisoB * rotCa - anisoT * rotSa; anisoT = rotT; anisoB = rotB; at = max(aBase * (1.0 + anisoStrength * 0.9), 0.0001); ab = max(aBase * (1.0 - anisoStrength * 0.9), 0.0001); } else { anisoOn = false; } } let ndv = max(dot(n, v), 0.001); var f0 = mix(vec3<f32>(0.04), base, metallic); if (modelData.extra.y > 0.0) { f0 = mix(f0, thinFilmF0(f0, 1.69, modelData.shading.w, ndv), clamp(modelData.extra.y, 0.0, 1.0)); } var shadowVisibility = 1.0; if (camera.shadowParams.x > 0.5) { let shadowPosition = camera.shadowMatrix * vec4<f32>(input.worldPosition, 1.0); let shadowUv = shadowPosition.xyz / max(shadowPosition.w, 0.0001); let inBounds = shadowUv.x >= 0.0 && shadowUv.x <= 1.0 && shadowUv.y >= 0.0 && shadowUv.y <= 1.0 && shadowUv.z >= 0.0 && shadowUv.z <= 1.0; let sampled = textureSampleCompare(shadowTexture, shadowSampler, clamp(shadowUv.xy, vec2<f32>(0.0), vec2<f32>(1.0)), shadowUv.z - camera.shadowParams.y); shadowVisibility = select(1.0, sampled, inBounds); } var lo = vec3<f32>(0.0); for (var i = 0; i < 8; i = i + 1) { if (f32(i) >= lights.count.x) { break; } let light = lights.lights[i]; let intensity = light.factors.x; let kind = light.kind.x; if (kind < 0.5) { lo = lo + base * light.color.rgb * intensity; continue; } var l = vec3<f32>(0.0, 0.0, 1.0); var attenuation = 1.0; if (kind < 1.5) { l = normalize(-light.direction.xyz); } else { let delta = light.position.xyz - input.worldPosition; let distanceToLight = length(delta); l = normalize(delta); if (light.factors.y > 0.0) { attenuation = max(0.0, 1.0 - distanceToLight / light.factors.y); } attenuation = attenuation * (1.0 / (1.0 + distanceToLight * distanceToLight * 0.015)); if (kind > 2.5 && kind < 3.5) { let cone = dot(normalize(light.direction.xyz), -l); let edge = light.factors.z; let inner = edge * (1.0 - light.factors.w); attenuation = attenuation * smoothStepF(edge, inner, cone); } } let radiance = light.color.rgb * intensity * attenuation; let lightShadow = select(1.0, shadowVisibility, kind < 1.5); let ndl = max(dot(n, l), 0.0); if (ndl > 0.0) { let h = normalize(v + l); var d = distributionGGX(n, h, aBase); if (anisoOn) { d = distributionGGXAnisotropic(n, h, anisoT, anisoB, at, ab); } let g = geometrySmith(n, v, l, (roughness + 1.0) * (roughness + 1.0) / 8.0); let f = fresnelSchlick(max(dot(h, v), 0.0), f0); let specular = (d * g * f) / max(4.0 * ndv * ndl, 0.001); let kd = (vec3<f32>(1.0) - f) * (1.0 - metallic); lo = lo + (kd * base / 3.14159265359 + specular) * radiance * ndl * lightShadow; if (clearcoat > 0.0) { let coatD = distributionGGX(n, h, coatA); let coatG = geometrySmith(n, v, l, (coatR + 1.0) * (coatR + 1.0) / 8.0); let coatFres = fresnelScalar(max(dot(h, v), 0.0), 0.04); lo = lo + vec3<f32>(clearcoat * coatD * coatG * coatFres / max(4.0 * ndv * ndl, 0.001)) * radiance * ndl * lightShadow; } } } var ambient = base * (1.0 - metallic) * 0.03 * aoSample.r; if (modelData.skinData.w > 0.5) { let irradiance = textureSample(environmentTexture, environmentSampler, n).rgb; let reflectionDirection = reflect(-v, n); let environmentLod = clamp(roughness * 5.0, 0.0, 8.0); let prefiltered = textureSampleLevel(environmentTexture, environmentSampler, reflectionDirection, environmentLod).rgb; let fenv = fresnelSchlick(ndv, f0); let envInt = modelData.shading.x; ambient = ambient + ((1.0 - fenv) * base * (1.0 - metallic) + prefiltered * fenv) * envInt * aoSample.r; ambient = ambient + irradiance * base * (1.0 - metallic) * 0.08 * envInt; } var finalColor = ambient + lo; if (transmission > 0.0) { let refracted = refract(-v, n, 0.6667); var transmitted = base * 0.4; if (modelData.skinData.w > 0.5) { transmitted = textureSampleLevel(environmentTexture, environmentSampler, refracted, clamp(roughness * 5.0, 0.0, 8.0)).rgb * mix(vec3<f32>(1.0), base, 0.25); } let transF0 = 0.04; let transFresnel = transF0 + (1.0 - transF0) * pow(1.0 - ndv, 5.0); finalColor = mix(finalColor, transmitted, transmission * (1.0 - transFresnel)); } var mapped = (finalColor + modelData.emissive.rgb * modelData.shading.y + emissiveSample.rgb) * camera.params.x; if (camera.params.y > 0.5 && camera.params.y < 1.5) { mapped = mapped / (mapped + vec3<f32>(1.0)); } else if (camera.params.y > 1.5) { var toneInput = max(mapped - vec3<f32>(0.004), vec3<f32>(0.0)); mapped = (toneInput * (6.2 * toneInput + 0.5)) / (toneInput * (6.2 * toneInput + 1.7) + 0.06); } return vec4<f32>(pow(max(mapped, vec3<f32>(0.0)), vec3<f32>(1.0 / max(camera.params.z, 0.1))), alpha); }";
        if (this._nodeBaseCode === null) this._nodeBaseCode = zaumb;
        if (zauma.indexOf("mega") >= 0) {
            zaumb = zaumb.replace("@location(13) instanceMatrix3: vec4<f32> };", "@location(13) instanceMatrix3: vec4<f32>, @location(14) materialIndex: f32 };");
            zaumb = zaumb.replace("@location(3) color: vec3<f32> };", "@location(3) color: vec3<f32>, @location(4) materialIndex: f32 };");
            zaumb = zaumb.replace("output.color = input.color;", "output.color = input.color;\noutput.materialIndex = input.materialIndex;");
            zaumb = zaumb.replace("var<storage, read> bones: array<mat4x4<f32>>;", "var<storage, read> bones: array<mat4x4<f32>>;\n@group(3) @binding(0) var<storage, read> megamaterials: array<vec4<f32>>;");
            zaumb = zaumb.replace("var base = modelData.baseColor.rgb * sampled.rgb;", "let mmIndex = u32(input.materialIndex + 0.5) * 4u;\nlet mm0 = megamaterials[mmIndex];\nlet mm1 = megamaterials[mmIndex + 1u];\nlet mm2 = megamaterials[mmIndex + 2u];\nvar base = mm0.rgb * sampled.rgb;");
            zaumb = zaumb.replace("var alpha = modelData.baseColor.a * sampled.a;", "var alpha = mm0.a * sampled.a;");
            zaumb = zaumb.replace("let metallic = clamp(modelData.params.x * metalnessSample.b, 0.0, 1.0);", "let metallic = clamp(mm1.x * metalnessSample.b, 0.0, 1.0);");
            zaumb = zaumb.replace("let roughness = clamp(modelData.params.y * roughnessSample.g, 0.04, 1.0);", "let roughness = clamp(mm1.y * roughnessSample.g, 0.04, 1.0);");
            zaumb = zaumb.replace("modelData.emissive.rgb * modelData.shading.y", "mm2.rgb * mm1.z");
        }
        if (zauma.indexOf("clustered") >= 0) {
            var zaumc = zauma.indexOf("mega") >= 0 ? 1 : 0;
            zaumb = zaumb.replace("var<storage, read> bones: array<mat4x4<f32>>;", "var<storage, read> bones: array<mat4x4<f32>>;\nstruct ClusterShadeParams { viewmatrix: mat4x4<f32>, params0: vec4<f32>, params1: vec4<f32>, params2: vec4<f32> };\n@group(3) @binding(" + zaumc + ") var<storage, read> clusterLights: array<u32>;\n@group(3) @binding(" + (zaumc + 1) + ") var<storage, read> clusterLightData: array<vec4<f32>>;\n@group(3) @binding(" + (zaumc + 2) + ") var<uniform> clusterParams: ClusterShadeParams;");
            zaumb = zaumb.replace("let kind = light.kind.x;", "let kind = light.kind.x;\nif (kind > 1.5 && kind < 2.5) { continue; }");
            zaumb = zaumb.replace("var ambient = base * (1.0 - metallic) * 0.03 * aoSample.r;", "{ let cpos = (clusterParams.viewmatrix * vec4<f32>(input.worldPosition, 1.0)).xyz;\nvar cd = -cpos.z;\nvar cgz = i32(floor(clusterParams.params0.z * log(cd / clusterParams.params1.z) / log(clusterParams.params1.w / clusterParams.params1.z)));\ncgz = clamp(cgz, 0, i32(clusterParams.params0.z) - 1);\nvar cd1 = clusterParams.params1.z * pow(clusterParams.params1.w / clusterParams.params1.z, (f32(cgz) + 1.0) / clusterParams.params0.z);\nvar chy1 = cd1 * clusterParams.params1.x;\nvar chx1 = chy1 * clusterParams.params1.y;\nvar cgx = i32(floor((cpos.x + chx1) / (2.0 * chx1) * clusterParams.params0.x));\ncgx = clamp(cgx, 0, i32(clusterParams.params0.x) - 1);\nvar cgy = i32(floor((cpos.y + chy1) / (2.0 * chy1) * clusterParams.params0.y));\ncgy = clamp(cgy, 0, i32(clusterParams.params0.y) - 1);\nvar cslot = u32((cgz * i32(clusterParams.params0.y) + cgy) * i32(clusterParams.params0.x) + cgx) * 17u;\nvar ccount = clusterLights[cslot];\nfor (var ci = 0u; ci < ccount; ci = ci + 1u) {\nvar cli = clusterLights[cslot + 1u + ci];\nvar cposr = clusterLightData[cli * 2u];\nvar ccol = clusterLightData[cli * 2u + 1u];\nvar cdelta = cposr.xyz - input.worldPosition;\nvar cdist = length(cdelta);\nvar cl2 = normalize(cdelta);\nvar catt = 1.0;\nif (cposr.w > 0.0) { catt = max(0.0, 1.0 - cdist / cposr.w); }\ncatt = catt * (1.0 / (1.0 + cdist * cdist * 0.015));\nvar cradiance = ccol.rgb * ccol.w * catt;\nvar cndl = max(dot(n, cl2), 0.0);\nif (cndl > 0.0) {\nvar ch = normalize(v + cl2);\nvar cdistggx = distributionGGX(n, ch, aBase);\nvar cgeo = geometrySmith(n, v, cl2, (roughness + 1.0) * (roughness + 1.0) / 8.0);\nvar cfres = fresnelSchlick(max(dot(ch, v), 0.0), f0);\nvar cspec = (cdistggx * cgeo * cfres) / max(4.0 * ndv * cndl, 0.001);\nvar ckd = (vec3<f32>(1.0) - cfres) * (1.0 - metallic);\nlo = lo + (ckd * base / 3.14159265359 + cspec) * cradiance * cndl;\n}\n} }\nvar ambient = base * (1.0 - metallic) * 0.03 * aoSample.r;");
        }
        if (zauma.indexOf("dgiar") >= 0) {
            var zaumd = (zauma.indexOf("mega") >= 0 ? 1 : 0) + (zauma.indexOf("clustered") >= 0 ? 3 : 0);
            zaumb = zaumb.replace("var<storage, read> bones: array<mat4x4<f32>>;", "var<storage, read> bones: array<mat4x4<f32>>;\nstruct DgParams { origin: vec4<f32>, gridinfo: vec4<f32>, spacing: vec4<f32>, misc: vec4<f32> };\n@group(3) @binding(" + zaumd + ") var<storage, read> dgiatlas: array<vec4<f32>>;\n@group(3) @binding(" + (zaumd + 1) + ") var<uniform> dgp: DgParams;");
            zaumb = zaumb.replace("fn smoothStepF(e0: f32, e1: f32, x: f32) -> f32 {", "fn fxioct(dirn: vec3<f32>) -> vec2<f32> { var asum = abs(dirn.x) + abs(dirn.y) + abs(dirn.z); var p = dirn.xy / max(asum, 0.000001); if (dirn.z < 0.0) { p = vec2<f32>(1.0 - abs(p.y), 1.0 - abs(p.x)) * vec2<f32>(select(-1.0, 1.0, p.x >= 0.0), select(-1.0, 1.0, p.y >= 0.0)); } return p * 0.5 + vec2<f32>(0.5); }\nfn fxii(p: vec3<f32>, dirn: vec3<f32>) -> vec3<f32> { var g = (p - dgp.origin.xyz) / dgp.spacing.xyz; var gx = floor(g.x); var gy = floor(g.y); var gz = floor(g.z); var fxw = g.x - gx; var fyw = g.y - gy; var fzw = g.z - gz; var oct = fxioct(dirn); var tu = clamp(i32(floor(oct.x * 8.0)), 0, 7); var tv = clamp(i32(floor(oct.y * 8.0)), 0, 7); var texel = u32(tv * 8 + tu); var nxg = dgp.gridinfo.x; var nyg = dgp.gridinfo.y; var nzg = dgp.gridinfo.z; var sum = vec3<f32>(0.0); for (var c = 0u; c < 8u; c = c + 1u) { var wx = select(1.0 - fxw, fxw, (c & 1u) == 1u); var wy = select(1.0 - fyw, fyw, (c & 2u) == 2u); var wz = select(1.0 - fzw, fzw, (c & 4u) == 4u); var cx = gx + f32(c & 1u); var cy = gy + f32((c >> 1u) & 1u); var cz = gz + f32((c >> 2u) & 1u); if (cx >= 0.0 && cy >= 0.0 && cz >= 0.0 && cx < nxg && cy < nyg && cz < nzg) { var probe = u32((cz * nyg + cy) * nxg + cx); var base = (probe * 64u + texel) * 2u; var m1 = dgiatlas[base + 1u].x; var m2 = dgiatlas[base + 1u].y; var pp = dgp.origin.xyz + vec3<f32>(cx, cy, cz) * dgp.spacing.xyz; var pd = length(p - pp); var wcheb = 1.0; if (pd > m1 && m1 > 0.0) { var variance = max(m2 - m1 * m1, 0.0); wcheb = variance / (variance + (pd - m1) * (pd - m1)); } sum = sum + dgiatlas[base].rgb * (wx * wy * wz * wcheb); } } return sum; }\nfn smoothStepF(e0: f32, e1: f32, x: f32) -> f32 {");
            zaumb = zaumb.replace("var ambient = base * (1.0 - metallic) * 0.03 * aoSample.r;", "var ambient = base * (1.0 - metallic) * 0.03 * aoSample.r;\nambient = ambient + fxii(input.worldPosition, n) * base * (1.0 - metallic) * aoSample.r * 0.3183098861837907;\nambient = ambient + fxii(input.worldPosition, reflect(-v, n)) * fresnelSchlick(ndv, f0);");
        }
        var zaume = this.device.createShaderModule({
            code: zaumb
        });
        this._shaderModuleCache[zauma] = zaume;
        return zaume;
    }
    megaVertexBuffers(zauma, zaumb) {
        if (zauma && zauma.indexOf("mega") >= 0) {
            zaumb.push({
                arrayStride: 4,
                attributes: [ {
                    shaderLocation: 14,
                    offset: 0,
                    format: "float32"
                } ]
            });
        }
        return zaumb;
    }
    setMegaMaterials(zauma) {
        zauma = zauma || [];
        if (!this.megaMaterialBuffer) this.megaMaterialBuffer = this.device.createBuffer({
            size: 65536,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        var zaumb = new Float32Array(1024 * 16);
        var zaumc = Math.min(zauma.length, 1024);
        for (var zaumd = 0; zaumd < zaumc; zaumd++) {
            var zaume = zauma[zaumd] || {};
            var zaumf = zaume.color;
            var zaumg = 1, zaumh = 1, zaumi = 1, zaumj = 1;
            if (zaumf && typeof zaumf === "object" && (zaumf.r !== undefined || zaumf[0] !== undefined)) {
                zaumg = zaumf.r !== undefined ? zaumf.r : zaumf[0];
                zaumh = zaumf.g !== undefined ? zaumf.g : zaumf[1];
                zaumi = zaumf.b !== undefined ? zaumf.b : zaumf[2];
                zaumj = zaumf.a !== undefined ? zaumf.a : zaumf[3] !== undefined ? zaumf[3] : 1;
            } else if (typeof zaumf === "number") {
                zaumg = (zaumf >> 16 & 255) / 255;
                zaumh = (zaumf >> 8 & 255) / 255;
                zaumi = (zaumf & 255) / 255;
                zaumj = 1;
            }
            var zaumk = zaumd * 16;
            zaumb[zaumk] = zaumg;
            zaumb[zaumk + 1] = zaumh;
            zaumb[zaumk + 2] = zaumi;
            zaumb[zaumk + 3] = zaumj;
            zaumb[zaumk + 4] = zaume.metalness !== undefined ? zaume.metalness : 0;
            zaumb[zaumk + 5] = zaume.roughness !== undefined ? zaume.roughness : 1;
            zaumb[zaumk + 6] = zaume.emissiveIntensity !== undefined ? zaume.emissiveIntensity : 1;
            zaumb[zaumk + 7] = 0;
            var zauml = zaume.emissive;
            if (zauml && typeof zauml === "object" && (zauml.r !== undefined || zauml[0] !== undefined)) {
                zaumb[zaumk + 8] = zauml.r !== undefined ? zauml.r : zauml[0];
                zaumb[zaumk + 9] = zauml.g !== undefined ? zauml.g : zauml[1];
                zaumb[zaumk + 10] = zauml.b !== undefined ? zauml.b : zauml[2];
            } else if (typeof zauml === "number") {
                zaumb[zaumk + 8] = (zauml >> 16 & 255) / 255;
                zaumb[zaumk + 9] = (zauml >> 8 & 255) / 255;
                zaumb[zaumk + 10] = (zauml & 255) / 255;
            } else {
                zaumb[zaumk + 8] = 0;
                zaumb[zaumk + 9] = 0;
                zaumb[zaumk + 10] = 0;
            }
        }
        if (zaumc > 0) this.device.queue.writeBuffer(this.megaMaterialBuffer, 0, zaumb.subarray(0, zaumc * 16));
        this.megaMaterialCount = zaumc;
        return this;
    }
    variantBindFor(zauma, zaumb) {
        if (!this._variantBindCache) this._variantBindCache = typeof Map !== "undefined" ? new Map : null;
        var zaumc = this._variantBindCache && this._variantBindCache.get(zauma);
        if (zaumc && zaumc[zaumb]) return zaumc[zaumb];
        var zaumd = zauma.getBindGroupLayout(3);
        var zaume = [];
        var zaumf = zaumb.indexOf("mega") >= 0;
        if (zaumf) zaume.push({
            binding: 0,
            resource: {
                buffer: this.megaMaterialBuffer
            }
        });
        if (zaumb.indexOf("clustered") >= 0) {
            var zaumg = this.clusteredLighting;
            var zaumh = zaumf ? 1 : 0;
            zaume.push({
                binding: zaumh,
                resource: {
                    buffer: zaumg.clusterbuffer
                }
            });
            zaume.push({
                binding: zaumh + 1,
                resource: {
                    buffer: zaumg.lightbuffer
                }
            });
            zaume.push({
                binding: zaumh + 2,
                resource: {
                    buffer: zaumg.paramsbuffer
                }
            });
        }
        if (zaumb.indexOf("dgiar") >= 0) {
            var zaumi = this.fxomdgiar;
            var zaumj = (zaumf ? 1 : 0) + (zaumb.indexOf("clustered") >= 0 ? 3 : 0);
            zaume.push({
                binding: zaumj,
                resource: {
                    buffer: zaumi.atlasbuffer
                }
            });
            zaume.push({
                binding: zaumj + 1,
                resource: {
                    buffer: zaumi.shadebuffer
                }
            });
        }
        var zaumk = this.device.createBindGroup({
            layout: zaumd,
            entries: zaume
        });
        if (!zaumc) {
            zaumc = {};
            if (this._variantBindCache) this._variantBindCache.set(zauma, zaumc);
        }
        zaumc[zaumb] = zaumk;
        return zaumk;
    }
    cameraBindFor(zauma) {
        if (!this._cameraBindCache) this._cameraBindCache = typeof Map !== "undefined" ? new Map : null;
        var zaumb = this._cameraBindCache && this._cameraBindCache.get(zauma);
        if (zaumb) return zaumb;
        var zaumc = this.device.createBindGroup({
            layout: zauma.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.cameraBuffer
                }
            }, {
                binding: 1,
                resource: this.shadowView
            }, {
                binding: 2,
                resource: this.shadowSampler
            }, {
                binding: 3,
                resource: {
                    buffer: this.lightBuffer
                }
            } ]
        });
        if (this._cameraBindCache) this._cameraBindCache.set(zauma, zaumc);
        return zaumc;
    }
    nodeShaderFor(zauma) {
        if (!this._nodeBaseCode) {
            this._nodeBaseCode = null;
            this.shader("");
        }
        var zaumb = this._nodeBaseCode.indexOf("@fragment fn fragmentMain");
        var zaumc = this._nodeBaseCode.slice(zaumb);
        var zaumd = zauma.buildFragment(zaumc);
        var zaume = 5381;
        for (var zaumf = 0; zaumf < zaumd.length; zaumf++) zaume = (zaume << 5) + zaume + zaumd.charCodeAt(zaumf) | 0;
        zaume = zaume >>> 0;
        zauma._nodeHash = zaume;
        if (!this._nodeModuleCache) this._nodeModuleCache = {};
        if (this._nodeModuleCache[zaume]) return this._nodeModuleCache[zaume];
        var zaumg = this.device.createShaderModule({
            code: this._nodeBaseCode.slice(0, zaumb) + zaumd
        });
        this._nodeModuleCache[zaume] = zaumg;
        return zaumg;
    }
    pipelineFor(zauma, zaumb, zaumc, zaumd) {
        zaumb = zaumb || "triangle-list";
        zaumc = zaumc || this._targetFormat || this.format;
        zaumd = zaumd || "";
        var zaume = (zauma && zauma.type ? zauma.type : "material") + "|" + (zauma && zauma.transparent ? 1 : 0) + "|" + (zauma && zauma.blending === AdditiveBlending ? "add" : "normal") + "|" + (zauma && (zauma.side === DoubleSide || zauma.side === "double") ? "double" : "front") + "|" + zaumb + "|" + (zauma && zauma.depthWrite === false ? "nowrite" : "write") + "|" + zaumc + "|" + zaumd;
        var zaumf = zauma && zauma.isFNMaterial ? this.nodeShaderFor(zauma) : null;
        if (zaumf) zaume += "|node" + zauma._nodeHash;
        if (this.pipelineCache[zaume]) return this.pipelineCache[zaume];
        var zaumg = zaumf ? zaumf : this.shader(zaumd);
        var zaumh = zauma && zauma.blending === AdditiveBlending;
        var zaumi = zauma && zauma.transparent ? {
            color: {
                srcFactor: zaumh ? "one" : "src-alpha",
                dstFactor: zaumh ? "one" : "one-minus-src-alpha",
                operation: "add"
            },
            alpha: {
                srcFactor: zaumh ? "one" : "one",
                dstFactor: zaumh ? "one" : "one-minus-src-alpha",
                operation: "add"
            }
        } : undefined;
        var zaumj = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: zaumg,
                entryPoint: "vertexMain",
                buffers: this.megaVertexBuffers(zaumd, [ {
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
            fragment: {
                module: zaumg,
                entryPoint: "fragmentMain",
                targets: [ {
                    format: zaumc,
                    blend: zaumi
                } ]
            },
            primitive: {
                topology: zaumb,
                cullMode: zaumb !== "triangle-list" ? "none" : zauma && (zauma.side === DoubleSide || zauma.side === "double") ? "none" : "back"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: !(zauma && zauma.transparent),
                depthCompare: "less"
            }
        });
        this.pipelineCache[zaume] = zaumj;
        return zaumj;
    }
    topologyFor(zauma) {
        return zauma instanceof LineSegments ? "line-list" : zauma instanceof LineLoop ? "line-strip" : zauma instanceof Line ? "line-strip" : zauma instanceof Points ? "point-list" : "triangle-list";
    }
    attribute(zauma, zaumb, zaumc, zaumd) {
        var zaume = zauma.geometry && zauma.geometry.attributes ? zauma.geometry.attributes[zaumb] : null;
        if (zaume) return zaume;
        var zaumf = zauma.geometry;
        var zaumg = this._syntheticAttributes && this._syntheticAttributes.get(zaumf);
        if (zaumg && zaumg[zaumb]) return zaumg[zaumb];
        var zaumh = zaumf && zaumf.attributes && zaumf.attributes.position ? zaumf.attributes.position.array.length / 3 : 0;
        var zaumi = new Float32Array(zaumh * zaumc);
        for (var zaumj = 0; zaumj < zaumh; zaumj++) for (var zaumk = 0; zaumk < zaumc; zaumk++) zaumi[zaumj * zaumc + zaumk] = zaumd[zaumk] || 0;
        var zauml = {
            array: zaumi,
            itemSize: zaumc
        };
        if (this._syntheticAttributes && zaumf) {
            if (!zaumg) {
                zaumg = {};
                this._syntheticAttributes.set(zaumf, zaumg);
            }
            zaumg[zaumb] = zauml;
        }
        return zauml;
    }
    modelBufferFor(zauma) {
        var zaumb = this._modelBuffers && this._modelBuffers.get(zauma);
        if (zaumb) return zaumb;
        zaumb = this.resourceManager.uniform(288);
        if (this._modelBuffers) this._modelBuffers.set(zauma, zaumb);
        return zaumb;
    }
    identityInstanceBuffer() {
        if (this._identityInstanceBuffer) return this._identityInstanceBuffer;
        this._identityInstanceBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this._identityInstanceBuffer.getMappedRange()).set([ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]);
        this._identityInstanceBuffer.unmap();
        return this._identityInstanceBuffer;
    }
    instanceResource(zauma) {
        var zaumb = this._instanceData && this._instanceData.get(zauma);
        var zaumc = zauma instanceof InstancedMesh ? Math.max(1, zauma.count | 0) : 1;
        if (zaumb && zaumb.count >= zaumc) {
            for (var zaumd = 0; zaumd < zaumc; zaumd++) {
                zauma.getMatrixAt(zaumd, zaumb.matrix);
                zaumb.array.set(zaumb.matrix.elements, zaumd * 16);
            }
            this.device.queue.writeBuffer(zaumb.buffer, 0, zaumb.array, 0, zaumc * 16);
            return {
                buffer: zaumb.buffer,
                count: zaumc
            };
        }
        var zaume = new Float32Array(zaumc * 16);
        var zaumf = new Matrix4;
        for (var zaumg = 0; zaumg < zaumc; zaumg++) {
            zauma.getMatrixAt(zaumg, zaumf);
            zaume.set(zaumf.elements, zaumg * 16);
        }
        var zaumh = this.device.createBuffer({
            size: zaumc * 64 + 3 & ~3,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(zaumh.getMappedRange()).set(zaume);
        zaumh.unmap();
        zaumb = {
            buffer: zaumh,
            array: zaume,
            matrix: zaumf,
            count: zaumc
        };
        if (this._instanceData) this._instanceData.set(zauma, zaumb);
        return {
            buffer: zaumh,
            count: zaumc
        };
    }
    collectLights(zauma) {
        var zaumb = [];
        zauma.traverseVisible(function(zauma) {
            if (zauma instanceof Light && zaumb.length < 8) zaumb.push(zauma);
        });
        return zaumb;
    }
    uploadLights(zauma) {
        var zaumb = this.lightData;
        zaumb[0] = zauma.length;
        for (var zaumc = 0; zaumc < 8; zaumc++) {
            var zaumd = 4 + zaumc * 20;
            if (zaumc < zauma.length) {
                var zaume = zauma[zaumc];
                var zaumf = (new Vector3).setFromMatrixPosition(zaume.matrixWorld);
                var zaumg = zaume.target ? (new Vector3).setFromMatrixPosition(zaume.target.matrixWorld).sub(zaumf).normalize() : new Vector3(0, -1, 0);
                var zaumh = zaume.type === "AmbientLight" ? 0 : zaume.type === "DirectionalLight" ? 1 : zaume.type === "SpotLight" ? 3 : zaume.type === "HemisphereLight" ? 4 : 2;
                var zaumi = this._originShift;
                zaumb[zaumd] = zaumf.x - (zaumi ? zaumi.x : 0);
                zaumb[zaumd + 1] = zaumf.y - (zaumi ? zaumi.y : 0);
                zaumb[zaumd + 2] = zaumf.z - (zaumi ? zaumi.z : 0);
                zaumb[zaumd + 3] = 0;
                zaumb[zaumd + 4] = zaumg.x;
                zaumb[zaumd + 5] = zaumg.y;
                zaumb[zaumd + 6] = zaumg.z;
                zaumb[zaumd + 7] = 0;
                zaumb[zaumd + 8] = zaume.color.r;
                zaumb[zaumd + 9] = zaume.color.g;
                zaumb[zaumd + 10] = zaume.color.b;
                zaumb[zaumd + 11] = 0;
                zaumb[zaumd + 12] = zaume.intensity;
                zaumb[zaumd + 13] = zaume.distance || 0;
                zaumb[zaumd + 14] = zaume.angle ? Math.cos(zaume.angle) : -1;
                zaumb[zaumd + 15] = zaume.penumbra || 0;
                zaumb[zaumd + 16] = zaumh;
                zaumb[zaumd + 17] = 0;
                zaumb[zaumd + 18] = 0;
                zaumb[zaumd + 19] = 0;
            } else {
                for (var zaumj = 0; zaumj < 20; zaumj++) zaumb[zaumd + zaumj] = 0;
            }
        }
        this.device.queue.writeBuffer(this.lightBuffer, 0, zaumb);
        return this;
    }
    render(zauma, zaumb) {
        if (this.postProcessing && !this._postLock) return this.postProcessing.render(zauma, zaumb);
        if (!this.initialized || !zauma || !zaumb) return;
        zauma.updateMatrixWorld(true);
        zaumb.updateMatrixWorld(true);
        if (!this.cameraBuffer) this.cameraBuffer = this.resourceManager.uniform(176);
        if (!this.lightBuffer) this.lightBuffer = this.resourceManager.uniform(656);
        var zaumc = null;
        if (this.cameraRelative) {
            var zaumd = zaumb.matrixWorld.elements;
            zaumc = {
                x: zaumd[12],
                y: zaumd[13],
                z: zaumd[14]
            };
        }
        this._originShift = zaumc;
        var zaume;
        if (zaumc) {
            var zaumf = (new Matrix4).makeTranslation(zaumc.x, zaumc.y, zaumc.z);
            var zaumg = (new Matrix4).multiplyMatrices(zaumb.matrixWorldInverse, zaumf);
            zaume = (new Matrix4).multiplyMatrices(zaumb.projectionMatrix, zaumg);
        } else zaume = (new Matrix4).multiplyMatrices(zaumb.projectionMatrix, zaumb.matrixWorldInverse);
        var zaumh = null;
        zauma.traverseVisible(function(zauma) {
            if (!zaumh && zauma instanceof DirectionalLight && (zauma.castShadow || zauma.shadow && zauma.shadow.enabled)) zaumh = zauma;
        });
        if (zaumh) this.renderShadowMap(zauma, zaumh); else this.ensureShadowResources();
        var zaumi = new Float32Array(44);
        zaumi.set(zaume.elements, 0);
        zaumi[16] = zaumc ? 0 : zaumb.position.x;
        zaumi[17] = zaumc ? 0 : zaumb.position.y;
        zaumi[18] = zaumc ? 0 : zaumb.position.z;
        zaumi[19] = 1;
        zaumi[20] = this.exposure;
        zaumi[21] = this.toneMapping;
        zaumi[22] = this.gamma;
        zaumi.set(this.shadowMatrix.elements, 24);
        zaumi[40] = this.shadowReady ? 1 : 0;
        zaumi[41] = zaumh && zaumh.shadow ? zaumh.shadow.bias || 5e-4 : 5e-4;
        this.device.queue.writeBuffer(this.cameraBuffer, 0, zaumi);
        this.uploadLights(this.collectLights(zauma));
        if (this.gpudrivenEnabled && this.gpudriven && this.gpudriven.twoPhase) this.gpudriven.beginFrame(this, zauma, zaumb, zaume);
        var zaumj = this._targetView || this.context.getCurrentTexture().createView();
        var zaumk = this.device.createCommandEncoder();
        var zauml = this.profiler;
        var zaumm = {
            colorAttachments: [ {
                view: zaumj,
                clearValue: {
                    r: this.clearColor.r,
                    g: this.clearColor.g,
                    b: this.clearColor.b,
                    a: 1
                },
                loadOp: "clear",
                storeOp: "store"
            } ],
            depthStencilAttachment: {
                view: this._targetDepthView || this.depthView,
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        };
        if (zauml && zauml.enabled) zaumm = zauml.passDescriptor("main", zaumm);
        var zaumn = zaumk.beginRenderPass(zaumm);
        var zaumo = this;
        this.info.render.calls = 0;
        this.info.render.triangles = 0;
        var zaump = [], zaumq = [];
        zauma.traverseVisible(function(zauma) {
            if (!(zauma instanceof Mesh) || !zauma.geometry || !zauma.geometry.attributes || !zauma.geometry.attributes.position) return;
            if (zauma.material && zauma.material.transparent) zaumq.push(zauma); else zaump.push(zauma);
        });
        var zaumr = function(zaumb) {
            var zaumc = zaumo.topologyFor(zaumb);
            var zaumd = (zaumb.megaMaterial ? "mega" : "") + (zaumb.clusteredShading ? "clustered" : "") + (zaumb.dgiar ? "dgiar" : "");
            var zaume = zaumo.pipelineFor(zaumb.material, zaumc, undefined, zaumd);
            var zaumf = zaumo.cameraBindFor(zaume);
            var zaumg = zaumo.attribute(zaumb, "position", 3, [ 0, 0, 0 ]);
            var zaumh = zaumo.attribute(zaumb, "normal", 3, [ 0, 1, 0 ]);
            var zaumi = zaumo.attribute(zaumb, "uv", 2, [ 0, 0 ]);
            var zaumj = zaumo.attribute(zaumb, "color", 3, [ 1, 1, 1 ]);
            var zaumk = zaumo.resourceManager.buffer(zaumg, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zauml = zaumo.resourceManager.buffer(zaumh, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zaumm = zaumo.resourceManager.buffer(zaumi, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zaump = zaumo.resourceManager.buffer(zaumj, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zaumq = zaumg.array.length / zaumg.itemSize;
            var zaumr = zaumo.skinPackFor(zaumb.geometry, zaumb.geometry.attributes.skinIndex, zaumb.geometry.attributes.skinWeight, zaumq);
            var zaums = zaumo.resourceManager.buffer(zaumr, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zaumt = zaumo.morphPackFor(zaumb.geometry, zaumq);
            var zaumu = zaumo.resourceManager.buffer(zaumt, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zaumv = zaumb instanceof InstancedMesh && zaumb.count > 0;
            var zaumw = zaumv ? zaumo.instanceResource(zaumb) : null;
            var zaumx = zaumv ? zaumw.buffer : zaumo.identityInstanceBuffer();
            var zaumy = zaumv ? zaumw.count : 1;
            var zaumz = zaumo._originShift ? zaumb.matrixWorld.clone() : zaumb.matrixWorld;
            if (zaumo._originShift) {
                zaumz.elements[12] -= zaumo._originShift.x;
                zaumz.elements[13] -= zaumo._originShift.y;
                zaumz.elements[14] -= zaumo._originShift.z;
            }
            var zaumaa = zaumz.clone().invert().transpose();
            var zaumab = new Float32Array(68);
            zaumab.set(zaumz.elements, 0);
            zaumab.set(zaumaa.elements, 16);
            var zaumac = zaumb.material && zaumb.material.color ? zaumb.material.color : new Color(16777215);
            zaumab[32] = zaumac.r;
            zaumab[33] = zaumac.g;
            zaumab[34] = zaumac.b;
            zaumab[35] = zaumb.material && zaumb.material.opacity !== undefined ? zaumb.material.opacity : 1;
            zaumab[36] = zaumb.material && zaumb.material.metalness !== undefined ? zaumb.material.metalness : 0;
            zaumab[37] = zaumb.material && zaumb.material.roughness !== undefined ? zaumb.material.roughness : .5;
            zaumab[38] = zaumb.material && zaumb.material.clearcoat !== undefined ? zaumb.material.clearcoat : 0;
            zaumab[39] = zaumb.material && zaumb.material.transmission !== undefined ? zaumb.material.transmission : 0;
            var zaumad = zaumb.material && zaumb.material.emissive ? zaumb.material.emissive : new Color(0);
            zaumab[40] = zaumad.r;
            zaumab[41] = zaumad.g;
            zaumab[42] = zaumad.b;
            zaumab[43] = 1;
            zaumab[44] = zaumb.material && zaumb.material.sheen !== undefined ? zaumb.material.sheen : 0;
            zaumab[45] = zaumb.material && zaumb.material.iridescence !== undefined ? zaumb.material.iridescence : 0;
            zaumab[46] = zaumb.material && zaumb.material.anisotropy !== undefined ? zaumb.material.anisotropy : 0;
            zaumab[47] = zaumb.material && zaumb.material.normalScale ? zaumb.material.normalScale.x : .15;
            zaumab[48] = zaumb.skeleton ? 1 : 0;
            zaumab[49] = zaumb.geometry.morphAttributes && zaumb.geometry.morphAttributes.position && zaumb.geometry.morphAttributes.position.length ? 1 : 0;
            zaumab[50] = zaumv ? 1 : 0;
            var zaumae = zaumb.material && zaumb.material.envMap || zauma && zauma.environment || null;
            zaumab[51] = zaumae ? 1 : 0;
            var zaumaf = zaumb.morphTargetInfluences || [];
            zaumab[52] = zaumaf[0] || 0;
            zaumab[53] = zaumaf[1] || 0;
            zaumab[54] = zaumaf[2] || 0;
            zaumab[55] = zaumaf[3] || 0;
            var zaumag = zaumb.material instanceof BasicMaterial && !(zaumb.material instanceof LineMaterial) || zaumb.material instanceof PointsMaterial || zaumb.material instanceof LineBasicMaterial ? 1 : 0;
            zaumab[56] = zaumag;
            zaumab[57] = zaumb.material && zaumb.material.vertexColors ? 1 : 0;
            zaumab[58] = zaumb.material && zaumb.material.alphaTest ? 1 : 0;
            zaumab[59] = zaumb.material && zaumb.material.alphaCutoff !== undefined ? zaumb.material.alphaCutoff : .5;
            zaumab[60] = zaumb.material && zaumb.material.envMapIntensity !== undefined ? zaumb.material.envMapIntensity : 1;
            zaumab[61] = zaumb.material && zaumb.material.emissiveStrength !== undefined ? zaumb.material.emissiveStrength : 1;
            zaumab[62] = zaumb.material && zaumb.material.clearcoatRoughness !== undefined ? zaumb.material.clearcoatRoughness : .03;
            var zaumah = zaumb.material && zaumb.material.iridescenceThicknessRange ? zaumb.material.iridescenceThicknessRange : [ 100, 400 ];
            zaumab[63] = (zaumah[0] + zaumah[1]) * .5;
            zaumab[64] = zaumb.material && zaumb.material.anisotropyRotation !== undefined ? zaumb.material.anisotropyRotation : 0;
            zaumab[65] = zaumb.material && zaumb.material.parallaxMap ? 1 : 0;
            zaumab[66] = zaumb.material && zaumb.material.parallaxScale !== undefined ? zaumb.material.parallaxScale : 0;
            zaumab[67] = zaumb.material && zaumb.material.parallaxMaxLayers !== undefined ? zaumb.material.parallaxMaxLayers : 32;
            var zaumai = zaumo.modelBufferFor(zaumb);
            zaumo.device.queue.writeBuffer(zaumai, 0, zaumab);
            var zaumaj = zaumb.material && (zaumb.material.diffuseMap || zaumb.material.map);
            var zaumak = zaumb.material && zaumb.material.normalMap;
            var zaumal = zaumb.material && zaumb.material.roughnessMap;
            var zaumam = zaumb.material && zaumb.material.metalnessMap;
            var zauman = zaumb.material && zaumb.material.aoMap;
            var zaumao = zaumb.material && zaumb.material.emissiveMap;
            var zaumap = zaumaj ? zaumo.resourceManager.texture(zaumaj, [ 255, 255, 255, 255 ]) : zaumo.resourceManager.defaultTextureResource("white", [ 255, 255, 255, 255 ]);
            var zaumaq = zaumak ? zaumo.resourceManager.texture(zaumak) : zaumo.resourceManager.defaultTextureResource("normal", [ 128, 128, 255, 255 ]);
            var zaumar = zaumal ? zaumo.resourceManager.texture(zaumal) : zaumo.resourceManager.defaultTextureResource("roughness", [ 0, 255, 0, 255 ]);
            var zaumas = zaumam ? zaumo.resourceManager.texture(zaumam) : zaumo.resourceManager.defaultTextureResource("metalness", [ 0, 0, 255, 255 ]);
            var zaumat = zauman ? zaumo.resourceManager.texture(zauman) : zaumo.resourceManager.defaultTextureResource("ao", [ 255, 255, 255, 255 ]);
            var zaumau = zaumao ? zaumo.resourceManager.texture(zaumao) : zaumo.resourceManager.defaultTextureResource("emissive", [ 0, 0, 0, 255 ]);
            var zaumav = zaumae && zaumae.resource ? zaumae.resource : zaumae && zaumae instanceof CubeTexture ? zaumo.resourceManager.cubeTexture(zaumae) : zaumo.resourceManager.defaultCubeResource();
            var zaumaentries = [ {
                    binding: 0,
                    resource: {
                        buffer: zaumai
                    }
                }, {
                    binding: 1,
                    resource: zaumap.view
                }, {
                    binding: 2,
                    resource: zaumap.sampler
                }, {
                    binding: 3,
                    resource: zaumaq.view
                }, {
                    binding: 4,
                    resource: zaumaq.sampler
                }, {
                    binding: 5,
                    resource: zaumar.view
                }, {
                    binding: 6,
                    resource: zaumar.sampler
                }, {
                    binding: 7,
                    resource: zaumas.view
                }, {
                    binding: 8,
                    resource: zaumas.sampler
                }, {
                    binding: 9,
                    resource: zaumat.view
                }, {
                    binding: 10,
                    resource: zaumat.sampler
                }, {
                    binding: 11,
                    resource: zaumau.view
                }, {
                    binding: 12,
                    resource: zaumau.sampler
                }, {
                    binding: 13,
                    resource: zaumav.view
                }, {
                    binding: 14,
                    resource: zaumav.sampler
                } ];
            if (!(zaumb.material && zaumb.material.isFNMaterial)) {
                var zaumapom = zaumb.material && zaumb.material.parallaxMap;
                var zaumapor = zaumapom ? zaumo.resourceManager.texture(zaumapom) : zaumo.resourceManager.defaultTextureResource("parallax", [ 255, 255, 255, 255 ]);
                zaumaentries.push({
                    binding: 15,
                    resource: zaumapor.view
                }, {
                    binding: 16,
                    resource: zaumapor.sampler
                });
            }
            var zaumaw = zaumo.device.createBindGroup({
                layout: zaume.getBindGroupLayout(1),
                entries: zaumaentries
            });
            var zaumax = zaumo.resourceManager.boneResource(zaumb.skeleton);
            var zaumay = zaumo.device.createBindGroup({
                layout: zaume.getBindGroupLayout(2),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: zaumax.buffer
                    }
                } ]
            });
            zaumn.setPipeline(zaume);
            zaumn.setBindGroup(0, zaumf);
            zaumn.setBindGroup(1, zaumaw);
            zaumn.setBindGroup(2, zaumay);
            if (zaumd) {
                if (zaumd.indexOf("mega") >= 0) {
                    var zaumaz = zaumo.attribute(zaumb, "materialIndex", 1, [ 0 ]);
                    var zaumba = zaumo.resourceManager.buffer(zaumaz, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
                    zaumn.setVertexBuffer(7, zaumba);
                }
                zaumn.setBindGroup(3, zaumo.variantBindFor(zaume, zaumd));
            }
            zaumn.setVertexBuffer(0, zaumk);
            zaumn.setVertexBuffer(1, zauml);
            zaumn.setVertexBuffer(2, zaumm);
            zaumn.setVertexBuffer(3, zaums);
            zaumn.setVertexBuffer(4, zaumu);
            zaumn.setVertexBuffer(5, zaump);
            zaumn.setVertexBuffer(6, zaumx);
            if (zaumb.geometry.index) {
                var zaumbb = zaumb.geometry.index;
                var zaumbc = zaumo.resourceManager.buffer({
                    array: zaumbb
                }, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
                zaumn.setIndexBuffer(zaumbc, zaumbb instanceof Uint32Array ? "uint32" : "uint16");
                zaumn.drawIndexed(zaumbb.length, zaumy, 0, 0, 0);
                zaumo.info.render.triangles += Math.floor(zaumbb.length / 3) * zaumy;
            } else {
                var zaumbd = zaumg.array.length / zaumg.itemSize;
                zaumn.draw(zaumbd, zaumy, 0, 0);
                zaumo.info.render.triangles += Math.floor(zaumbd / 3) * zaumy;
            }
            zaumo.info.render.calls++;
        };
        var zaums = zaump;
        if (this.gpudrivenEnabled && this.gpudriven) zaums = this.gpudriven.prepare(zaumk, zaump, this, zaumb, zaume);
        for (var zaumt = 0; zaumt < zaums.length; zaumt++) zaumr(zaums[zaumt]);
        if (this.gpudrivenEnabled && this.gpudriven) this.gpudriven.draw(zaumn, this);
        for (var zaumu = 0; zaumu < zaumq.length; zaumu++) zaumr(zaumq[zaumu]);
        zaumn.end();
        if (this.gpudrivenEnabled && this.gpudriven) this.gpudriven.afterRender(zaumk, this, this._targetDepthView || this.depthView);
        if (zauml && zauml.enabled) zauml.resolve(zaumk);
        this.device.queue.submit([ zaumk.finish() ]);
        if (zauml && zauml.enabled) zauml.endFrame(this);
        this.info.render.frame++;
    }
    setGPUDriven(zauma, zaumb) {
        this.gpudrivenEnabled = !!zauma;
        if (this.gpudrivenEnabled && !this.gpudriven) this.gpudriven = new GPUDrivenPipeline(this);
        if (this.gpudriven && zaumb) {
            if (zaumb.twoPhase !== undefined) this.gpudriven.twoPhase = !!zaumb.twoPhase;
            if (zaumb.regions !== undefined) this.gpudriven.regions = !!zaumb.regions;
            if (zaumb.targetPerRegion !== undefined) this.gpudriven.targetPerRegion = zaumb.targetPerRegion;
            if (zaumb.hysteresis !== undefined) this.gpudriven.hysteresis = zaumb.hysteresis;
        }
        return this;
    }
    morphZeroWrapper(zauma, zaumb) {
        var zaumc = this._morphZeroWrappers[zauma];
        if (!zaumc) {
            zaumc = {};
            this._morphZeroWrappers[zauma] = zaumc;
        }
        if (!zaumc[zaumb]) zaumc[zaumb] = {
            array: new Float32Array(zauma * (zaumb === "skinIndex" ? 4 : zaumb === "skinWeight" ? 4 : 3)),
            itemSize: zaumb === "skinIndex" || zaumb === "skinWeight" ? 4 : 3
        };
        return zaumc[zaumb];
    }
    skinPackFor(zauma, zaumb, zaumc, zaumd) {
        var zaume = zaumb || zauma;
        var zaumf = this._skinPackCache && this._skinPackCache.get(zaume);
        if (zaumf && zaumf.__count === zaumd) return zaumf;
        var zaumg = new ArrayBuffer(32 * zaumd);
        var zaumh = new Uint32Array(zaumg);
        var zaumi = new Float32Array(zaumg);
        var zaumj = zaumb ? zaumb.array : null;
        var zaumk = zaumc ? zaumc.array : null;
        for (var zauml = 0; zauml < zaumd; zauml++) {
            for (var zaumm = 0; zaumm < 4; zaumm++) {
                zaumh[zauml * 8 + zaumm] = zaumj ? zaumj[zauml * 4 + zaumm] | 0 : 0;
                zaumi[zauml * 8 + 4 + zaumm] = zaumk ? +zaumk[zauml * 4 + zaumm] || 0 : 0;
            }
            if (zaumi[zauml * 8 + 4] === 0 && zaumi[zauml * 8 + 5] === 0 && zaumi[zauml * 8 + 6] === 0 && zaumi[zauml * 8 + 7] === 0) zaumi[zauml * 8 + 4] = 1;
        }
        var zaumn = {
            array: zaumh,
            __count: zaumd
        };
        if (this._skinPackCache) this._skinPackCache.set(zaume, zaumn);
        return zaumn;
    }
    morphPackFor(zauma, zaumb) {
        var zaumc = this._morphPackCache && this._morphPackCache.get(zauma);
        if (zaumc && zaumc.__count === zaumb) return zaumc;
        var zaumd = zauma.morphAttributes && zauma.morphAttributes.position ? zauma.morphAttributes.position : [];
        var zaume = new ArrayBuffer(48 * zaumb);
        var zaumf = new Float32Array(zaume);
        for (var zaumg = 0; zaumg < 4 && zaumg < zaumd.length; zaumg++) {
            var zaumh = zaumd[zaumg] ? zaumd[zaumg].array : null;
            if (!zaumh) continue;
            for (var zaumi = 0; zaumi < zaumb; zaumi++) {
                var zaumj = zaumi * 12 + zaumg * 3;
                zaumf[zaumj] = +zaumh[zaumi * 3] || 0;
                zaumf[zaumj + 1] = +zaumh[zaumi * 3 + 1] || 0;
                zaumf[zaumj + 2] = +zaumh[zaumi * 3 + 2] || 0;
            }
        }
        var zaumk = {
            array: zaumf,
            __count: zaumb
        };
        if (this._morphPackCache) this._morphPackCache.set(zauma, zaumk);
        return zaumk;
    }
    ensureShadowResources() {
        if (this.shadowTexture) return this;
        this.shadowTexture = this.device.createTexture({
            size: [ 1, 1, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.shadowSize = 1;
        this.shadowView = this.shadowTexture.createView();
        this.shadowSampler = this.device.createSampler({
            compare: "less-equal",
            magFilter: "linear",
            minFilter: "linear"
        });
        var zauma = this.device.createCommandEncoder();
        var zaumb = zauma.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.shadowView,
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        zaumb.end();
        this.device.queue.submit([ zauma.finish() ]);
        this.shadowReady = false;
        return this;
    }
    renderShadowMap(zauma, zaumb) {
        var zaumc = Math.max(16, Math.floor(zaumb.shadow && zaumb.shadow.mapSize ? zaumb.shadow.mapSize : this.shadowSize));
        if (!this.shadowTexture || this.shadowSize !== zaumc) {
            if (this.shadowTexture) this.shadowTexture.destroy();
            this.shadowSize = zaumc;
            this.shadowTexture = this.device.createTexture({
                size: [ zaumc, zaumc, 1 ],
                format: "depth24plus",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            this.shadowView = this.shadowTexture.createView();
            this.shadowSampler = this.device.createSampler({
                compare: "less-equal",
                magFilter: "linear",
                minFilter: "linear"
            });
            this._cameraBindCache = typeof Map !== "undefined" ? new Map : null;
        }
        var zaumd = zaumb.shadow.camera;
        var zaume = this._originShift;
        zaumd.position.copy(zaumb.position);
        if (zaume) {
            zaumd.position.x -= zaume.x;
            zaumd.position.y -= zaume.y;
            zaumd.position.z -= zaume.z;
        }
        var zaumf = zaumb.target && zaumb.target.position ? zaumb.target.position.clone() : new Vector3;
        if (zaume) {
            zaumf.x -= zaume.x;
            zaumf.y -= zaume.y;
            zaumf.z -= zaume.z;
        }
        zaumd.lookAt(zaumf);
        zaumd.updateMatrixWorld(true);
        var zaumg = (new Matrix4).multiplyMatrices(zaumd.projectionMatrix, zaumd.matrixWorldInverse);
        var zaumh = (new Matrix4).set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
        this.shadowMatrix.multiplyMatrices(zaumh, zaumg);
        if (!this.shadowPipeline) {
            var zaumi = this.device.createShaderModule({
                code: "struct Shadow { viewProjection: mat4x4<f32> }; struct Model { model: mat4x4<f32> }; @group(0) @binding(0) var<uniform> shadow: Shadow; @group(1) @binding(0) var<uniform> model: Model; @vertex fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> { let clip = shadow.viewProjection * model.model * vec4<f32>(position, 1.0); return vec4<f32>(clip.xy, clip.z * 0.5 + clip.w * 0.5, clip.w); }"
            });
            this.shadowPipeline = this.device.createRenderPipeline({
                layout: "auto",
                vertex: {
                    module: zaumi,
                    entryPoint: "main",
                    buffers: [ {
                        arrayStride: 12,
                        attributes: [ {
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x3"
                        } ]
                    } ]
                },
                primitive: {
                    topology: "triangle-list",
                    cullMode: "back"
                },
                depthStencil: {
                    format: "depth24plus",
                    depthWriteEnabled: true,
                    depthCompare: "less"
                }
            });
        }
        if (!this._shadowLightBuffer) this._shadowLightBuffer = this.resourceManager.uniform(64);
        this.device.queue.writeBuffer(this._shadowLightBuffer, 0, new Float32Array(zaumg.elements));
        var zaumj = this.device.createCommandEncoder();
        var zaumk = this.profiler;
        var zauml = {
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.shadowView,
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        };
        if (zaumk && zaumk.enabled) zauml = zaumk.passDescriptor("shadow", zauml);
        var zaumm = zaumj.beginRenderPass(zauml);
        var zaumn = this.device.createBindGroup({
            layout: this.shadowPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this._shadowLightBuffer
                }
            } ]
        });
        var zaumo = this;
        var zaump = new Matrix4;
        var zaumq = new Matrix4;
        zauma.traverseVisible(function(zauma) {
            if (!(zauma instanceof Mesh) || !zauma.castShadow || !zauma.geometry || !zauma.geometry.attributes.position) return;
            var zaumb = zauma.geometry.attributes.position;
            var zaumc = zaumo.resourceManager.buffer(zaumb, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zaumd = zaumo._shadowModelBuffers ? zaumo._shadowModelBuffers.get(zauma) : null;
            if (!zaumd) {
                zaumd = zaumo.resourceManager.uniform(64);
                if (zaumo._shadowModelBuffers) zaumo._shadowModelBuffers.set(zauma, zaumd);
            }
            var zaumf = null;
            if (zauma.geometry.index) zaumf = zaumo.resourceManager.buffer({
                array: zauma.geometry.index
            }, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
            var zaumg = zauma instanceof InstancedMesh && zauma.count > 0 ? zauma.count : 1;
            for (var zaumh = 0; zaumh < zaumg; zaumh++) {
                if (zauma instanceof InstancedMesh && zauma.count > 0) {
                    zauma.getMatrixAt(zaumh, zaump);
                    zaumq.multiplyMatrices(zauma.matrixWorld, zaump);
                } else zaumq.copy(zauma.matrixWorld);
                if (zaume) {
                    zaumq.elements[12] -= zaume.x;
                    zaumq.elements[13] -= zaume.y;
                    zaumq.elements[14] -= zaume.z;
                }
                zaumo.device.queue.writeBuffer(zaumd, 0, new Float32Array(zaumq.elements));
                var zaumi = zaumo.device.createBindGroup({
                    layout: zaumo.shadowPipeline.getBindGroupLayout(1),
                    entries: [ {
                        binding: 0,
                        resource: {
                            buffer: zaumd
                        }
                    } ]
                });
                zaumm.setPipeline(zaumo.shadowPipeline);
                zaumm.setBindGroup(0, zaumn);
                zaumm.setBindGroup(1, zaumi);
                zaumm.setVertexBuffer(0, zaumc);
                if (zaumf) {
                    zaumm.setIndexBuffer(zaumf, zauma.geometry.index instanceof Uint32Array ? "uint32" : "uint16");
                    zaumm.drawIndexed(zauma.geometry.index.length, 1, 0, 0, 0);
                } else zaumm.draw(zaumb.array.length / zaumb.itemSize, 1, 0, 0);
            }
        });
        zaumm.end();
        if (zaumk && zaumk.enabled) zaumk.resolve(zaumj);
        this.device.queue.submit([ zaumj.finish() ]);
        this.shadowReady = true;
        return this;
    }
    renderToView(zauma, zaumb, zaumc, zaumd, zaume) {
        if (!this.initialized) return this;
        this._targetView = zaumc;
        this._targetDepthView = zaumd || this.depthView;
        this._targetFormat = zaume || this.format;
        var zaumf = this._postLock;
        this._postLock = true;
        this.render(zauma, zaumb);
        this._postLock = zaumf;
        this._targetView = null;
        this._targetDepthView = null;
        this._targetFormat = null;
        return this;
    }
    dispose() {
        if (this.postProcessing) this.postProcessing.dispose();
        if (this.depthTexture) this.depthTexture.destroy();
        if (this.shadowTexture) this.shadowTexture.destroy();
        if (this.resourceManager) this.resourceManager.dispose();
        this.pipelineCache = {};
        this.device = null;
        this.initialized = false;
    }
    setPixelRatio(zauma) {
        var zaumb = this.pixelRatio;
        this.pixelRatio = Math.max(.01, zauma);
        var zaumc = this._cssWidth !== undefined ? this._cssWidth : this.width / zaumb;
        var zaumd = this._cssHeight !== undefined ? this._cssHeight : this.height / zaumb;
        return this.resize(zaumc, zaumd);
    }
    invalidateGpuState() {
        var zauma = this;
        var zaumb = function(zauma) {
            try {
                if (zauma && typeof zauma.destroy === "function") zauma.destroy();
            } catch (zauma) {}
        };
        zaumb(this.depthTexture);
        this.depthTexture = null;
        this.depthView = null;
        zaumb(this.shadowTexture);
        this.shadowTexture = null;
        this.shadowView = null;
        this.shadowSampler = null;
        this.shadowPipeline = null;
        this.shadowReady = false;
        this.pipelineCache = {};
        this._shaderModuleCache = null;
        this._nodeModuleCache = null;
        this._nodeBaseCode = undefined;
        this.cameraBuffer = null;
        this.lightBuffer = null;
        this.megaMaterialBuffer = null;
        this._shadowLightBuffer = null;
        this._identityInstanceBuffer = null;
        this._cameraBindCache = null;
        this._modelBuffers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._shadowModelBuffers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._syntheticAttributes = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._skinIndexWrappers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._skinWeightWrappers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._skinPackCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this._morphZeroWrappers = {};
        this._instanceData = typeof WeakMap !== "undefined" ? new WeakMap : null;
        if (this.postProcessing && typeof this.postProcessing.dispose === "function") {
            try {
                this.postProcessing.dispose();
            } catch (zauma) {}
        }
        if (this.gpudriven && typeof this.gpudriven.dispose === "function") {
            try {
                this.gpudriven.dispose();
            } catch (zauma) {}
            this.gpudriven = null;
            this.gpudrivenEnabled = false;
        }
        if (this.resourceManager) {
            try {
                this.resourceManager.dispose();
            } catch (zauma) {}
            this.resourceManager = null;
        }
        this.initialized = false;
        return this;
    }
}

export { WebGPURenderer };

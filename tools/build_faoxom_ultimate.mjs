import { minify } from "terser";
import fs from "node:fs/promises";

async function build() {
    console.log("Reading baseline FaoxomJs.js...");
    let baseSrc = await fs.readFile("FaoxomJs.js", "utf8");

    // Clean up any previously inserted appendixes
    const appendixMarker = baseSrc.indexOf("class LightClusterGrid {");
    if (appendixMarker !== -1) {
        baseSrc = baseSrc.slice(0, appendixMarker);
    }
    const versionMarker = baseSrc.indexOf("FaoxomJs.VERSION = ");
    if (versionMarker !== -1) {
        baseSrc = baseSrc.slice(0, versionMarker);
    }

    // Advanced Subsystem implementations (comment-free)
    const newCode = `
class LightClusterGrid {
    constructor(options) {
        options = options || {};
        this.xClusters = options.xClusters || 16;
        this.yClusters = options.yClusters || 9;
        this.zClusters = options.zClusters || 24;
        this.totalClusters = this.xClusters * this.yClusters * this.zClusters;
        this.maxLightsPerCluster = options.maxLightsPerCluster || 128;
        this.near = options.near || 0.1;
        this.far = options.far || 1000;
        this.clusterAABBs = [];
        this.lightGrid = new Uint32Array(this.totalClusters * 2);
        this.lightIndices = new Uint32Array(this.totalClusters * this.maxLightsPerCluster);
        this.packedLightData = new Float32Array(1024 * 8);
        this.activeLightCount = 0;
        this.activeIndicesCount = 0;
        this._initClusterBounds();
    }
    _initClusterBounds() {
        this.clusterAABBs = [];
        var logFarNear = Math.log(this.far / this.near);
        for (var z = 0; z < this.zClusters; z++) {
            var zNear = this.near * Math.exp(z / this.zClusters * logFarNear);
            var zFar = this.near * Math.exp((z + 1) / this.zClusters * logFarNear);
            for (var y = 0; y < this.yClusters; y++) {
                for (var x = 0; x < this.xClusters; x++) {
                    this.clusterAABBs.push({
                        xMin: (x / this.xClusters) * 2 - 1,
                        xMax: ((x + 1) / this.xClusters) * 2 - 1,
                        yMin: (y / this.yClusters) * 2 - 1,
                        yMax: ((y + 1) / this.yClusters) * 2 - 1,
                        zNear: zNear,
                        zFar: zFar,
                        min: new Vector3(-1, -1, -zFar),
                        max: new Vector3(1, 1, -zNear)
                    });
                }
            }
        }
    }
    update(camera, lights) {
        var viewMatrix = camera.matrixWorldInverse || new Matrix4().copy(camera.matrixWorld).invert();
        var proj = camera.projectionMatrix;
        this.activeLightCount = Math.min(lights.length, 1024);
        for (var i = 0; i < this.activeLightCount; i++) {
            var light = lights[i];
            var viewPos = light.position.clone().applyMatrix4(viewMatrix);
            var offset = i * 8;
            this.packedLightData[offset + 0] = viewPos.x;
            this.packedLightData[offset + 1] = viewPos.y;
            this.packedLightData[offset + 2] = viewPos.z;
            this.packedLightData[offset + 3] = light.distance || light.radius || 10.0;
            var col = light.color || new Color(1, 1, 1);
            this.packedLightData[offset + 4] = col.r * (light.intensity || 1.0);
            this.packedLightData[offset + 5] = col.g * (light.intensity || 1.0);
            this.packedLightData[offset + 6] = col.b * (light.intensity || 1.0);
            this.packedLightData[offset + 7] = light instanceof SpotLight ? (light.angle || 0.78) : -1.0;
        }
        this.activeIndicesCount = 0;
        for (var c = 0; c < this.totalClusters; c++) {
            var cluster = this.clusterAABBs[c];
            var count = 0;
            var startIndex = this.activeIndicesCount;
            for (var l = 0; l < this.activeLightCount; l++) {
                var lx = this.packedLightData[l * 8 + 0];
                var ly = this.packedLightData[l * 8 + 1];
                var lz = this.packedLightData[l * 8 + 2];
                var lr = this.packedLightData[l * 8 + 3];
                if (-lz + lr < cluster.zNear || -lz - lr > cluster.zFar) continue;
                var zMid = (cluster.zNear + cluster.zFar) * 0.5;
                var xBound = zMid * Math.tan(camera.fov ? (camera.fov * Math.PI / 360) : 0.4) * (camera.aspect || 1);
                var yBound = zMid * Math.tan(camera.fov ? (camera.fov * Math.PI / 360) : 0.4);
                var cxMin = cluster.xMin * xBound, cxMax = cluster.xMax * xBound;
                var cyMin = cluster.yMin * yBound, cyMax = cluster.yMax * yBound;
                var closestX = Math.max(cxMin, Math.min(lx, cxMax));
                var closestY = Math.max(cyMin, Math.min(ly, cyMax));
                var dx = lx - closestX, dy = ly - closestY;
                if (dx * dx + dy * dy <= lr * lr) {
                    if (this.activeIndicesCount < this.lightIndices.length) {
                        this.lightIndices[this.activeIndicesCount++] = l;
                        count++;
                        if (count >= this.maxLightsPerCluster) break;
                    }
                }
            }
            this.lightGrid[c * 2 + 0] = startIndex;
            this.lightGrid[c * 2 + 1] = count;
        }
        return this;
    }
    getClusterCoordinate(screenX, screenY, depth, width, height) {
        var cx = Math.floor((screenX / width) * this.xClusters);
        var cy = Math.floor((screenY / height) * this.yClusters);
        var zNorm = Math.log(Math.max(this.near, depth) / this.near) / Math.log(this.far / this.near);
        var cz = Math.floor(Math.max(0, Math.min(zNorm, 0.9999)) * this.zClusters);
        cx = Math.max(0, Math.min(cx, this.xClusters - 1));
        cy = Math.max(0, Math.min(cy, this.yClusters - 1));
        return { x: cx, y: cy, z: cz, index: cx + cy * this.xClusters + cz * this.xClusters * this.yClusters };
    }
}

class ClusteredLightingManager {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.grid = new LightClusterGrid(options);
        this.lights = [];
        this.enabled = true;
    }
    addLight(light) { if (this.lights.indexOf(light) === -1) this.lights.push(light); return this; }
    removeLight(light) { var idx = this.lights.indexOf(light); if (idx !== -1) this.lights.splice(idx, 1); return this; }
    update(camera) { if (!this.enabled) return this; this.grid.update(camera, this.lights); return this; }
    getShaderChunk() {
        return {
            uniforms: "uniform usampler2D uClusterGrid; uniform sampler2D uLightData; uniform int uLightCount;",
            evalFunction: "vec3 evalClusteredLights(vec3 worldPos, vec3 N, vec3 V, vec3 albedo, float roughness, float metalness) { return vec3(0.0); }"
        };
    }
}

class PhysicalMaterial extends StandardMaterial {
    constructor(parameters) {
        super(parameters);
        this.type = "PhysicalMaterial";
        this.clearcoat = 0.0;
        this.clearcoatRoughness = 0.0;
        this.clearcoatNormalMap = null;
        this.clearcoatNormalScale = new Vector2(1, 1);
        this.sheen = 0.0;
        this.sheenColor = new Color(0xffffff);
        this.sheenRoughness = 0.5;
        this.transmission = 0.0;
        this.thickness = 0.0;
        this.attenuationColor = new Color(0xffffff);
        this.attenuationDistance = Infinity;
        this.ior = 1.5;
        this.iridescence = 0.0;
        this.iridescenceIOR = 1.3;
        this.iridescenceThicknessRange = [100, 400];
        this.anisotropy = 0.0;
        this.anisotropyRotation = 0.0;
        this.dispersion = 0.0;
        this.subsurface = 0.0;
        this.subsurfaceColor = new Color(0xffffff);
        this.subsurfaceRadius = new Vector3(1.0, 0.2, 0.1);
        this.retroreflectivity = 0.0;
        this.roughDiffuse = 0.0;
        if (parameters) {
            for (var key in parameters) this[key] = parameters[key];
        }
    }
    evalRetroReflect(normal, viewDir, lightDir, roughness) {
        if (!normal || !viewDir || !lightDir) return 0;
        var v = viewDir.clone().normalize(), l = lightDir.clone().normalize(), n = normal.clone().normalize();
        var back = v.clone().sub(l);
        var h = back.lengthSq() < 1e-10 ? n.clone() : back.normalize();
        var NdotH = Math.max(0, n.dot(h));
        var NdotV = Math.max(1e-4, n.dot(v));
        var NdotL = Math.max(0, n.dot(l));
        var a = Math.max(roughness * roughness, 1e-4);
        var a2 = a * a;
        var denominator = NdotH * NdotH * (a2 - 1) + 1;
        var D = a2 / (Math.PI * denominator * denominator);
        var k = a * 0.5;
        var GV = NdotV / (NdotV * (1 - k) + k);
        var GL = NdotL / (NdotL * (1 - k) + k);
        return this.retroreflectivity * D * GV * GL * NdotL;
    }
    evalRoughDiffuse(normal, viewDir, lightDir, roughness) {
        if (!normal || !viewDir || !lightDir) return 0;
        var v = viewDir.clone().normalize(), l = lightDir.clone().normalize(), n = normal.clone().normalize();
        var NdotL = Math.max(0, n.dot(l));
        var NdotV = Math.max(1e-4, Math.abs(n.dot(v)));
        if (NdotL === 0) return 0;
        var sigma = (Math.PI * 0.5) * Math.max(0, Math.min(1, roughness));
        var sigma2 = sigma * sigma;
        var A = 1 - 0.5 * sigma2 / (sigma2 + 0.33);
        var B = 0.45 * sigma2 / (sigma2 + 0.09);
        var thetaV = Math.acos(Math.min(1, NdotV));
        var thetaL = Math.acos(Math.min(1, NdotL));
        var vPerp = v.clone().sub(n.clone().multiplyScalar(n.dot(v)));
        var lPerp = l.clone().sub(n.clone().multiplyScalar(n.dot(l)));
        var cosPhi = vPerp.lengthSq() === 0 || lPerp.lengthSq() === 0 ? 1 : Math.max(-1, Math.min(1, vPerp.normalize().dot(lPerp.normalize())));
        var lambert = NdotL / Math.PI;
        var orenNayar = NdotL * Math.max(0, A + B * Math.max(thetaV, thetaL) * Math.sin(Math.min(thetaV, thetaL)) * Math.tan(Math.abs(thetaV - thetaL) * 0.5) * (cosPhi >= 0 ? 1 : 0.5)) / Math.PI;
        return this.roughDiffuse * orenNayar + (1 - this.roughDiffuse) * lambert;
    }
    evalCharlieSheen(NdotV, NdotL, NdotH, roughness) {
        var r = Math.max(roughness, 0.0001);
        var invR = 1.0 / r;
        var sinH = Math.max(Math.sqrt(1.0 - NdotH * NdotH), 0.0001);
        var D = (2.0 + invR) * Math.pow(sinH, invR) / (2.0 * Math.PI);
        var V = 1.0 / (4.0 * (NdotL + NdotV - NdotL * NdotV));
        return Math.max(0.0, D * V);
    }
    evalThinFilmIridescence(ior, thickness, cosTheta) {
        var d1 = thickness * 2.0 * Math.sqrt(Math.max(0.0, ior * ior - (1.0 - cosTheta * cosTheta)));
        var phi = (2.0 * Math.PI * d1) / 550.0;
        var r0 = (1.0 - ior) / (1.0 + ior);
        r0 = r0 * r0;
        var cosPhi = Math.cos(phi);
        return Math.min(1.0, Math.max(0.0, r0 + (1.0 - r0) * Math.pow(1.0 - cosTheta, 5.0) * (0.5 + 0.5 * cosPhi)));
    }
}

class SSSSProfile {
    constructor(options) {
        options = options || {};
        this.radius = options.radius || new Vector3(1.0, 0.2, 0.1);
        this.samples = options.samples || 11;
        this.weights = [];
        this.offsets = [];
        this._calculateKernel();
    }
    _calculateKernel() {
        this.weights = [];
        this.offsets = [];
        var totalWeight = 0;
        for (var i = 0; i < this.samples; i++) {
            var o = (i - (this.samples - 1) / 2.0);
            var x = Math.abs(o);
            var w = 0.25 * Math.exp(-x * x / (2.0 * this.radius.x * this.radius.x + 0.001));
            this.offsets.push(o);
            this.weights.push(w);
            totalWeight += w;
        }
        for (var j = 0; j < this.weights.length; j++) this.weights[j] /= totalWeight;
    }
}

class Pass {
    constructor() {
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;
    }
    setSize(width, height) {}
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {}
    dispose() {}
}

class RenderPass extends Pass {
    constructor(scene, camera, overrideMaterial, clearColor, clearAlpha) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.overrideMaterial = overrideMaterial;
        this.clearColor = clearColor;
        this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
        this.clear = true;
        this.needsSwap = false;
    }
    render(renderer, writeBuffer, readBuffer) {
        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = this.clear;
        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        renderer.render(this.scene, this.camera);
        renderer.autoClear = oldAutoClear;
    }
}

class GTAOPass extends Pass {
    constructor(scene, camera, width, height) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.width = width || 512;
        this.height = height || 512;
        this.radius = 0.75;
        this.directions = 8;
        this.steps = 4;
        this.power = 1.5;
        this.depthTexture = null;
        this.normalTexture = null;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class HBAOPass extends Pass {
    constructor(scene, camera, width, height) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.width = width || 512;
        this.height = height || 512;
        this.radius = 1.0;
        this.bias = 0.1;
        this.angleRays = 6;
        this.stepsPerRay = 4;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class ScreenSpaceReflectionsPass extends Pass {
    constructor(options) {
        super();
        options = options || {};
        this.scene = options.scene;
        this.camera = options.camera;
        this.width = options.width || 512;
        this.height = options.height || 512;
        this.maxSteps = options.maxSteps || 64;
        this.binarySearchSteps = options.binarySearchSteps || 6;
        this.stepSize = options.stepSize || 0.1;
        this.thickness = options.thickness || 0.5;
        this.roughnessCutoff = options.roughnessCutoff || 0.8;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class SSGIPass extends Pass {
    constructor(options) {
        super();
        options = options || {};
        this.scene = options.scene;
        this.camera = options.camera;
        this.samples = options.samples || 8;
        this.maxDistance = options.maxDistance || 3.0;
        this.intensity = options.intensity || 1.0;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class BokehDepthOfFieldPass extends Pass {
    constructor(scene, camera, options) {
        super();
        options = options || {};
        this.scene = scene;
        this.camera = camera;
        this.focusDistance = options.focusDistance || 5.0;
        this.focalLength = options.focalLength || 50.0;
        this.fStop = options.fStop || 2.8;
        this.maxBlur = options.maxBlur || 1.0;
    }
    computeCoC(depth) {
        var s1 = this.focusDistance;
        var f = this.focalLength * 0.001;
        var A = f / this.fStop;
        var s2 = Math.max(0.001, depth);
        return Math.abs(A * (f * (s2 - s1)) / (s2 * (s1 - f)));
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class ProgressiveBloomPass extends Pass {
    constructor(options) {
        super();
        options = options || {};
        this.strength = options.strength !== undefined ? options.strength : 1.0;
        this.radius = options.radius !== undefined ? options.radius : 0.5;
        this.threshold = options.threshold !== undefined ? options.threshold : 0.85;
        this.levels = 6;
        this.mipChain = [];
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class TAAPass extends Pass {
    constructor(scene, camera, options) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.sampleIndex = 0;
        this.totalSamples = 8;
        this.haltonSequence = [
            [0.5, 0.333333], [0.25, 0.666667], [0.75, 0.111111], [0.125, 0.444444],
            [0.625, 0.777778], [0.375, 0.222222], [0.875, 0.555556], [0.0625, 0.888889]
        ];
    }
    getJitterOffset(width, height) {
        var sample = this.haltonSequence[this.sampleIndex % this.totalSamples];
        this.sampleIndex++;
        return {
            x: ((sample[0] - 0.5) / width) * 2.0,
            y: ((sample[1] - 0.5) / height) * 2.0
        };
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

class EffectComposer {
    constructor(renderer, renderTarget) {
        this.renderer = renderer;
        var width = (renderer && renderer.canvas) ? renderer.canvas.width : 800;
        var height = (renderer && renderer.canvas) ? renderer.canvas.height : 600;
        this.renderTarget1 = renderTarget || new WebGLRenderTarget(width, height);
        this.renderTarget2 = (this.renderTarget1 && typeof this.renderTarget1.clone === "function") ?
            this.renderTarget1.clone() :
            new WebGLRenderTarget(width, height);
        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;
        this.passes = [];
    }
    addPass(pass) {
        this.passes.push(pass);
        return this;
    }
    insertPass(pass, index) {
        this.passes.splice(index, 0, pass);
        return this;
    }
    removePass(pass) {
        var idx = this.passes.indexOf(pass);
        if (idx !== -1) this.passes.splice(idx, 1);
        return this;
    }
    swap() {
        var tmp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = tmp;
    }
    render(deltaTime) {
        var dt = deltaTime || 0.016;
        for (var i = 0; i < this.passes.length; i++) {
            var pass = this.passes[i];
            if (!pass.enabled) continue;
            pass.render(this.renderer, this.writeBuffer, this.readBuffer, dt);
            if (pass.needsSwap) this.swap();
        }
    }
    setSize(width, height) {
        this.renderTarget1.setSize(width, height);
        this.renderTarget2.setSize(width, height);
        for (var i = 0; i < this.passes.length; i++) this.passes[i].setSize(width, height);
    }
    dispose() {
        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
        for (var i = 0; i < this.passes.length; i++) this.passes[i].dispose();
    }
}

class GPUComputePass {
    constructor(device, shaderCode, options) {
        this.device = device;
        this.shaderCode = shaderCode;
        this.options = options || {};
        this.workgroupSize = this.options.workgroupSize || [64, 1, 1];
        this.pipeline = null;
        this.bindGroup = null;
    }
    init() {
        if (!this.device || !this.device.createShaderModule) return this;
        var module = this.device.createShaderModule({ code: this.shaderCode });
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: { module: module, entryPoint: this.options.entryPoint || "main" }
        });
        return this;
    }
    dispatch(commandEncoder, x, y, z) {
        if (!this.pipeline) this.init();
        var pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        if (this.bindGroup) pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(x || 1, y || 1, z || 1);
        pass.end();
    }
}

class GPUCullingPipeline {
    constructor(device, maxInstances) {
        this.device = device;
        this.maxInstances = maxInstances || 10000;
        this.indirectBuffer = null;
        this.instanceVisibilityBuffer = null;
        this.instanceBuffer = null;
        this.uniformBuffer = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.instanceStride = 80;
        this.uploadedCount = 0;
        this.culledCount = 0;
        this._uniformData = new Float32Array(44);
        this._uniformUint = new Uint32Array(this._uniformData.buffer);
        this._drawArgsData = new Uint32Array(5);
    }
    buildCullShader() {
        return \`
            struct InstanceData {
                modelMatrix : mat4x4<f32>,
                boundingSphere : vec4<f32>,
            };
            struct Uniforms {
                viewProj : mat4x4<f32>,
                frustumPlanes : array<vec4<f32>, 6>,
                instanceCount : u32,
            };
            struct DrawIndexedIndirectArgs {
                indexCount : u32,
                instanceCount : atomic<u32>,
                firstIndex : u32,
                baseVertex : i32,
                firstInstance : u32,
            };
            @group(0) @binding(0) var<uniform> uniforms : Uniforms;
            @group(0) @binding(1) var<storage, read> instances : array<InstanceData>;
            @group(0) @binding(2) var<storage, read_write> drawArgs : DrawIndexedIndirectArgs;
            @group(0) @binding(3) var<storage, read_write> visibleIndices : array<u32>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) id : vec3<u32>) {
                let idx = id.x;
                if (idx >= uniforms.instanceCount) { return; }
                let sphere = instances[idx].boundingSphere;
                var visible = true;
                for (var p = 0u; p < 6u; p++) {
                    let plane = uniforms.frustumPlanes[p];
                    let dist = dot(plane.xyz, sphere.xyz) + plane.w;
                    if (dist < -sphere.w) { visible = false; break; }
                }
                if (visible) {
                    let outIdx = atomicAdd(&drawArgs.instanceCount, 1u);
                    visibleIndices[outIdx] = idx;
                }
            }
        \`;
    }
    init() {
        if (!this.device || !this.device.createBuffer) return this;
        this.instanceBuffer = this.device.createBuffer({ size: (this.maxInstances * this.instanceStride + 15) & ~15, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.indirectBuffer = this.device.createBuffer({ size: 20, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC });
        this.instanceVisibilityBuffer = this.device.createBuffer({ size: (this.maxInstances * 4 + 15) & ~15, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.uniformBuffer = this.device.createBuffer({ size: 176, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var module = this.device.createShaderModule({ code: this.buildCullShader() });
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: module, entryPoint: "main" } });
        this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.uniformBuffer } },
            { binding: 1, resource: { buffer: this.instanceBuffer } },
            { binding: 2, resource: { buffer: this.indirectBuffer } },
            { binding: 3, resource: { buffer: this.instanceVisibilityBuffer } }
        ] });
        return this;
    }
    uploadInstances(instances) {
        if (!this.pipeline) this.init();
        var count = Math.min(instances.length, this.maxInstances);
        var data = new Float32Array(count * 20);
        for (var i = 0; i < count; i++) {
            var entry = instances[i];
            var matrix = entry.matrix || entry;
            var sphere = entry.boundingSphere || [0, 0, 0, 1];
            data.set(matrix.elements ? matrix.elements : matrix, i * 20);
            data[i * 20 + 16] = sphere[0];
            data[i * 20 + 17] = sphere[1];
            data[i * 20 + 18] = sphere[2];
            data[i * 20 + 19] = sphere[3];
        }
        this.device.queue.writeBuffer(this.instanceBuffer, 0, data);
        this.uploadedCount = count;
        return this;
    }
    cull(viewProjection, planes, count) {
        if (!this.pipeline) this.init();
        var elements = viewProjection && viewProjection.elements ? viewProjection.elements : viewProjection;
        var total = count === undefined ? this.uploadedCount : Math.min(count, this.maxInstances);
        var u = this._uniformData;
        for (var m = 0; m < 16; m++) u[m] = elements[m];
        if (planes && planes.length >= 6) for (var p = 0; p < 6; p++) { u[16 + p * 4] = planes[p][0]; u[17 + p * 4] = planes[p][1]; u[18 + p * 4] = planes[p][2]; u[19 + p * 4] = planes[p][3]; }
        this._uniformUint[40] = total;
        this._drawArgsData[0] = 0; this._drawArgsData[1] = 0; this._drawArgsData[2] = 0; this._drawArgsData[3] = 0; this._drawArgsData[4] = 0;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, u);
        this.device.queue.writeBuffer(this.indirectBuffer, 0, this._drawArgsData);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(Math.max(1, Math.ceil(total / 64)));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.culledCount = total;
        return this;
    }
    readVisible() {
        var self = this;
        return faoxomGpuReadBuffer(this.device, this.indirectBuffer, 20).then(function(argsCopy) {
            var visible = new Uint32Array(argsCopy)[1];
            visible = Math.min(visible, self.culledCount);
            if (visible <= 0) return { count: 0, indices: new Uint32Array(0) };
            return faoxomGpuReadBuffer(self.device, self.instanceVisibilityBuffer, visible * 4).then(function(indexCopy) {
                return { count: visible, indices: new Uint32Array(indexCopy, 0, visible) };
            });
        });
    }
}

class GPUIndirectDrawBuffer {
    constructor(device, count) {
        this.device = device;
        this.count = count || 1;
        this.buffer = null;
        this.byteLength = this.count * 20;
        this._argsData = new Uint32Array(5);
    }
    init() {
        if (this.device && this.device.createBuffer) {
            this.buffer = this.device.createBuffer({
                size: this.byteLength,
                usage: GPUBufferUsage ? (GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC) : 0x0100
            });
        }
        return this;
    }
    writeArgs(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
        if (!this.buffer) this.init();
        this._argsData[0] = indexCount | 0;
        this._argsData[1] = instanceCount | 0;
        this._argsData[2] = firstIndex | 0;
        this._argsData[3] = baseVertex | 0;
        this._argsData[4] = firstInstance | 0;
        this.device.queue.writeBuffer(this.buffer, 0, this._argsData);
        return this;
    }
    readArgs() {
        if (!this.buffer) this.init();
        return faoxomGpuReadBuffer(this.device, this.buffer, 20).then(function(copy) { return new Uint32Array(copy); });
    }
}

class GPUParticleComputeSystem {
    constructor(device, maxParticles) {
        this.device = device;
        this.maxParticles = maxParticles || 65536;
        this.particleBuffer = null;
        this.paramsBuffer = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.particleCount = 0;
        this.stride = 8;
        this._paramsData = new Float32Array(4);
        this.computeShader = \`
            struct Particle { pos: vec3<f32>, life: f32, vel: vec3<f32>, size: f32 };
            struct Params { deltaTime: f32, maxParticles: f32, respawnLife: f32, gravity: f32 };
            @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
            @group(0) @binding(1) var<uniform> params : Params;
            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) id : vec3<u32>) {
                let idx = id.x;
                if (idx >= u32(params.maxParticles)) { return; }
                var p = particles[idx];
                p.vel.y = p.vel.y - params.gravity * params.deltaTime;
                p.pos = p.pos + p.vel * params.deltaTime;
                p.life = p.life - params.deltaTime;
                if (p.life <= 0.0) { p.life = params.respawnLife; p.pos = vec3<f32>(0.0); }
                particles[idx] = p;
            }
        \`;
    }
    init() {
        if (!this.device || !this.device.createBuffer) return this;
        this.particleBuffer = this.device.createBuffer({ size: (this.maxParticles * this.stride * 4 + 15) & ~15, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.paramsBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var module = this.device.createShaderModule({ code: this.computeShader });
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: module, entryPoint: "main" } });
        this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.particleBuffer } },
            { binding: 1, resource: { buffer: this.paramsBuffer } }
        ] });
        return this;
    }
    seed(count, particles) {
        if (!this.pipeline) this.init();
        count = Math.min(count || this.maxParticles, this.maxParticles);
        var data = new Float32Array(count * this.stride);
        for (var i = 0; i < count; i++) {
            var source = particles && particles[i];
            if (source) {
                data[i * 8] = source.position ? source.position[0] : (source[0] || 0);
                data[i * 8 + 1] = source.position ? source.position[1] : (source[1] || 0);
                data[i * 8 + 2] = source.position ? source.position[2] : (source[2] || 0);
                data[i * 8 + 3] = source.life !== undefined ? source.life : (source[3] !== undefined ? source[3] : 1);
                data[i * 8 + 4] = source.velocity ? source.velocity[0] : (source[4] || 0);
                data[i * 8 + 5] = source.velocity ? source.velocity[1] : (source[5] || 0);
                data[i * 8 + 6] = source.velocity ? source.velocity[2] : (source[6] || 0);
                data[i * 8 + 7] = source.size !== undefined ? source.size : (source[7] !== undefined ? source[7] : 1);
            } else {
                data[i * 8 + 3] = 1;
                data[i * 8 + 7] = 1;
            }
        }
        this.device.queue.writeBuffer(this.particleBuffer, 0, data);
        this.particleCount = count;
        return this;
    }
    update(deltaTime, options) {
        if (!this.pipeline) this.init();
        options = options || {};
        var gravity = options.gravity === undefined ? 0 : options.gravity;
        var respawnLife = options.respawnLife === undefined ? 2 : options.respawnLife;
        this._paramsData[0] = deltaTime;
        this._paramsData[1] = this.particleCount || this.maxParticles;
        this._paramsData[2] = respawnLife;
        this._paramsData[3] = gravity;
        this.device.queue.writeBuffer(this.paramsBuffer, 0, this._paramsData);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(Math.max(1, Math.ceil((this.particleCount || this.maxParticles) / 64)));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        return this;
    }
    readParticles() {
        return faoxomGpuReadBuffer(this.device, this.particleBuffer, (this.particleCount || this.maxParticles) * this.stride * 4);
    }
    getPositions() {
        return this.readParticles().then(function(buffer) { return new Float32Array(buffer); });
    }
    applyToAttribute(attribute) {
        return this.readParticles().then(function(buffer) {
            var values = new Float32Array(buffer);
            var array = attribute.array;
            var count = Math.min(array.length / 3, values.length / 8);
            for (var i = 0; i < count; i++) {
                array[i * 3] = values[i * 8];
                array[i * 3 + 1] = values[i * 8 + 1];
                array[i * 3 + 2] = values[i * 8 + 2];
            }
            attribute.needsUpdate = true;
            return attribute;
        });
    }
}

function faoxomGpuReadBuffer(device, buffer, byteLength) {
    var size = Math.max(4, (byteLength + 3) & ~3);
    var staging = device.createBuffer({ size: size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    var encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffer, 0, staging, 0, size);
    device.queue.submit([encoder.finish()]);
    return staging.mapAsync(GPUMapMode.READ).then(function() {
        var copy = staging.getMappedRange().slice(0, byteLength);
        staging.unmap();
        staging.destroy();
        return copy;
    });
}

class TSLBufferPacker {
    static alignTo(offset, alignment) {
        return Math.ceil(offset / alignment) * alignment;
    }
    static getTypeLayout(type, standard) {
        standard = standard || "std140";
        var isStd140 = standard === "std140";
        switch (type) {
            case "float": case "int": case "uint": return { size: 4, align: 4 };
            case "vec2": return { size: 8, align: 8 };
            case "vec3": return { size: 12, align: isStd140 ? 16 : 16 };
            case "vec4": return { size: 16, align: 16 };
            case "mat3": return { size: isStd140 ? 48 : 36, align: 16 };
            case "mat4": return { size: 64, align: 16 };
            default: return { size: 4, align: 4 };
        }
    }
    static computeStructLayout(fields, standard) {
        standard = standard || "std140";
        var isStd140 = standard === "std140";
        var offset = 0;
        var maxAlign = 4;
        var layout = {};
        for (var name in fields) {
            var fieldType = fields[name];
            var typeInfo = this.getTypeLayout(fieldType, standard);
            offset = this.alignTo(offset, typeInfo.align);
            maxAlign = Math.max(maxAlign, typeInfo.align);
            layout[name] = { type: fieldType, offset: offset, size: typeInfo.size, align: typeInfo.align };
            offset += typeInfo.size;
        }
        var structAlign = isStd140 ? this.alignTo(maxAlign, 16) : maxAlign;
        var totalSize = this.alignTo(offset, structAlign);
        return { fields: layout, totalSize: totalSize, structAlign: structAlign };
    }
    static packStruct(fields, values, standard) {
        var layout = this.computeStructLayout(fields, standard);
        var buffer = new ArrayBuffer(layout.totalSize);
        var view = new DataView(buffer);
        for (var name in fields) {
            var info = layout.fields[name];
            var val = values[name];
            if (val === undefined) continue;
            var off = info.offset;
            switch (info.type) {
                case "float": view.setFloat32(off, Number(val), true); break;
                case "int": view.setInt32(off, Number(val), true); break;
                case "uint": view.setUint32(off, Number(val), true); break;
                case "vec2":
                    view.setFloat32(off + 0, val.x !== undefined ? val.x : val[0], true);
                    view.setFloat32(off + 4, val.y !== undefined ? val.y : val[1], true);
                    break;
                case "vec3":
                    view.setFloat32(off + 0, val.x !== undefined ? val.x : val[0], true);
                    view.setFloat32(off + 4, val.y !== undefined ? val.y : val[1], true);
                    view.setFloat32(off + 8, val.z !== undefined ? val.z : val[2], true);
                    break;
                case "vec4":
                    view.setFloat32(off + 0, val.x !== undefined ? val.x : (val.r !== undefined ? val.r : val[0]), true);
                    view.setFloat32(off + 4, val.y !== undefined ? val.y : (val.g !== undefined ? val.g : val[1]), true);
                    view.setFloat32(off + 8, val.z !== undefined ? val.z : (val.b !== undefined ? val.b : val[2]), true);
                    view.setFloat32(off + 12, val.w !== undefined ? val.w : (val.a !== undefined ? val.a : val[3]), true);
                    break;
                case "mat4":
                    var elements = val.elements || val;
                    for (var m = 0; m < 16; m++) view.setFloat32(off + m * 4, elements[m], true);
                    break;
            }
        }
        return buffer;
    }
}

class BVHNode {
    constructor() {
        this.min = new Vector3(Infinity, Infinity, Infinity);
        this.max = new Vector3(-Infinity, -Infinity, -Infinity);
        this.left = null;
        this.right = null;
        this.triangles = [];
        this.isLeaf = true;
    }
}

class TriMeshBVH {
    constructor(geometry, maxTrianglesPerLeaf) {
        this.geometry = geometry;
        this.maxLeaf = maxTrianglesPerLeaf || 8;
        this.root = null;
        this.build();
    }
    build() {
        var pos = this.geometry.attributes.position.array;
        var idx = this.geometry.index ? this.geometry.index.array : null;
        var triCount = idx ? idx.length / 3 : pos.length / 9;
        var triangles = [];
        for (var t = 0; t < triCount; t++) {
            var i0 = idx ? idx[t * 3 + 0] : t * 3 + 0;
            var i1 = idx ? idx[t * 3 + 1] : t * 3 + 1;
            var i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
            var v0 = new Vector3(pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]);
            var v1 = new Vector3(pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]);
            var v2 = new Vector3(pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]);
            var center = v0.clone().add(v1).add(v2).multiplyScalar(1 / 3);
            var min = new Vector3(Math.min(v0.x, v1.x, v2.x), Math.min(v0.y, v1.y, v2.y), Math.min(v0.z, v1.z, v2.z));
            var max = new Vector3(Math.max(v0.x, v1.x, v2.x), Math.max(v0.y, v1.y, v2.y), Math.max(v0.z, v1.z, v2.z));
            triangles.push({ v0: v0, v1: v1, v2: v2, center: center, min: min, max: max });
        }
        this.root = this._buildRecursive(triangles, 0);
    }
    _buildRecursive(triangles, depth) {
        var node = new BVHNode();
        for (var i = 0; i < triangles.length; i++) {
            node.min.min(triangles[i].min);
            node.max.max(triangles[i].max);
        }
        if (triangles.length <= this.maxLeaf || depth > 20) {
            node.triangles = triangles;
            node.isLeaf = true;
            return node;
        }
        var axis = depth % 3;
        var axisKey = axis === 0 ? "x" : (axis === 1 ? "y" : "z");
        triangles.sort(function(a, b) { return a.center[axisKey] - b.center[axisKey]; });
        var mid = Math.floor(triangles.length / 2);
        node.left = this._buildRecursive(triangles.slice(0, mid), depth + 1);
        node.right = this._buildRecursive(triangles.slice(mid), depth + 1);
        node.isLeaf = false;
        return node;
    }
    raycast(ray, targetHits) {
        targetHits = targetHits || [];
        this._raycastNode(this.root, ray, targetHits);
        return targetHits;
    }
    _raycastNode(node, ray, hits) {
        if (!node) return;
        var tMin = (node.min.x - ray.origin.x) / (ray.direction.x || 1e-6);
        var tMax = (node.max.x - ray.origin.x) / (ray.direction.x || 1e-6);
        if (tMin > tMax) { var tmp = tMin; tMin = tMax; tMax = tmp; }
        if (tMax < 0) return;
        if (node.isLeaf) {
            for (var i = 0; i < node.triangles.length; i++) {
                var tri = node.triangles[i];
                var hit = ray.intersectTriangle ? ray.intersectTriangle(tri.v0, tri.v1, tri.v2, false, new Vector3()) : null;
                if (hit) hits.push({ point: hit, distance: ray.origin.distanceTo(hit) });
            }
            return;
        }
        this._raycastNode(node.left, ray, hits);
        this._raycastNode(node.right, ray, hits);
    }
}

class GJK {
    static support(shapeA, shapeB, direction) {
        var supA = shapeA.getSupportPoint(direction);
        var supB = shapeB.getSupportPoint(direction.clone().negate());
        return supA.clone().sub(supB);
    }
    static intersect(shapeA, shapeB) {
        var dir = new Vector3(1, 0, 0);
        var simplex = [this.support(shapeA, shapeB, dir)];
        dir = simplex[0].clone().negate();
        for (var iter = 0; iter < 32; iter++) {
            var a = this.support(shapeA, shapeB, dir);
            if (a.dot(dir) < 0) return false;
            simplex.push(a);
            if (this._updateSimplex(simplex, dir)) return true;
        }
        return false;
    }
    static _updateSimplex(simplex, dir) {
        if (simplex.length === 2) {
            var b = simplex[0], a = simplex[1];
            var ab = b.clone().sub(a), ao = a.clone().negate();
            if (ab.dot(ao) > 0) dir.copy(ab.clone().cross(ao).cross(ab)).normalize();
            else { simplex.splice(0, 1); dir.copy(ao); }
            return false;
        } else if (simplex.length === 3) {
            var c = simplex[0], b = simplex[1], a = simplex[2];
            var ab = b.clone().sub(a), ac = c.clone().sub(a), ao = a.clone().negate();
            var abc = ab.clone().cross(ac);
            if (abc.clone().cross(ac).dot(ao) > 0) { simplex.splice(1, 1); dir.copy(ac.clone().cross(ao).cross(ac)); return false; }
            if (ab.clone().cross(abc).dot(ao) > 0) { simplex.splice(0, 1); dir.copy(ab.clone().cross(ao).cross(ab)); return false; }
            if (abc.dot(ao) > 0) dir.copy(abc); else { simplex.splice(0, 2, b, c); dir.copy(abc.negate()); }
            return false;
        } else if (simplex.length === 4) {
            return true;
        }
        return false;
    }
}

class EPA {
    static computePenetration(shapeA, shapeB, simplex) {
        var faces = [
            { a: simplex[0], b: simplex[1], c: simplex[2] },
            { a: simplex[0], b: simplex[2], c: simplex[3] },
            { a: simplex[0], b: simplex[3], c: simplex[1] },
            { a: simplex[1], b: simplex[3], c: simplex[2] }
        ];
        var minDistance = Infinity;
        var minNormal = new Vector3();
        for (var f = 0; f < faces.length; f++) {
            var face = faces[f];
            var ab = face.b.clone().sub(face.a);
            var ac = face.c.clone().sub(face.a);
            var norm = ab.cross(ac).normalize();
            var dist = Math.abs(norm.dot(face.a));
            if (dist < minDistance) { minDistance = dist; minNormal.copy(norm); }
        }
        return { depth: minDistance, normal: minNormal };
    }
}

class ConvexHullCollider {
    constructor(vertices) {
        this.vertices = vertices || [];
        this.center = new Vector3();
        for (var i = 0; i < this.vertices.length; i++) this.center.add(this.vertices[i]);
        if (this.vertices.length) this.center.multiplyScalar(1 / this.vertices.length);
    }
    getSupportPoint(direction) {
        var maxDot = -Infinity;
        var best = this.vertices[0] || new Vector3();
        for (var i = 0; i < this.vertices.length; i++) {
            var dot = this.vertices[i].dot(direction);
            if (dot > maxDot) { maxDot = dot; best = this.vertices[i]; }
        }
        return best.clone();
    }
}

class TriMeshCollider {
    constructor(geometry) {
        this.geometry = geometry;
        this.bvh = new TriMeshBVH(geometry);
    }
    getSupportPoint(direction) {
        var pos = this.geometry.attributes.position.array;
        var maxDot = -Infinity;
        var best = new Vector3();
        for (var i = 0; i < pos.length; i += 3) {
            var v = new Vector3(pos[i], pos[i + 1], pos[i + 2]);
            var dot = v.dot(direction);
            if (dot > maxDot) { maxDot = dot; best = v; }
        }
        return best;
    }
}

class CCDSolver {
    static sweepSphere(sphere, velocity, obstacle, dt) {
        var start = sphere.center.clone();
        var dir = velocity.clone().multiplyScalar(dt);
        var dist = dir.length();
        if (dist < 1e-5) return { hit: false, toi: 1.0 };
        dir.normalize();
        var ray = new Ray(start, dir);
        var hits = obstacle.bvh ? obstacle.bvh.raycast(ray) : [];
        if (hits.length > 0) {
            var firstHit = hits[0];
            var toi = (firstHit.distance - sphere.radius) / dist;
            if (toi >= 0 && toi <= 1.0) return { hit: true, toi: toi, point: firstHit.point };
        }
        return { hit: false, toi: 1.0 };
    }
}

class Constraint {
    constructor(bodyA, bodyB) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.enabled = true;
    }
    solve(dt) {}
}

class DistanceJoint extends Constraint {
    constructor(bodyA, bodyB, distance) {
        super(bodyA, bodyB);
        this.distance = distance !== undefined ? distance : bodyA.position.distanceTo(bodyB.position);
        this.stiffness = 1.0;
    }
    solve(dt) {
        var delta = this.bodyB.position.clone().sub(this.bodyA.position);
        var currentDist = delta.length();
        if (currentDist === 0) return;
        var diff = (currentDist - this.distance) / currentDist;
        var correction = delta.multiplyScalar(diff * 0.5 * this.stiffness);
        if (!this.bodyA.isStatic) this.bodyA.position.add(correction);
        if (!this.bodyB.isStatic) this.bodyB.position.sub(correction);
    }
}

class HingeJoint extends Constraint {
    constructor(bodyA, bodyB, axis, anchor) {
        super(bodyA, bodyB);
        this.axis = axis || new Vector3(0, 1, 0);
        this.anchor = anchor || bodyA.position.clone();
        this.minAngle = -Math.PI / 2;
        this.maxAngle = Math.PI / 2;
        this.motorSpeed = 0;
        this.maxTorque = 0;
    }
    solve(dt) {
        if (!this.bodyA.isStatic && !this.bodyB.isStatic) {
            var diff = this.bodyA.position.clone().sub(this.anchor);
            this.bodyA.position.sub(diff.multiplyScalar(0.5));
            this.bodyB.position.add(diff.multiplyScalar(0.5));
        }
    }
}

class BallAndSocketJoint extends Constraint {
    constructor(bodyA, bodyB, anchor) {
        super(bodyA, bodyB);
        this.anchor = anchor || bodyA.position.clone();
    }
    solve(dt) {
        var target = this.anchor;
        if (!this.bodyA.isStatic) this.bodyA.position.copy(target);
        if (!this.bodyB.isStatic) this.bodyB.position.copy(target);
    }
}

class SliderJoint extends Constraint {
    constructor(bodyA, bodyB, axis, minLimit, maxLimit) {
        super(bodyA, bodyB);
        this.axis = axis ? axis.clone().normalize() : new Vector3(1, 0, 0);
        this.minLimit = minLimit !== undefined ? minLimit : -1;
        this.maxLimit = maxLimit !== undefined ? maxLimit : 1;
    }
    solve(dt) {
        var delta = this.bodyB.position.clone().sub(this.bodyA.position);
        var proj = delta.dot(this.axis);
        var clamped = Math.max(this.minLimit, Math.min(this.maxLimit, proj));
        var target = this.bodyA.position.clone().add(this.axis.clone().multiplyScalar(clamped));
        if (!this.bodyB.isStatic) this.bodyB.position.copy(target);
    }
}

class SpringJoint extends Constraint {
    constructor(bodyA, bodyB, restLength, stiffness, damping) {
        super(bodyA, bodyB);
        this.restLength = restLength !== undefined ? restLength : bodyA.position.distanceTo(bodyB.position);
        this.stiffness = stiffness || 50;
        this.damping = damping || 2.0;
    }
    solve(dt) {
        var delta = this.bodyB.position.clone().sub(this.bodyA.position);
        var dist = delta.length();
        if (dist === 0) return;
        var forceMag = (dist - this.restLength) * this.stiffness;
        var dir = delta.normalize();
        var f = dir.multiplyScalar(forceMag * dt);
        if (!this.bodyA.isStatic && this.bodyA.velocity) this.bodyA.velocity.add(f);
        if (!this.bodyB.isStatic && this.bodyB.velocity) this.bodyB.velocity.sub(f);
    }
}

class RagdollChain {
    constructor() {
        this.bodies = [];
        this.joints = [];
    }
    addBody(body) { this.bodies.push(body); return this; }
    addJoint(joint) { this.joints.push(joint); return this; }
    solve(dt) {
        for (var i = 0; i < this.joints.length; i++) this.joints[i].solve(dt);
    }
}

class ClothSimulation {
    constructor(width, height, segW, segH) {
        this.width = width || 2;
        this.height = height || 2;
        this.segW = segW || 10;
        this.segH = segH || 10;
        this.particles = [];
        this.constraints = [];
        this.gravity = new Vector3(0, -9.81, 0);
        this.damping = 0.98;
        this._initGrid();
    }
    _initGrid() {
        this.particles = [];
        this.constraints = [];
        for (var y = 0; y <= this.segH; y++) {
            for (var x = 0; x <= this.segW; x++) {
                var px = (x / this.segW - 0.5) * this.width;
                var py = (1.0 - y / this.segH) * this.height;
                var pz = 0;
                var isPinned = (y === 0 && (x === 0 || x === this.segW));
                this.particles.push({
                    pos: new Vector3(px, py, pz),
                    oldPos: new Vector3(px, py, pz),
                    vel: new Vector3(),
                    pinned: isPinned,
                    invMass: isPinned ? 0 : 1.0
                });
            }
        }
        var stride = this.segW + 1;
        for (var y = 0; y <= this.segH; y++) {
            for (var x = 0; x <= this.segW; x++) {
                var i = x + y * stride;
                if (x < this.segW) this.constraints.push({ a: i, b: i + 1, rest: this.width / this.segW });
                if (y < this.segH) this.constraints.push({ a: i, b: i + stride, rest: this.height / this.segH });
            }
        }
    }
    update(dt) {
        dt = Math.min(dt || 0.016, 0.033);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (p.pinned) continue;
            var temp = p.pos.clone();
            var vel = p.pos.clone().sub(p.oldPos).multiplyScalar(this.damping);
            p.pos.add(vel).add(this.gravity.clone().multiplyScalar(dt * dt));
            p.oldPos.copy(temp);
        }
        for (var iter = 0; iter < 4; iter++) {
            for (var c = 0; c < this.constraints.length; c++) {
                var con = this.constraints[c];
                var pA = this.particles[con.a], pB = this.particles[con.b];
                var delta = pB.pos.clone().sub(pA.pos);
                var dist = delta.length();
                if (dist === 0) continue;
                var diff = (dist - con.rest) / dist;
                var corr = delta.multiplyScalar(diff * 0.5);
                if (!pA.pinned) pA.pos.add(corr);
                if (!pB.pinned) pB.pos.sub(corr);
            }
        }
    }
}

class SoftBodySimulation {
    constructor(vertices, tetrahedra) {
        this.particles = (vertices || []).map(function(v) {
            return { pos: v.clone(), oldPos: v.clone(), vel: new Vector3(), invMass: 1.0 };
        });
        this.tetrahedra = tetrahedra || [];
        this.compliance = 0.01;
    }
    update(dt) {
        dt = Math.min(dt || 0.016, 0.033);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var temp = p.pos.clone();
            var vel = p.pos.clone().sub(p.oldPos).multiplyScalar(0.99);
            p.pos.add(vel).add(new Vector3(0, -9.81 * dt * dt, 0));
            p.oldPos.copy(temp);
        }
    }
}

class SPHFluidSimulation {
    constructor(maxParticles) {
        this.maxParticles = maxParticles || 512;
        this.particles = [];
        this.h = 0.4;
        this.h2 = this.h * this.h;
        this.restDensity = 1000;
        this.stiffness = 200;
        this.viscosity = 0.1;
        this.gravity = new Vector3(0, -9.81, 0);
        this._initParticles();
    }
    _initParticles() {
        this.particles = [];
        for (var i = 0; i < this.maxParticles; i++) {
            var px = (Math.random() - 0.5) * 1.5;
            var py = Math.random() * 2.0 + 0.5;
            var pz = (Math.random() - 0.5) * 1.5;
            this.particles.push({
                pos: new Vector3(px, py, pz),
                vel: new Vector3(),
                force: new Vector3(),
                density: 0,
                pressure: 0
            });
        }
    }
    update(dt) {
        dt = Math.min(dt || 0.016, 0.033);
        var poly6 = 315.0 / (64.0 * Math.PI * Math.pow(this.h, 9));
        var spikyGrad = -45.0 / (Math.PI * Math.pow(this.h, 6));
        for (var i = 0; i < this.particles.length; i++) {
            var pi = this.particles[i];
            pi.density = 0;
            for (var j = 0; j < this.particles.length; j++) {
                var pj = this.particles[j];
                var r2 = pi.pos.distanceToSquared(pj.pos);
                if (r2 < this.h2) pi.density += poly6 * Math.pow(this.h2 - r2, 3);
            }
            pi.density = Math.max(pi.density, this.restDensity * 0.1);
            pi.pressure = this.stiffness * (pi.density - this.restDensity);
        }
        for (var a = 0; a < this.particles.length; a++) {
            var pa = this.particles[a];
            pa.force.copy(this.gravity.clone().multiplyScalar(pa.density));
            for (var b = 0; b < this.particles.length; b++) {
                if (a === b) continue;
                var pb = this.particles[b];
                var delta = pa.pos.clone().sub(pb.pos);
                var r = delta.length();
                if (r > 0 && r < this.h) {
                    var pressTerm = (pa.pressure + pb.pressure) / (2.0 * pb.density);
                    var gradW = delta.normalize().multiplyScalar(spikyGrad * Math.pow(this.h - r, 2));
                    pa.force.sub(gradW.multiplyScalar(pressTerm));
                }
            }
            var acc = pa.force.clone().multiplyScalar(1.0 / pa.density);
            pa.vel.add(acc.multiplyScalar(dt));
            pa.pos.add(pa.vel.clone().multiplyScalar(dt));
            if (pa.pos.y < 0) { pa.pos.y = 0; pa.vel.y *= -0.5; }
        }
    }
}

class ContinuousLOD extends Object3D {
    constructor() {
        super();
        this.type = "ContinuousLOD";
        this.levels = [];
        this.activeLevel = 0;
    }
    addLevel(object, screenSpaceError) {
        this.levels.push({ object: object, error: screenSpaceError || 0 });
        this.levels.sort(function(a, b) { return a.error - b.error; });
        this.add(object);
        return this;
    }
    update(camera, viewportHeight) {
        var h = viewportHeight || 720;
        var dist = this.getWorldPosition(new Vector3()).distanceTo(camera.getWorldPosition(new Vector3()));
        var fov = (camera.fov || 50) * Math.PI / 180;
        var sse = (1.0 * h) / (2.0 * Math.max(0.1, dist) * Math.tan(fov / 2.0));
        var chosen = 0;
        for (var i = this.levels.length - 1; i >= 0; i--) {
            if (sse >= this.levels[i].error) { chosen = i; break; }
        }
        this.activeLevel = chosen;
        for (var l = 0; l < this.levels.length; l++) {
            this.levels[l].object.visible = (l === chosen);
        }
    }
}

class MeshDecimator {
    static decimate(geometry, targetRatio) {
        targetRatio = targetRatio !== undefined ? targetRatio : 0.5;
        var pos = geometry.attributes.position.array || geometry.attributes.position;
        var rawIdx = geometry.index ? (geometry.index.array || geometry.index) : null;
        if (!rawIdx) return geometry.clone();
        var currentTriCount = rawIdx.length / 3;
        var targetTriCount = Math.max(1, Math.floor(currentTriCount * targetRatio));
        var newIndices = new Uint32Array(targetTriCount * 3);
        var step = currentTriCount / targetTriCount;
        for (var t = 0; t < targetTriCount; t++) {
            var srcT = Math.floor(t * step);
            newIndices[t * 3 + 0] = rawIdx[srcT * 3 + 0];
            newIndices[t * 3 + 1] = rawIdx[srcT * 3 + 1];
            newIndices[t * 3 + 2] = rawIdx[srcT * 3 + 2];
        }
        var decimated = new Geometry();
        decimated.setAttribute("position", new Float32Array(pos), 3);
        if (geometry.attributes.normal) decimated.setAttribute("normal", new Float32Array(geometry.attributes.normal.array || geometry.attributes.normal), 3);
        if (geometry.attributes.uv) decimated.setAttribute("uv", new Float32Array(geometry.attributes.uv.array || geometry.attributes.uv), 2);
        decimated.setIndex(newIndices);
        decimated.computeBounds();
        return decimated;
    }
}

class VirtualGeometryStreamer {
    constructor(options) {
        options = options || {};
        this.maxMemoryBudgetMB = options.maxMemoryBudgetMB || 256;
        this.chunks = [];
        this.activeChunks = [];
    }
    registerChunk(chunk) { this.chunks.push(chunk); return this; }
    update(camera) {
        var camPos = camera.getWorldPosition(new Vector3());
        this.activeChunks = [];
        for (var i = 0; i < this.chunks.length; i++) {
            var c = this.chunks[i];
            var dist = camPos.distanceTo(c.center || new Vector3());
            c.visible = dist < (c.loadRadius || 100);
            if (c.visible) this.activeChunks.push(c);
        }
    }
}

class AudioListener extends Object3D {
    constructor(audioContext) {
        super();
        this.type = "AudioListener";
        this.context = audioContext || (typeof AudioContext !== "undefined" ? new AudioContext() : null);
        this.gain = this.context && this.context.createGain ? this.context.createGain() : null;
        if (this.gain && this.context) this.gain.connect(this.context.destination);
    }
    updateMatrixWorld(force) {
        super.updateMatrixWorld(force);
        if (!this.context || !this.context.listener) return;
        var listener = this.context.listener;
        var pos = this.getWorldPosition(new Vector3());
        var dir = this.getWorldDirection(new Vector3());
        var up = this.up.clone().applyQuaternion(this.quaternion);
        if (listener.positionX) {
            listener.positionX.value = pos.x;
            listener.positionY.value = pos.y;
            listener.positionZ.value = pos.z;
            listener.forwardX.value = dir.x;
            listener.forwardY.value = dir.y;
            listener.forwardZ.value = dir.z;
            listener.upX.value = up.x;
            listener.upY.value = up.y;
            listener.upZ.value = up.z;
        } else if (listener.setPosition) {
            listener.setPosition(pos.x, pos.y, pos.z);
            listener.setOrientation(dir.x, dir.y, dir.z, up.x, up.y, up.z);
        }
    }
}

class PositionalAudio extends Object3D {
    constructor(listener) {
        super();
        this.type = "PositionalAudio";
        this.listener = listener;
        this.context = listener ? listener.context : null;
        this.panner = this.context && this.context.createPanner ? this.context.createPanner() : null;
        if (this.panner) {
            this.panner.panningModel = "HRTF";
            this.panner.distanceModel = "inverse";
            this.panner.refDistance = 1;
            this.panner.maxDistance = 1000;
            this.panner.rolloffFactor = 1;
            this.panner.coneInnerAngle = 360;
            this.panner.coneOuterAngle = 0;
            this.panner.coneOuterGain = 0;
            if (listener && listener.gain) this.panner.connect(listener.gain);
        }
    }
    setRefDistance(value) { if (this.panner) this.panner.refDistance = value; return this; }
    setMaxDistance(value) { if (this.panner) this.panner.maxDistance = value; return this; }
    setRolloffFactor(value) { if (this.panner) this.panner.rolloffFactor = value; return this; }
    updateMatrixWorld(force) {
        super.updateMatrixWorld(force);
        if (!this.panner) return;
        var pos = this.getWorldPosition(new Vector3());
        var dir = this.getWorldDirection(new Vector3());
        if (this.panner.positionX) {
            this.panner.positionX.value = pos.x;
            this.panner.positionY.value = pos.y;
            this.panner.positionZ.value = pos.z;
            this.panner.orientationX.value = dir.x;
            this.panner.orientationY.value = dir.y;
            this.panner.orientationZ.value = dir.z;
        } else if (this.panner.setPosition) {
            this.panner.setPosition(pos.x, pos.y, pos.z);
            this.panner.setOrientation(dir.x, dir.y, dir.z);
        }
    }
}

class AudioEnvironment {
    constructor(listener) {
        this.listener = listener;
        this.reverbNode = listener && listener.context && listener.context.createConvolver ? listener.context.createConvolver() : null;
        this.occlusionFilter = listener && listener.context && listener.context.createBiquadFilter ? listener.context.createBiquadFilter() : null;
        if (this.occlusionFilter) this.occlusionFilter.type = "lowpass";
    }
}

class WebXRHandTracker {
    constructor() {
        this.jointNames = [
            "wrist",
            "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip",
            "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip",
            "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip",
            "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip",
            "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"
        ];
        this.joints = {};
        for (var i = 0; i < this.jointNames.length; i++) {
            this.joints[this.jointNames[i]] = { position: new Vector3(), orientation: new Quaternion(), radius: 0.01 };
        }
    }
    update(xrHand, frame, refSpace) {
        if (!xrHand || !frame || !refSpace) return;
        for (var i = 0; i < this.jointNames.length; i++) {
            var name = this.jointNames[i];
            var joint = xrHand.get(name);
            if (joint) {
                var pose = frame.getJointPose ? frame.getJointPose(joint, refSpace) : null;
                if (pose && pose.transform) {
                    var pos = pose.transform.position;
                    var rot = pose.transform.orientation;
                    this.joints[name].position.set(pos.x, pos.y, pos.z);
                    this.joints[name].orientation.set(rot.x, rot.y, rot.z, rot.w);
                    this.joints[name].radius = pose.radius || 0.01;
                }
            }
        }
    }
}

class WebXRPlaneDetector {
    constructor() {
        this.planes = [];
    }
    update(frame, refSpace) {
        if (!frame || !frame.detectedPlanes) return;
        this.planes = [];
        frame.detectedPlanes.forEach(function(plane) {
            this.planes.push({
                planeSpace: plane.planeSpace,
                polygon: plane.polygon,
                orientation: plane.orientation,
                lastChangedTime: plane.lastChangedTime
            });
        }.bind(this));
    }
}

class WebXRLightEstimator {
    constructor() {
        this.primaryLightDirection = new Vector3(0, 1, 0);
        this.primaryLightIntensity = new Vector3(1, 1, 1);
        this.sphericalHarmonics = new Float32Array(27);
    }
    update(lightProbe) {
        if (!lightProbe) return;
        if (lightProbe.sphericalHarmonics) {
            this.sphericalHarmonics.set(lightProbe.sphericalHarmonics.coefficients || []);
        }
    }
}

class WebXRHaptics {
    static pulse(inputSource, intensity, duration) {
        if (inputSource && inputSource.gamepad && inputSource.gamepad.hapticActuators && inputSource.gamepad.hapticActuators[0]) {
            return inputSource.gamepad.hapticActuators[0].pulse(intensity || 1.0, duration || 100);
        }
        return Promise.resolve(false);
    }
}

FaoxomJs.LightClusterGrid = LightClusterGrid;
FaoxomJs.ClusteredLightingManager = ClusteredLightingManager;
FaoxomJs.PhysicalMaterial = PhysicalMaterial;
FaoxomJs.SSSSProfile = SSSSProfile;
FaoxomJs.Pass = Pass;
FaoxomJs.RenderPass = RenderPass;
FaoxomJs.GTAOPass = GTAOPass;
FaoxomJs.HBAOPass = HBAOPass;
FaoxomJs.ScreenSpaceReflectionsPass = ScreenSpaceReflectionsPass;
FaoxomJs.SSRPass = ScreenSpaceReflectionsPass;
FaoxomJs.SSGIPass = SSGIPass;
FaoxomJs.BokehDepthOfFieldPass = BokehDepthOfFieldPass;
FaoxomJs.ProgressiveBloomPass = ProgressiveBloomPass;
FaoxomJs.BloomPass = ProgressiveBloomPass;
FaoxomJs.TAAPass = TAAPass;
FaoxomJs.EffectComposer = EffectComposer;
FaoxomJs.GPUComputePass = GPUComputePass;
FaoxomJs.GPUCullingPipeline = GPUCullingPipeline;
FaoxomJs.GPUIndirectDrawBuffer = GPUIndirectDrawBuffer;
FaoxomJs.GPUParticleComputeSystem = GPUParticleComputeSystem;
FaoxomJs.TSLBufferPacker = TSLBufferPacker;
FaoxomJs.BVHNode = BVHNode;
FaoxomJs.TriMeshBVH = TriMeshBVH;
FaoxomJs.GJK = GJK;
FaoxomJs.EPA = EPA;
FaoxomJs.ConvexHullCollider = ConvexHullCollider;
FaoxomJs.TriMeshCollider = TriMeshCollider;
FaoxomJs.CCDSolver = CCDSolver;
FaoxomJs.Constraint = Constraint;
FaoxomJs.DistanceJoint = DistanceJoint;
FaoxomJs.HingeJoint = HingeJoint;
FaoxomJs.BallAndSocketJoint = BallAndSocketJoint;
FaoxomJs.SliderJoint = SliderJoint;
FaoxomJs.SpringJoint = SpringJoint;
FaoxomJs.RagdollChain = RagdollChain;
FaoxomJs.ClothSimulation = ClothSimulation;
FaoxomJs.SoftBodySimulation = SoftBodySimulation;
FaoxomJs.SPHFluidSimulation = SPHFluidSimulation;
FaoxomJs.ContinuousLOD = ContinuousLOD;
FaoxomJs.MeshDecimator = MeshDecimator;
FaoxomJs.VirtualGeometryStreamer = VirtualGeometryStreamer;
FaoxomJs.AudioListener = AudioListener;
FaoxomJs.PositionalAudio = PositionalAudio;
FaoxomJs.AudioEnvironment = AudioEnvironment;
FaoxomJs.WebXRHandTracker = WebXRHandTracker;
FaoxomJs.WebXRPlaneDetector = WebXRPlaneDetector;
FaoxomJs.WebXRLightEstimator = WebXRLightEstimator;
FaoxomJs.WebXRHaptics = WebXRHaptics;

FaoxomJs.VERSION = "v5";
if (typeof module !== "undefined" && module.exports) {
    module.exports = FaoxomJs;
}
export default FaoxomJs;
`;

    const finalSrc = baseSrc + newCode;
    await fs.writeFile("FaoxomJs.js", finalSrc, "utf8");
    console.log("Successfully updated FaoxomJs.js to v5 (size: " + finalSrc.length + " bytes)");


    // Ensure dist/ directory exists
    await fs.mkdir("dist", { recursive: true });
    await fs.mkdir("bundles", { recursive: true });

    // 2. dist/faoxom.js (Classic browser UMD / globalThis script bundle without top-level export)
    const umdSource = `(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.FaoxomJs = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
` + baseSrc + newCode.replace("export default FaoxomJs;", "").replace("if (typeof module !== \"undefined\" && module.exports) {\n    module.exports = FaoxomJs;\n}", "") + `
return FaoxomJs;
}));`;
    await fs.writeFile("dist/faoxom.js", umdSource, "utf8");
    await fs.writeFile("bundles/faoxom.js", umdSource, "utf8");

    // 3. dist/faoxom.min.js (Minified CDN file for jsDelivr/unpkg classic script tags)
    console.log("Minifying dist/faoxom.min.js with terser...");
    const minifiedUmd = await minify(umdSource, {
        compress: {
            passes: 2,
            dead_code: true
        },
        mangle: {
            toplevel: false
        },
        format: {
            comments: false,
            preamble: "/*! FaoxomJS v5 | MIT License | https://github.com/axom0022/faoxomjs */"
        }
    });
    await fs.writeFile("dist/faoxom.min.js", minifiedUmd.code, "utf8");
    await fs.writeFile("bundles/faoxom.min.js", minifiedUmd.code, "utf8");
    console.log("Created dist/faoxom.min.js (" + minifiedUmd.code.length + " bytes)");

    // 4. dist/faoxom.module.js (ES module bundle)
    const esmBundleSource = finalSrc;
    await fs.writeFile("dist/faoxom.module.js", esmBundleSource, "utf8");
    await fs.writeFile("bundles/faoxom.module.js", esmBundleSource, "utf8");

    // 5. dist/faoxom.module.min.js (Minified ES module bundle for CDN ESM imports)
    console.log("Minifying dist/faoxom.module.min.js with terser...");
    const minifiedEsm = await minify(esmBundleSource, {
        module: true,
        compress: {
            passes: 2,
            dead_code: true
        },
        mangle: {
            toplevel: false
        },
        format: {
            comments: false,
            preamble: "/*! FaoxomJS v5 ESM | MIT License | https://github.com/axom0022/faoxomjs */"
        }
    });
    await fs.writeFile("dist/faoxom.module.min.js", minifiedEsm.code, "utf8");
    await fs.writeFile("bundles/faoxom.module.min.js", minifiedEsm.code, "utf8");
    console.log("Created dist/faoxom.module.min.js (" + minifiedEsm.code.length + " bytes)");

    // Generate modular tree-shakable ESM packages under esm/
    await fs.mkdir("esm", { recursive: true });

    await fs.writeFile("esm/index.js", `import FaoxomJs from "../FaoxomJs.js";
export default FaoxomJs;
export * from "./math.js";
export * from "./core.js";
export * from "./geometry.js";
export * from "./materials.js";
export * from "./lighting.js";
export * from "./postprocessing.js";
export * from "./physics.js";
export * from "./compute.js";
export * from "./loaders.js";
export * from "./audio.js";
export * from "./xr.js";
export * from "./react.js";
export * from "./controls.js";
`);

    await fs.writeFile("esm/math.js", `import FaoxomJs from "../FaoxomJs.js";
export const Vector2 = FaoxomJs.Vector2;
export const Vector3 = FaoxomJs.Vector3;
export const Vector4 = FaoxomJs.Vector4;
export const Quaternion = FaoxomJs.Quaternion;
export const Matrix3 = FaoxomJs.Matrix3;
export const Matrix4 = FaoxomJs.Matrix4;
export const Euler = FaoxomJs.Euler;
export const Color = FaoxomJs.Color;
export const Ray = FaoxomJs.Ray;
export const Plane = FaoxomJs.Plane;
export const Box3 = FaoxomJs.Box3;
export const Sphere = FaoxomJs.Sphere;
export const Frustum = FaoxomJs.Frustum;
export const MathUtils = FaoxomJs.MathUtils;
`);

    await fs.writeFile("esm/core.js", `import FaoxomJs from "../FaoxomJs.js";
export const Object3D = FaoxomJs.Object3D;
export const Scene = FaoxomJs.Scene;
export const Camera = FaoxomJs.Camera;
export const PerspectiveCamera = FaoxomJs.PerspectiveCamera;
export const OrthographicCamera = FaoxomJs.OrthographicCamera;
export const Mesh = FaoxomJs.Mesh;
export const Group = FaoxomJs.Group;
export const Points = FaoxomJs.Points;
export const Line = FaoxomJs.Line;
export const LineSegments = FaoxomJs.LineSegments;
export const InstancedMesh = FaoxomJs.InstancedMesh;
export const SkinnedMesh = FaoxomJs.SkinnedMesh;
export const Bone = FaoxomJs.Bone;
export const Skeleton = FaoxomJs.Skeleton;
export const WebGLRenderer = FaoxomJs.WebGLRenderer;
export const WebGPURenderer = FaoxomJs.WebGPURenderer;
export const WebGLRenderTarget = FaoxomJs.WebGLRenderTarget;
export const Raycaster = FaoxomJs.Raycaster;
export const Clock = FaoxomJs.Clock;
export const EventDispatcher = FaoxomJs.EventDispatcher;
`);

    await fs.writeFile("esm/geometry.js", `import FaoxomJs from "../FaoxomJs.js";
export const Geometry = FaoxomJs.Geometry;
export const BufferGeometry = FaoxomJs.BufferGeometry;
export const BoxGeometry = FaoxomJs.BoxGeometry;
export const SphereGeometry = FaoxomJs.SphereGeometry;
export const PlaneGeometry = FaoxomJs.PlaneGeometry;
export const CylinderGeometry = FaoxomJs.CylinderGeometry;
export const ConeGeometry = FaoxomJs.ConeGeometry;
export const TorusGeometry = FaoxomJs.TorusGeometry;
export const TorusKnotGeometry = FaoxomJs.TorusKnotGeometry;
export const IcosahedronGeometry = FaoxomJs.IcosahedronGeometry;
export const DodecahedronGeometry = FaoxomJs.DodecahedronGeometry;
export const OctahedronGeometry = FaoxomJs.OctahedronGeometry;
export const TetrahedronGeometry = FaoxomJs.TetrahedronGeometry;
export const RingGeometry = FaoxomJs.RingGeometry;
export const ShapeGeometry = FaoxomJs.ShapeGeometry;
export const ExtrudeGeometry = FaoxomJs.ExtrudeGeometry;
export const TubeGeometry = FaoxomJs.TubeGeometry;
export const LatheGeometry = FaoxomJs.LatheGeometry;
export const Curve = FaoxomJs.Curve;
export const CatmullRomCurve3 = FaoxomJs.CatmullRomCurve3;
export const CubicBezierCurve3 = FaoxomJs.CubicBezierCurve3;
export const QuadraticBezierCurve3 = FaoxomJs.QuadraticBezierCurve3;
export const NURBSCurve = FaoxomJs.NURBSCurve;
export const Shape = FaoxomJs.Shape;
export const Path = FaoxomJs.Path;
export const ContinuousLOD = FaoxomJs.ContinuousLOD;
export const MeshDecimator = FaoxomJs.MeshDecimator;
export const VirtualGeometryStreamer = FaoxomJs.VirtualGeometryStreamer;
`);

    await fs.writeFile("esm/materials.js", `import FaoxomJs from "../FaoxomJs.js";
export const Material = FaoxomJs.Material;
export const BasicMaterial = FaoxomJs.BasicMaterial;
export const StandardMaterial = FaoxomJs.StandardMaterial;
export const PhysicalMaterial = FaoxomJs.PhysicalMaterial;
export const PhongMaterial = FaoxomJs.PhongMaterial;
export const LambertMaterial = FaoxomJs.LambertMaterial;
export const ToonMaterial = FaoxomJs.ToonMaterial;
export const PointsMaterial = FaoxomJs.PointsMaterial;
export const LineBasicMaterial = FaoxomJs.LineBasicMaterial;
export const ShaderMaterial = FaoxomJs.ShaderMaterial;
export const NodeMaterial = FaoxomJs.NodeMaterial;
export const MeshStandardNodeMaterial = FaoxomJs.MeshStandardNodeMaterial;
export const MeshBasicNodeMaterial = FaoxomJs.MeshBasicNodeMaterial;
export const ShaderNode = FaoxomJs.ShaderNode;
export const tsl = FaoxomJs.tsl;
export const SSSSProfile = FaoxomJs.SSSSProfile;
export const TSLBufferPacker = FaoxomJs.TSLBufferPacker;
`);

    await fs.writeFile("esm/lighting.js", `import FaoxomJs from "../FaoxomJs.js";
export const Light = FaoxomJs.Light;
export const DirectionalLight = FaoxomJs.DirectionalLight;
export const PointLight = FaoxomJs.PointLight;
export const SpotLight = FaoxomJs.SpotLight;
export const AmbientLight = FaoxomJs.AmbientLight;
export const HemisphereLight = FaoxomJs.HemisphereLight;
export const RectAreaLight = FaoxomJs.RectAreaLight;
export const CSM = FaoxomJs.CSM;
export const CascadedShadowMap = FaoxomJs.CascadedShadowMap;
export const LightClusterGrid = FaoxomJs.LightClusterGrid;
export const ClusteredLightingManager = FaoxomJs.ClusteredLightingManager;
export const AtmosphericSky = FaoxomJs.AtmosphericSky;
`);

    await fs.writeFile("esm/postprocessing.js", `import FaoxomJs from "../FaoxomJs.js";
export const EffectComposer = FaoxomJs.EffectComposer;
export const Pass = FaoxomJs.Pass;
export const RenderPass = FaoxomJs.RenderPass;
export const GTAOPass = FaoxomJs.GTAOPass;
export const HBAOPass = FaoxomJs.HBAOPass;
export const ScreenSpaceReflectionsPass = FaoxomJs.ScreenSpaceReflectionsPass;
export const SSRPass = FaoxomJs.SSRPass;
export const SSGIPass = FaoxomJs.SSGIPass;
export const BokehDepthOfFieldPass = FaoxomJs.BokehDepthOfFieldPass;
export const ProgressiveBloomPass = FaoxomJs.ProgressiveBloomPass;
export const BloomPass = FaoxomJs.BloomPass;
export const TAAPass = FaoxomJs.TAAPass;
export const VolumetricPass = FaoxomJs.VolumetricPass;
`);

    await fs.writeFile("esm/physics.js", `import FaoxomJs from "../FaoxomJs.js";
export const PhysicsWorld = FaoxomJs.PhysicsWorld;
export const RigidBody = FaoxomJs.RigidBody;
export const BVHNode = FaoxomJs.BVHNode;
export const TriMeshBVH = FaoxomJs.TriMeshBVH;
export const GJK = FaoxomJs.GJK;
export const EPA = FaoxomJs.EPA;
export const ConvexHullCollider = FaoxomJs.ConvexHullCollider;
export const TriMeshCollider = FaoxomJs.TriMeshCollider;
export const CCDSolver = FaoxomJs.CCDSolver;
export const Constraint = FaoxomJs.Constraint;
export const DistanceJoint = FaoxomJs.DistanceJoint;
export const HingeJoint = FaoxomJs.HingeJoint;
export const BallAndSocketJoint = FaoxomJs.BallAndSocketJoint;
export const SliderJoint = FaoxomJs.SliderJoint;
export const SpringJoint = FaoxomJs.SpringJoint;
export const RagdollChain = FaoxomJs.RagdollChain;
export const ClothSimulation = FaoxomJs.ClothSimulation;
export const SoftBodySimulation = FaoxomJs.SoftBodySimulation;
export const SPHFluidSimulation = FaoxomJs.SPHFluidSimulation;
`);

    await fs.writeFile("esm/compute.js", `import FaoxomJs from "../FaoxomJs.js";
export const GPUComputePass = FaoxomJs.GPUComputePass;
export const GPUCullingPipeline = FaoxomJs.GPUCullingPipeline;
export const GPUIndirectDrawBuffer = FaoxomJs.GPUIndirectDrawBuffer;
export const GPUParticleComputeSystem = FaoxomJs.GPUParticleComputeSystem;
`);

    await fs.writeFile("esm/loaders.js", `import FaoxomJs from "../FaoxomJs.js";
export const AssetLoader = FaoxomJs.AssetLoader;
export const GLTFLoader = FaoxomJs.GLTFLoader;
export const GLTFExporter = FaoxomJs.GLTFExporter;
export const OBJLoader = FaoxomJs.OBJLoader;
export const OBJExporter = FaoxomJs.OBJExporter;
export const STLLoader = FaoxomJs.STLLoader;
export const STLExporter = FaoxomJs.STLExporter;
export const PLYLoader = FaoxomJs.PLYLoader;
export const PLYExporter = FaoxomJs.PLYExporter;
export const SVGLoader = FaoxomJs.SVGLoader;
export const FBXLoader = FaoxomJs.FBXLoader;
export const KTX2Loader = FaoxomJs.KTX2Loader;
export const TextureLoader = FaoxomJs.TextureLoader;
export const FileLoader = FaoxomJs.FileLoader;
export const LoadingManager = FaoxomJs.LoadingManager;
export const registerModel = FaoxomJs.registerModel;
export const embedModel = FaoxomJs.embedModel;
export const listEmbeddedModels = FaoxomJs.listEmbeddedModels;
`);

    await fs.writeFile("esm/audio.js", `import FaoxomJs from "../FaoxomJs.js";
export const AudioListener = FaoxomJs.AudioListener;
export const PositionalAudio = FaoxomJs.PositionalAudio;
export const AudioEnvironment = FaoxomJs.AudioEnvironment;
`);

    await fs.writeFile("esm/xr.js", `import FaoxomJs from "../FaoxomJs.js";
export const WebXRHandTracker = FaoxomJs.WebXRHandTracker;
export const WebXRPlaneDetector = FaoxomJs.WebXRPlaneDetector;
export const WebXRLightEstimator = FaoxomJs.WebXRLightEstimator;
export const WebXRHaptics = FaoxomJs.WebXRHaptics;
`);

    await fs.writeFile("esm/react.js", `import FaoxomJs from "../FaoxomJs.js";
export const FaoxomReact = FaoxomJs.FaoxomReact;
export const createFaoxomRoot = FaoxomJs.createFaoxomRoot;
`);

    await fs.writeFile("esm/controls.js", `import FaoxomJs from "../FaoxomJs.js";
export const OrbitControls = FaoxomJs.OrbitControls;
export const FirstPersonControls = FaoxomJs.FirstPersonControls;
export const PointerLockControls = FaoxomJs.PointerLockControls;
export const MapControls = FaoxomJs.MapControls;
export const TransformControls = FaoxomJs.TransformControls;
export const StatsPanel = FaoxomJs.StatsPanel;
export const CameraHelper = FaoxomJs.CameraHelper;
export const DirectionalLightHelper = FaoxomJs.DirectionalLightHelper;
export const PointLightHelper = FaoxomJs.PointLightHelper;
export const BoxHelper = FaoxomJs.BoxHelper;
`);

    // Update package.json
    const pkg = {
        name: "faoxomjs",
        version: "5.0.0",
        description: "Zero-dependency, high-performance, single-file and modular 3D engine for WebGL2 and WebGPU",
        type: "module",
        main: "./FaoxomJs.js",
        module: "./esm/index.js",
        types: "./FaoxomJs.d.ts",
        unpkg: "./dist/faoxom.min.js",
        jsdelivr: "./dist/faoxom.min.js",
        exports: {
            ".": {
                types: "./FaoxomJs.d.ts",
                import: "./esm/index.js",
                default: "./FaoxomJs.js"
            },
            "./math": {
                types: "./esm/math.d.ts",
                default: "./esm/math.js"
            },
            "./core": {
                types: "./esm/core.d.ts",
                default: "./esm/core.js"
            },
            "./geometry": {
                types: "./esm/geometry.d.ts",
                default: "./esm/geometry.js"
            },
            "./materials": {
                types: "./esm/materials.d.ts",
                default: "./esm/materials.js"
            },
            "./lighting": {
                types: "./esm/lighting.d.ts",
                default: "./esm/lighting.js"
            },
            "./postprocessing": {
                types: "./esm/postprocessing.d.ts",
                default: "./esm/postprocessing.js"
            },
            "./physics": {
                types: "./esm/physics.d.ts",
                default: "./esm/physics.js"
            },
            "./compute": {
                types: "./esm/compute.d.ts",
                default: "./esm/compute.js"
            },
            "./loaders": {
                types: "./esm/loaders.d.ts",
                default: "./esm/loaders.js"
            },
            "./audio": {
                types: "./esm/audio.d.ts",
                default: "./esm/audio.js"
            },
            "./xr": {
                types: "./esm/xr.d.ts",
                default: "./esm/xr.js"
            },
            "./react": {
                types: "./esm/react.d.ts",
                default: "./esm/react.js"
            },
            "./controls": {
                types: "./esm/controls.d.ts",
                default: "./esm/controls.js"
            }
        },
        scripts: {
            "build": "node tools/build_faoxom_ultimate.mjs",
            "typecheck": "tsc --noEmit",
            "test:browser": "node tests/run_browser_validation.mjs tests/browser-report.json",
            "test:game": "node tests/run_game_validation.mjs tests/game-parity-report.json tests/game-faoxom-baseline.png",
            "test:reference": "node tests/run_reference_validation.mjs tests/reference-report.json",
            "test:feature": "node tests/run_feature_validation.mjs tests/feature-report.json",
            "test": "npm run typecheck && npm run test:browser && npm run test:game && npm run test:reference && npm run test:feature"
        },
        devDependencies: {
            "playwright": "^1.58.0",
            "terser": "^5.39.0",
            "typescript": "^5.0.0"
        }
    };
    await fs.writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n", "utf8");

    console.log("FaoxomJS Ultimate build & distribution complete!");
}

build().catch(err => {
    console.error("Build failed:", err);
    process.exit(1);
});

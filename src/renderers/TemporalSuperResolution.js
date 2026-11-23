const foveatedQualityWGSL = `
struct Region {
    centerInnerOuter: vec4<f32>,
    quality: vec4<f32>,
};
struct Parameters {
    dimensions: vec4<u32>,
    settings: vec4<f32>,
};
@group(0) @binding(0) var<uniform> parameters: Parameters;
@group(0) @binding(1) var<storage, read> regions: array<Region>;
@group(0) @binding(2) var outputMap: texture_storage_2d<r32float, write>;
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
    if (invocation.x >= parameters.dimensions.x || invocation.y >= parameters.dimensions.y) { return; }
    let uv = (vec2<f32>(invocation.xy) + vec2<f32>(0.5)) / vec2<f32>(parameters.dimensions.xy);
    var quality = parameters.settings.x;
    for (var index = 0u; index < parameters.dimensions.z; index++) {
        let region = regions[index];
        if (region.quality.w < 0.5) { continue; }
        let aspectDelta = vec2<f32>((uv.x - region.centerInnerOuter.x) * parameters.settings.y, uv.y - region.centerInnerOuter.y);
        let distance = length(aspectDelta);
        let transition = smoothstep(region.centerInnerOuter.z, max(region.centerInnerOuter.z + 0.00001, region.centerInnerOuter.w), distance);
        let shaped = pow(transition, max(0.01, region.quality.z));
        let regionQuality = mix(region.quality.y, region.quality.x, shaped);
        quality = max(quality, regionQuality);
    }
    textureStore(outputMap, vec2<i32>(invocation.xy), vec4<f32>(clamp(quality, 0.0, 1.0), 0.0, 0.0, 1.0));
}`;

const temporalSuperResolutionWGSL = `
struct Parameters {
    dimensions: vec4<f32>,
    jitter: vec4<f32>,
    resolve: vec4<f32>,
    flags: vec4<u32>,
};
@group(0) @binding(0) var<uniform> parameters: Parameters;
@group(0) @binding(1) var sourceColor: texture_2d<f32>;
@group(0) @binding(2) var sourceDepth: texture_depth_2d;
@group(0) @binding(3) var velocityTexture: texture_2d<f32>;
@group(0) @binding(4) var reactiveTexture: texture_2d<f32>;
@group(0) @binding(5) var historyColor: texture_2d<f32>;
@group(0) @binding(6) var historyDepth: texture_2d<f32>;
@group(0) @binding(7) var qualityMap: texture_2d<f32>;
@group(0) @binding(8) var linearSampler: sampler;
@group(0) @binding(9) var outputColor: texture_storage_2d<rgba16float, write>;
@group(0) @binding(10) var nextHistoryColor: texture_storage_2d<rgba16float, write>;
@group(0) @binding(11) var nextHistoryDepth: texture_storage_2d<r32float, write>;
fn rgbToYCoCg(color: vec3<f32>) -> vec3<f32> {
    let co = color.r - color.b;
    let temporary = color.b + co * 0.5;
    let cg = color.g - temporary;
    return vec3<f32>(temporary + cg * 0.5, co, cg);
}
fn yCoCgToRgb(color: vec3<f32>) -> vec3<f32> {
    let temporary = color.x - color.z * 0.5;
    let green = color.z + temporary;
    return vec3<f32>(temporary + color.y * 0.5, green, temporary - color.y * 0.5);
}
fn sourceSample(uv: vec2<f32>, quality: f32) -> vec3<f32> {
    let base = textureSampleLevel(sourceColor, linearSampler, uv, 0.0).rgb;
    if (quality < 0.45) { return base; }
    let texel = vec2<f32>(1.0 / parameters.dimensions.x, 1.0 / parameters.dimensions.y);
    let north = textureSampleLevel(sourceColor, linearSampler, uv + vec2<f32>(0.0, -texel.y), 0.0).rgb;
    let south = textureSampleLevel(sourceColor, linearSampler, uv + vec2<f32>(0.0, texel.y), 0.0).rgb;
    let east = textureSampleLevel(sourceColor, linearSampler, uv + vec2<f32>(texel.x, 0.0), 0.0).rgb;
    let west = textureSampleLevel(sourceColor, linearSampler, uv + vec2<f32>(-texel.x, 0.0), 0.0).rgb;
    return mix(base, (base * 4.0 + north + south + east + west) / 8.0, smoothstep(0.45, 1.0, quality));
}
fn neighborhood(uv: vec2<f32>) -> array<vec3<f32>, 2> {
    let texel = vec2<f32>(1.0 / parameters.dimensions.x, 1.0 / parameters.dimensions.y);
    var minimum = vec3<f32>(1.0e20);
    var maximum = vec3<f32>(-1.0e20);
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let sampleColor = rgbToYCoCg(textureSampleLevel(sourceColor, linearSampler, clamp(uv + vec2<f32>(f32(x), f32(y)) * texel, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb);
            minimum = min(minimum, sampleColor);
            maximum = max(maximum, sampleColor);
        }
    }
    return array<vec3<f32>, 2>(minimum, maximum);
}
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
    let outputDimensions = vec2<u32>(u32(parameters.dimensions.z), u32(parameters.dimensions.w));
    if (invocation.x >= outputDimensions.x || invocation.y >= outputDimensions.y) { return; }
    let outputUv = (vec2<f32>(invocation.xy) + vec2<f32>(0.5)) / vec2<f32>(outputDimensions);
    let jitterDelta = (parameters.jitter.xy - parameters.jitter.zw) / vec2<f32>(parameters.dimensions.xy);
    let sourceUv = clamp(outputUv + parameters.jitter.xy / vec2<f32>(parameters.dimensions.xy), vec2<f32>(0.0), vec2<f32>(1.0));
    let qualityDimensions = textureDimensions(qualityMap);
    let qualityPixel = clamp(vec2<i32>(outputUv * vec2<f32>(qualityDimensions)), vec2<i32>(0), vec2<i32>(qualityDimensions) - vec2<i32>(1));
    let quality = textureLoad(qualityMap, qualityPixel, 0).r;
    let current = sourceSample(sourceUv, quality);
    let depthDimensions = textureDimensions(sourceDepth);
    let depthPixel = clamp(vec2<i32>(sourceUv * vec2<f32>(depthDimensions)), vec2<i32>(0), vec2<i32>(depthDimensions) - vec2<i32>(1));
    let currentDepth = textureLoad(sourceDepth, depthPixel, 0);
    var velocity = vec2<f32>(0.0);
    if (parameters.flags.y != 0u) { velocity = textureSampleLevel(velocityTexture, linearSampler, sourceUv, 0.0).xy * parameters.resolve.w; }
    let historyUv = outputUv - velocity + jitterDelta;
    let inside = all(historyUv > vec2<f32>(0.001)) && all(historyUv < vec2<f32>(0.999));
    var history = textureSampleLevel(historyColor, linearSampler, clamp(historyUv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
    let historyDepthDimensions = textureDimensions(historyDepth);
    let historyDepthPixel = clamp(vec2<i32>(clamp(historyUv, vec2<f32>(0.0), vec2<f32>(1.0)) * vec2<f32>(historyDepthDimensions)), vec2<i32>(0), vec2<i32>(historyDepthDimensions) - vec2<i32>(1));
    let previousDepth = textureLoad(historyDepth, historyDepthPixel, 0).r;
    let depthDifference = abs(previousDepth - currentDepth) / max(0.0001, max(previousDepth, currentDepth));
    let reactive = select(0.0, textureSampleLevel(reactiveTexture, linearSampler, sourceUv, 0.0).r, parameters.flags.z != 0u);
    let motion = clamp(length(velocity) * max(parameters.dimensions.z, parameters.dimensions.w), 0.0, 1.0);
    let historyAllowed = parameters.flags.x != 0u && inside && depthDifference <= parameters.resolve.z;
    let limits = neighborhood(sourceUv);
    let clampedHistory = yCoCgToRgb(clamp(rgbToYCoCg(history.rgb), limits[0], limits[1]));
    let baseCurrentWeight = 1.0 - parameters.resolve.x;
    let responsive = max(max(reactive, motion), select(1.0, 0.0, historyAllowed));
    let qualityResponse = mix(0.35, 0.0, quality);
    let currentWeight = clamp(max(baseCurrentWeight, responsive + qualityResponse), 0.02, 1.0);
    var resolved = mix(clampedHistory, current, currentWeight);
    let texel = vec2<f32>(1.0 / parameters.dimensions.x, 1.0 / parameters.dimensions.y);
    let blur = (sourceSample(sourceUv + vec2<f32>(texel.x, 0.0), quality) + sourceSample(sourceUv - vec2<f32>(texel.x, 0.0), quality) + sourceSample(sourceUv + vec2<f32>(0.0, texel.y), quality) + sourceSample(sourceUv - vec2<f32>(0.0, texel.y), quality)) * 0.25;
    resolved += (resolved - blur) * parameters.resolve.y * quality * (1.0 - reactive);
    resolved = max(resolved, vec3<f32>(0.0));
    let confidence = select(max(0.0, history.a * 0.95), min(1.0, history.a + 0.08), historyAllowed);
    textureStore(outputColor, vec2<i32>(invocation.xy), vec4<f32>(resolved, 1.0));
    textureStore(nextHistoryColor, vec2<i32>(invocation.xy), vec4<f32>(resolved, confidence));
    textureStore(nextHistoryDepth, vec2<i32>(invocation.xy), vec4<f32>(currentDepth, 0.0, 0.0, 0.0));
}`;

class FoveatedQualityRegions {
    constructor(device, options) {
        options = options || {};
        this.device = device && device.device ? device.device : device;
        if (!this.device) throw new Error("FoveatedQualityRegions requires a WebGPU device or renderer");
        this.maxRegions = Math.max(1, Math.min(16, options.maxRegions || 8));
        this.mapScale = Math.max(.125, Math.min(1, options.mapScale || .25));
        this.peripheralQuality = options.peripheralQuality === undefined ? .35 : options.peripheralQuality;
        this.gazeSmoothing = options.gazeSmoothing === undefined ? 14 : options.gazeSmoothing;
        this.gaze = { x: .5, y: .5 };
        this.targetGaze = { x: .5, y: .5 };
        this.regions = [];
        this.width = 0; this.height = 0; this.pipeline = null; this.bindGroup = null; this.texture = null; this.view = null;
        this.uniformBuffer = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.regionBuffer = this.device.createBuffer({ size: this.maxRegions * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.stats = { frames: 0, regions: 0, updates: 0 };
        this.setRegions(options.regions || [ { center: [ .5, .5 ], innerRadius: .12, outerRadius: .4, innerQuality: 1, outerQuality: .35, falloff: 1.5 } ]);
    }
    setGaze(x, y, delta) { this.targetGaze.x = Math.max(0, Math.min(1, x)); this.targetGaze.y = Math.max(0, Math.min(1, y)); var blend = delta === undefined ? 1 : 1 - Math.exp(-this.gazeSmoothing * Math.max(0, delta)); this.gaze.x += (this.targetGaze.x - this.gaze.x) * blend; this.gaze.y += (this.targetGaze.y - this.gaze.y) * blend; return this; }
    setRegions(regions) { this.regions = (regions || []).slice(0, this.maxRegions).map(function(region) { return { center: region.center ? region.center.slice() : [ .5, .5 ], followsGaze: region.followsGaze !== false, innerRadius: region.innerRadius === undefined ? .12 : region.innerRadius, outerRadius: region.outerRadius === undefined ? .4 : region.outerRadius, innerQuality: region.innerQuality === undefined ? 1 : region.innerQuality, outerQuality: region.outerQuality === undefined ? .35 : region.outerQuality, falloff: region.falloff || 1, enabled: region.enabled !== false }; }); return this; }
    resize(width, height) { width = Math.max(1, Math.ceil(width * this.mapScale)); height = Math.max(1, Math.ceil(height * this.mapScale)); if (width === this.width && height === this.height && this.texture) return this; this.width = width; this.height = height; if (this.texture) this.texture.destroy(); this.texture = this.device.createTexture({ size: [ width, height, 1 ], format: "r32float", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING }); this.view = this.texture.createView(); this.bindGroup = null; return this; }
    ensurePipeline() { if (!this.pipeline) this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: foveatedQualityWGSL }), entryPoint: "main" } }); if (!this.bindGroup) this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 1, resource: { buffer: this.regionBuffer } }, { binding: 2, resource: this.view } ] }); }
    encode(encoder, outputWidth, outputHeight) {
        this.resize(outputWidth, outputHeight); this.ensurePipeline();
        var regionData = new Float32Array(this.maxRegions * 8);
        for (var index = 0; index < this.regions.length; index++) { var region = this.regions[index], base = index * 8, center = region.followsGaze ? this.gaze : { x: region.center[0], y: region.center[1] }; regionData[base] = center.x; regionData[base + 1] = center.y; regionData[base + 2] = region.innerRadius; regionData[base + 3] = region.outerRadius; regionData[base + 4] = region.outerQuality; regionData[base + 5] = region.innerQuality; regionData[base + 6] = region.falloff; regionData[base + 7] = region.enabled ? 1 : 0; }
        var uniform = new ArrayBuffer(32), uints = new Uint32Array(uniform), floats = new Float32Array(uniform); uints[0] = this.width; uints[1] = this.height; uints[2] = this.regions.length; uints[3] = 0; floats[4] = this.peripheralQuality; floats[5] = outputWidth / Math.max(1, outputHeight); floats[6] = 0; floats[7] = 0;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniform); this.device.queue.writeBuffer(this.regionBuffer, 0, regionData);
        var pass = encoder.beginComputePass({ label: "foveated quality regions" }); pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup); pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8)); pass.end(); this.stats.frames++; this.stats.regions = this.regions.length; this.stats.updates++; return this;
    }
    report() { return { width: this.width, height: this.height, mapScale: this.mapScale, gaze: { x: this.gaze.x, y: this.gaze.y }, stats: Object.assign({}, this.stats) }; }
    dispose() { if (this.texture) this.texture.destroy(); if (this.uniformBuffer) this.uniformBuffer.destroy(); if (this.regionBuffer) this.regionBuffer.destroy(); this.texture = this.view = this.pipeline = this.bindGroup = null; return this; }
}

class TemporalSuperResolution {
    constructor(device, options) {
        options = options || {}; this.device = device && device.device ? device.device : device; if (!this.device) throw new Error("TemporalSuperResolution requires a WebGPU device or renderer");
        this.outputWidth = 0; this.outputHeight = 0; this.inputWidth = 0; this.inputHeight = 0; this.pipeline = null; this.bindGroup = null; this.historyValid = false; this.historyIndex = 0; this.frame = 0; this.sampleIndex = 0;
        this.historyWeight = options.historyWeight === undefined ? .92 : options.historyWeight; this.sharpness = options.sharpness === undefined ? .2 : options.sharpness; this.depthThreshold = options.depthThreshold === undefined ? .02 : options.depthThreshold; this.velocityScale = options.velocityScale === undefined ? 1 : options.velocityScale;
        this.currentJitter = { x: 0, y: 0 }; this.previousJitter = { x: 0, y: 0 }; this.savedProjection = null;
        this.uniformBuffer = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.sampler = this.device.createSampler({ magFilter: "linear", minFilter: "linear" });
        this.foveation = options.foveation === false ? null : options.foveation instanceof FoveatedQualityRegions ? options.foveation : new FoveatedQualityRegions(this.device, options.foveation || {});
        this.fallbackVelocity = this.createFallback("rg16float"); this.fallbackReactive = this.createFallback("r8unorm"); this.fallbackQuality = this.createFallback("r32float", true);
        this.stats = { frames: 0, resets: 0, resizes: 0, inputPixels: 0, outputPixels: 0, upscaleRatio: 1, historyValid: false };
    }
    createFallback(format, one) { var texture = this.device.createTexture({ size: [ 1, 1, 1 ], format: format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }); if (format === "r8unorm") this.device.queue.writeTexture({ texture: texture }, new Uint8Array([ one ? 255 : 0 ]), { bytesPerRow: 1 }, [ 1, 1, 1 ]); else if (format === "r32float") this.device.queue.writeTexture({ texture: texture }, new Float32Array([ one ? 1 : 0 ]), { bytesPerRow: 4 }, [ 1, 1, 1 ]); else this.device.queue.writeTexture({ texture: texture }, new Uint16Array([ 0, 0 ]), { bytesPerRow: 4 }, [ 1, 1, 1 ]); return texture; }
    texture(width, height, format, usage) { return this.device.createTexture({ size: [ width, height, 1 ], format: format, usage: usage }); }
    resize(inputWidth, inputHeight, outputWidth, outputHeight) {
        inputWidth = Math.max(1, inputWidth | 0); inputHeight = Math.max(1, inputHeight | 0); outputWidth = Math.max(1, outputWidth | 0); outputHeight = Math.max(1, outputHeight | 0);
        if (this.outputTexture && inputWidth === this.inputWidth && inputHeight === this.inputHeight && outputWidth === this.outputWidth && outputHeight === this.outputHeight) return this;
        var names = [ "outputTexture", "historyColorA", "historyColorB", "historyDepthA", "historyDepthB" ]; for (var index = 0; index < names.length; index++) if (this[names[index]]) this[names[index]].destroy();
        var storageSample = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
        this.outputTexture = this.texture(outputWidth, outputHeight, "rgba16float", storageSample); this.outputView = this.outputTexture.createView();
        this.historyColorA = this.texture(outputWidth, outputHeight, "rgba16float", storageSample); this.historyColorB = this.texture(outputWidth, outputHeight, "rgba16float", storageSample);
        this.historyDepthA = this.texture(outputWidth, outputHeight, "r32float", storageSample); this.historyDepthB = this.texture(outputWidth, outputHeight, "r32float", storageSample);
        this.inputWidth = inputWidth; this.inputHeight = inputHeight; this.outputWidth = outputWidth; this.outputHeight = outputHeight; this.historyIndex = 0; this.historyValid = false; this.bindGroup = null; this.stats.resizes++; return this;
    }
    historyColorRead() { return this.historyIndex ? this.historyColorB : this.historyColorA; }
    historyColorWrite() { return this.historyIndex ? this.historyColorA : this.historyColorB; }
    historyDepthRead() { return this.historyIndex ? this.historyDepthB : this.historyDepthA; }
    historyDepthWrite() { return this.historyIndex ? this.historyDepthA : this.historyDepthB; }
    ensurePipeline() { if (!this.pipeline) this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: temporalSuperResolutionWGSL }), entryPoint: "main" } }); }
    halton(index, base) { var result = 0, fraction = 1 / base; while (index > 0) { result += fraction * (index % base); index = Math.floor(index / base); fraction /= base; } return result; }
    nextJitter() { this.previousJitter = this.currentJitter; var index = this.sampleIndex++ % 16 + 1; this.currentJitter = { x: this.halton(index, 2) - .5, y: this.halton(index, 3) - .5 }; return { x: this.currentJitter.x, y: this.currentJitter.y, ndcX: this.currentJitter.x * 2 / Math.max(1, this.inputWidth), ndcY: this.currentJitter.y * 2 / Math.max(1, this.inputHeight) }; }
    applyJitter(camera) { if (!camera || !camera.projectionMatrix) return this.nextJitter(); var jitter = this.nextJitter(); if (!this.savedProjection) this.savedProjection = camera.projectionMatrix.clone(); else this.savedProjection.copy(camera.projectionMatrix); camera.projectionMatrix.elements[8] += jitter.ndcX; camera.projectionMatrix.elements[9] += jitter.ndcY; return jitter; }
    restoreJitter(camera) { if (camera && this.savedProjection) camera.projectionMatrix.copy(this.savedProjection); return this; }
    reset() { this.historyValid = false; this.sampleIndex = 0; this.stats.resets++; return this; }
    setGaze(x, y, delta) { if (this.foveation) this.foveation.setGaze(x, y, delta); return this; }
    encode(encoder, inputs, options) {
        options = options || {}; if (!inputs || !inputs.colorView || !inputs.depthView) throw new Error("TemporalSuperResolution.encode requires colorView and depthView");
        this.resize(options.inputWidth || inputs.width, options.inputHeight || inputs.height, options.outputWidth || inputs.outputWidth || inputs.width, options.outputHeight || inputs.outputHeight || inputs.height); this.ensurePipeline();
        if (this.foveation) this.foveation.encode(encoder, this.outputWidth, this.outputHeight);
        var qualityView = this.foveation ? this.foveation.view : this.fallbackQuality.createView(), velocityView = inputs.velocityView || this.fallbackVelocity.createView(), reactiveView = inputs.reactiveView || this.fallbackReactive.createView();
        var uniform = new ArrayBuffer(64), floats = new Float32Array(uniform), uints = new Uint32Array(uniform); floats[0] = this.inputWidth; floats[1] = this.inputHeight; floats[2] = this.outputWidth; floats[3] = this.outputHeight; floats[4] = this.currentJitter.x; floats[5] = this.currentJitter.y; floats[6] = this.previousJitter.x; floats[7] = this.previousJitter.y; floats[8] = this.historyWeight; floats[9] = options.sharpness === undefined ? this.sharpness : options.sharpness; floats[10] = options.depthThreshold === undefined ? this.depthThreshold : options.depthThreshold; floats[11] = options.velocityScale === undefined ? this.velocityScale : options.velocityScale; uints[12] = this.historyValid ? 1 : 0; uints[13] = inputs.velocityView ? 1 : 0; uints[14] = inputs.reactiveView ? 1 : 0; uints[15] = this.foveation ? 1 : 0;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniform);
        this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 1, resource: inputs.colorView }, { binding: 2, resource: inputs.depthView }, { binding: 3, resource: velocityView }, { binding: 4, resource: reactiveView }, { binding: 5, resource: this.historyColorRead().createView() }, { binding: 6, resource: this.historyDepthRead().createView() }, { binding: 7, resource: qualityView }, { binding: 8, resource: this.sampler }, { binding: 9, resource: this.outputView }, { binding: 10, resource: this.historyColorWrite().createView() }, { binding: 11, resource: this.historyDepthWrite().createView() } ] });
        var pass = encoder.beginComputePass({ label: "temporal super resolution" }); pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup); pass.dispatchWorkgroups(Math.ceil(this.outputWidth / 8), Math.ceil(this.outputHeight / 8)); pass.end();
        this.historyIndex = 1 - this.historyIndex; this.historyValid = true; this.frame++; this.stats.frames++; this.stats.inputPixels = this.inputWidth * this.inputHeight; this.stats.outputPixels = this.outputWidth * this.outputHeight; this.stats.upscaleRatio = this.outputWidth / this.inputWidth; this.stats.historyValid = true; return this;
    }
    execute(inputs, options) { var encoder = this.device.createCommandEncoder({ label: "temporal super resolution" }); this.encode(encoder, inputs, options); this.device.queue.submit([ encoder.finish() ]); return this; }
    report() { return { inputWidth: this.inputWidth, inputHeight: this.inputHeight, outputWidth: this.outputWidth, outputHeight: this.outputHeight, jitter: Object.assign({}, this.currentJitter), foveation: this.foveation ? this.foveation.report() : null, stats: Object.assign({}, this.stats) }; }
    dispose() { var textures = [ "outputTexture", "historyColorA", "historyColorB", "historyDepthA", "historyDepthB", "fallbackVelocity", "fallbackReactive", "fallbackQuality" ]; for (var index = 0; index < textures.length; index++) if (this[textures[index]]) this[textures[index]].destroy(); if (this.uniformBuffer) this.uniformBuffer.destroy(); if (this.foveation) this.foveation.dispose(); this.pipeline = this.bindGroup = this.outputTexture = this.outputView = null; return this; }
}

export { FoveatedQualityRegions, TemporalSuperResolution, foveatedQualityWGSL, temporalSuperResolutionWGSL };

import assert from "node:assert/strict";
import { HybridDiffuseGI, SpatiotemporalGIDenoiser, hybridDiffuseGIWGSL, giTemporalDenoiseWGSL, giAtrousDenoiseWGSL } from "../src/renderers/AdvancedGlobalIllumination.js";

globalThis.GPUBufferUsage ||= { UNIFORM: 1, COPY_DST: 2 };
globalThis.GPUTextureUsage ||= { TEXTURE_BINDING: 1, COPY_DST: 2, STORAGE_BINDING: 4, COPY_SRC: 8 };
const resources=[];
const resource=options=>({options,destroyed:false,createView(){return{texture:this};},destroy(){this.destroyed=true;}});
const device={queue:{writeTexture(){},writeBuffer(){},submit(){}},createBuffer(options){const r=resource(options);resources.push(r);return r;},createTexture(options){const r=resource(options);resources.push(r);return r;},createSampler:options=>({options})};

const gi=new HybridDiffuseGI(device,{samples:20,maxSteps:100,checkerboard:true});
assert.equal(gi.samples,8);
assert.equal(gi.maxSteps,32);
assert.equal(gi.uniformBuffer.options.size,176);
gi.resize(12,7);
assert.equal(gi.outputTexture.options.format,"rgba16float");
assert.equal(gi.report().width,12);
gi.reset();
assert.equal(gi.report().stats.resets,1);

const denoiser=new SpatiotemporalGIDenoiser(device,{iterations:9});
assert.equal(denoiser.iterations,5);
assert.equal(denoiser.temporalUniform.options.size,48);
assert.equal(denoiser.atrousUniforms.length,5);
denoiser.resize(10,6);
assert.equal(denoiser.momentsA.options.format,"rgba16float","moments need a portable storage format");
assert.equal(denoiser.depthA.options.format,"r32float");
denoiser.historyValid=true;denoiser.stats.historyValid=true;denoiser.reset();
assert.equal(denoiser.report().historyValid,false);
assert.equal(denoiser.report().stats.historyValid,false);

assert.match(hybridDiffuseGIWGSL,/hemisphere/);
assert.match(hybridDiffuseGIWGSL,/rayFallback/);
assert.match(hybridDiffuseGIWGSL,/qualityMap/);
assert.match(giTemporalDenoiseWGSL,/clippedHistory/);
assert.match(giTemporalDenoiseWGSL,/previousMoments/);
assert.match(giTemporalDenoiseWGSL,/dot\(oldNormal, normal\)/);
assert.match(giAtrousDenoiseWGSL,/depthWeight/);
assert.match(giAtrousDenoiseWGSL,/normalWeight/);
assert.match(giAtrousDenoiseWGSL,/luminanceWeight/);

gi.dispose();denoiser.dispose();
assert.ok(resources.some(r=>r.destroyed));
console.log("Advanced global-illumination foundations passed");

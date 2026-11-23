import assert from "node:assert/strict";
import { AdvancedLightingPipeline, advancedLightingCompositeWGSL } from "../src/renderers/AdvancedLightingPipeline.js";

globalThis.GPUBufferUsage ||= { UNIFORM:1, COPY_DST:2, STORAGE:4 };
globalThis.GPUTextureUsage ||= { TEXTURE_BINDING:1, COPY_DST:2, STORAGE_BINDING:4, COPY_SRC:8 };
const resources=[];const resource=options=>({options,destroyed:false,createView(){return{texture:this};},destroy(){this.destroyed=true;}});
const device={queue:{writeTexture(){},writeBuffer(){},submit(){}},createBuffer(o){const r=resource(o);resources.push(r);return r;},createTexture(o){const r=resource(o);resources.push(r);return r;},createSampler:o=>({options:o})};
const pipeline=new AdvancedLightingPipeline(device,{foveation:false,direct:false,gi:false,reflections:false});
assert.equal(pipeline.uniformBuffer.options.size,48);
assert.deepEqual(pipeline.report().features,{direct:false,gi:false,denoise:false,reflections:false,foveation:false,rayQuery:false});
pipeline.resize(20,10);assert.equal(pipeline.outputTexture.options.format,"rgba16float");
pipeline.configure({directEnabled:true,giWeight:.7,exposure:1.2}).setDebugMode("confidence");
assert.equal(pipeline.directEnabled,true);assert.equal(pipeline.giWeight,.7);assert.equal(pipeline.debugMode,4);
pipeline.setDebugMode("unknown");assert.equal(pipeline.debugMode,0);
pipeline.reset();assert.equal(pipeline.report().stats.resets,1);
assert.match(advancedLightingCompositeWGSL,/directLighting/);assert.match(advancedLightingCompositeWGSL,/diffuseGI/);assert.match(advancedLightingCompositeWGSL,/reflections/);assert.match(advancedLightingCompositeWGSL,/uniforms\.dimensions\.z == 4u/);
pipeline.dispose();assert.ok(resources.some(r=>r.destroyed));
console.log("Advanced lighting pipeline foundations passed");

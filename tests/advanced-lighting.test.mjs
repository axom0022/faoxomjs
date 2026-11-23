import assert from "node:assert/strict";

import {
    AdaptiveHybridReflections,
    ReSTIRDirectLighting,
    hybridReflectionsWGSL,
    restirCandidateWGSL,
    restirSpatialWGSL
} from "../src/renderers/AdvancedLighting.js";

globalThis.GPUBufferUsage ||= { UNIFORM: 1, COPY_DST: 2, STORAGE: 4 };
globalThis.GPUTextureUsage ||= { TEXTURE_BINDING: 1, COPY_DST: 2, STORAGE_BINDING: 4, COPY_SRC: 8 };

const resources = [];
const writes = [];
const resource = options => ({
    options,
    destroyed: false,
    createView() { return { texture: this }; },
    destroy() { this.destroyed = true; }
});
const device = {
    queue: {
        writeTexture(...args) { writes.push([ "texture", ...args ]); },
        writeBuffer(...args) { writes.push([ "buffer", ...args ]); },
        submit() {}
    },
    createBuffer(options) { const value = resource(options); resources.push(value); return value; },
    createTexture(options) { const value = resource(options); resources.push(value); return value; },
    createSampler: options => ({ options })
};

const restir = new ReSTIRDirectLighting(device, {
    maxLights: 4,
    candidates: 6,
    spatialSamples: 3,
    maxHistory: 12
});
assert.equal(restir.candidateUniformBuffer.options.size, 112);
assert.equal(restir.spatialUniformBuffer.options.size, 112);
assert.notEqual(restir.candidateUniformBuffer, restir.spatialUniformBuffer, "passes need immutable per-pass uniforms");
restir.resize(8, 4);
assert.equal(restir.candidateBuffer.options.size, 8 * 4 * 32);
restir.uploadLights([
    { direction: [ 0, -1, 0 ], color: [ 1, .5, .25 ], intensity: 2 },
    { position: { x: 1, y: 2, z: 3 }, color: { r: .2, g: .4, b: .8 }, intensity: 5 }
]);
assert.equal(restir.lightCount, 2);
assert.equal(restir.report().stats.lights, 2);
restir.historyValid = true;
restir.reset();
assert.equal(restir.historyValid, false);
assert.equal(restir.report().stats.resets, 1);

const reflections = new AdaptiveHybridReflections(device, { maxSteps: 200, historyWeight: .8 });
assert.equal(reflections.maxSteps, 64, "shader loop limit must bound configured work");
assert.equal(reflections.uniformBuffer.options.size, 192);
reflections.resize(16, 9);
assert.equal(reflections.width, 16);
assert.equal(reflections.height, 9);
assert.equal(reflections.depthA.options.format, "r32float");
reflections.historyValid = true;
reflections.stats.historyValid = true;
reflections.reset();
assert.equal(reflections.report().historyValid, false);
assert.equal(reflections.report().stats.historyValid, false);

assert.match(restirCandidateWGSL, /previousReservoirs/);
assert.match(restirCandidateWGSL, /temporalWeight/);
assert.match(restirCandidateWGSL, /max\(1u, u32\(uniforms\.parameters\.w\)\)/);
assert.match(restirSpatialWGSL, /spatialCount/);
assert.match(restirSpatialWGSL, /outputLighting/);
assert.match(restirSpatialWGSL, /rayVisibility/);
assert.match(restirSpatialWGSL, /rqtrace/);
assert.match(hybridReflectionsWGSL, /checkerboardSkip/);
assert.match(hybridReflectionsWGSL, /rayFallback/);
assert.match(hybridReflectionsWGSL, /historyAllowed/);
assert.match(hybridReflectionsWGSL, /nextHistoryDepth/);
assert.ok(writes.some(write => write[0] === "buffer"), "light upload should reach the GPU queue");

const owned = resources.slice();
restir.dispose();
reflections.dispose();
assert.ok(owned.filter(value => typeof value.destroy === "function").some(value => value.destroyed));
console.log("Advanced-lighting foundations passed");

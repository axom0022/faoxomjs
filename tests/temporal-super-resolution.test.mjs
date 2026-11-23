import assert from "node:assert/strict";

import { Matrix4 } from "../src/math/index.js";
import { FoveatedQualityRegions, TemporalSuperResolution, foveatedQualityWGSL, temporalSuperResolutionWGSL } from "../src/renderers/TemporalSuperResolution.js";

globalThis.GPUBufferUsage ||= { UNIFORM: 1, COPY_DST: 2, STORAGE: 4 };
globalThis.GPUTextureUsage ||= { TEXTURE_BINDING: 1, COPY_DST: 2, STORAGE_BINDING: 4, COPY_SRC: 8 };

const texture = options => ({ options, createView() { return { texture: this }; }, destroy() {} });
const device = {
    queue: { writeTexture() {}, writeBuffer() {}, submit() {} },
    createBuffer: options => ({ size: options.size, destroy() {} }),
    createTexture: texture,
    createSampler: options => ({ options })
};

const foveation = new FoveatedQualityRegions(device, {
    mapScale: .25,
    peripheralQuality: .3
});
foveation.resize(1920, 1080);
assert.equal(foveation.width, 480);
assert.equal(foveation.height, 270);
foveation.setGaze(.75, .25, 1 / 60);
assert.ok(foveation.gaze.x > .5 && foveation.gaze.x < .75, "gaze should move smoothly toward its target");
foveation.setRegions([
    { center: [ .5, .5 ], innerRadius: .1, outerRadius: .35, innerQuality: 1, outerQuality: .25 },
    { center: [ .2, .8 ], followsGaze: false, innerRadius: .05, outerRadius: .2, innerQuality: .8, outerQuality: .2 }
]);
assert.equal(foveation.regions.length, 2);

const tsr = new TemporalSuperResolution(device, { foveation: false });
tsr.resize(960, 540, 1920, 1080);
assert.equal(tsr.report().stats.upscaleRatio, 1, "ratio is updated after the first encoded frame");
const first = tsr.nextJitter();
const second = tsr.nextJitter();
assert.equal(first.x, 0);
assert.ok(Math.abs(first.y + 1 / 6) < 1e-12);
assert.equal(second.x, -.25);
assert.ok(Math.abs(second.y - 1 / 6) < 1e-12);
assert.ok(Math.abs(second.ndcX) <= 1 / 960);

const camera = { projectionMatrix: new Matrix4() };
const base = Array.from(camera.projectionMatrix.elements);
tsr.applyJitter(camera);
assert.notDeepEqual(Array.from(camera.projectionMatrix.elements), base);
tsr.restoreJitter(camera);
assert.deepEqual(Array.from(camera.projectionMatrix.elements), base);
tsr.historyValid = true;
tsr.reset();
assert.equal(tsr.historyValid, false);
assert.equal(tsr.stats.resets, 1);

assert.match(foveatedQualityWGSL, /smoothstep/);
assert.match(temporalSuperResolutionWGSL, /rgbToYCoCg/);
assert.match(temporalSuperResolutionWGSL, /historyAllowed/);
assert.match(temporalSuperResolutionWGSL, /reactiveTexture/);

foveation.dispose();
tsr.dispose();
console.log("Temporal super-resolution foundations passed");

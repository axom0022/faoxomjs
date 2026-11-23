import assert from "node:assert/strict";

import { Matrix4, Vector3 } from "../src/math/index.js";
import { VirtualShadowMap, virtualShadowCasterWGSL, virtualShadowFeedbackWGSL, virtualShadowFXOMWGSL } from "../src/renderers/VirtualShadowMap.js";

globalThis.GPUTextureUsage ||= { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2, COPY_DST: 4 };
globalThis.GPUBufferUsage ||= { UNIFORM: 1, COPY_DST: 2, STORAGE: 4, COPY_SRC: 8, MAP_READ: 16 };

const fakeBuffer = size => ({ size, destroy() {} });
const fakeTexture = () => ({ createView: options => ({ options }), destroy() {} });
const device = {
    limits: { maxTextureArrayLayers: 256 },
    queue: { writeTexture() {}, writeBuffer() {} },
    createTexture: fakeTexture,
    createSampler: options => ({ options }),
    createBuffer: options => fakeBuffer(options.size)
};

const shadows = new VirtualShadowMap(device, {
    pageSize: 32,
    pagesPerSide: 4,
    clipLevels: 2,
    physicalPages: 2,
    maxPagesPerFrame: 2
});

assert.equal(shadows.totalVirtualPages, 32);
assert.equal(shadows.report().freePages, 2);

const first = shadows.schedule([
    { id: shadows.pageId(1, 1, 1), level: 1, x: 1, y: 1, weight: 1000, pinned: true },
    { id: shadows.pageId(0, 1, 1), level: 0, x: 1, y: 1, weight: 900 }
], 2);
assert.equal(first.length, 2);
assert.equal(shadows.resident.size, 2);
assert.equal(shadows.report().freePages, 0);

const replacement = shadows.schedule([
    { id: shadows.pageId(0, 2, 2), level: 0, x: 2, y: 2, weight: 1200 }
], 1);
assert.equal(replacement.length, 1);
assert.equal(shadows.stats.evicted, 1, "an unpinned least-recent page should be evicted");
assert.ok(shadows.resident.has(shadows.pageId(1, 1, 1)), "pinned coarse fallback should remain resident");

const camera = {
    position: new Vector3(0, 2, 8),
    projectionMatrix: new Matrix4().makePerspective(-1, 1, 1, -1, .1, 100),
    matrixWorldInverse: new Matrix4()
};
shadows.configure(camera, { direction: new Vector3(-.5, -1, -.3) });
assert.equal(shadows.clipMatrices.length, 2);
assert.ok(shadows.pageProjection(first[0]) instanceof Matrix4);
assert.ok(shadows.invalidate({ min: new Vector3(-2, -2, -2), max: new Vector3(2, 2, 2) }) >= 0);

const sampling = shadows.sampleWGSL("testVirtualShadow");
assert.match(sampling, /textureSampleCompareLevel/);
assert.match(sampling, /entry != 0u/);
assert.match(virtualShadowFeedbackWGSL, /atomicMax/);
assert.match(virtualShadowCasterWGSL, /pageProjection/);
assert.match(virtualShadowFXOMWGSL, /indices\[invocation\]/);

shadows.dispose();
console.log("Virtual shadow-map scheduling passed");

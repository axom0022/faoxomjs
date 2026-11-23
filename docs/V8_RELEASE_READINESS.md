# FaoxomJS v8 release-readiness checklist

Date: 2026-10-07

## Hardening completed

- [x] Owned advanced-lighting pipelines are disposed by `WebGPURenderer`.
- [x] Externally supplied pipelines remain caller-owned and are not disposed by the renderer.
- [x] Repeated disposal is safe and does not destroy owned GPU resources more than once.
- [x] Encoding and frame-graph registration reject use after disposal with descriptive errors.
- [x] Renderer-owned advanced-lighting configuration survives GPU-state invalidation and is reconstructed on the replacement device.
- [x] Device-bound ray-query/BVH objects are not reused across devices.
- [x] `rayQueryFactory(renderer)` reconstructs ray-query resources for the replacement device.
- [x] Recovery without a required factory continues without stale ray-query resources and exposes `advancedLightingRecoveryWarning`.
- [x] A failed recovery factory leaves configuration available for a deterministic retry.
- [x] Recovery, ownership, idempotence, stale-resource, warning, retry, and invalid-quality paths have deterministic tests.
- [x] Recovery APIs/options are represented in `esm/core.d.ts` and documented in `docs/ADVANCED_LIGHTING_LIFECYCLE.md`.
- [x] Lifecycle and benchmark documentation are included in the npm package file set.

## Validation completed

- [x] All 11 focused `tests/*.test.mjs` suites pass.
- [x] Advanced-lighting benchmark report gates pass: deterministic hashes, nonzero HDR output, no recorded console errors, and no recorded uncaptured WebGPU errors.
- [x] The validated benchmark JSON is explicitly unignored as a tracked baseline so its report-validation test works from a fresh checkout; unrelated generated reports remain ignored.
- [x] Targeted strict TypeScript declaration check for recovery options, factory callback, external pipeline, warning, restore, and disposal passes.
- [x] Repository-wide `npm run typecheck` passes after explicitly resolving intentional compatibility-module export collisions and aligning the node-material typecheck fixture with the actual `StandardNodeMaterial`/`BasicNodeMaterial` API.
- [x] Full `npm test` passes, including repository-wide typechecking and the general benchmark.
- [x] Renderer modular exports and rebuilt root-bundle exports pass.
- [x] Source and rebuilt distribution syntax checks pass.
- [x] `git diff --check` passes.
- [x] General `node tools/faoxombench.mjs` run completes successfully. Its GPU timing fields remain explicitly unsupported in Node and are not physical-GPU claims.
- [x] `npm pack --dry-run` succeeds and includes lifecycle/benchmark documentation and declarations.

## Rebuilt distribution hashes

- `FaoxomJs.js`: `5b90ccd7b5beed0b1f664f483bca1814`
- `dist/faoxom.js`: `ac863116eee1fd6f7838a5bb34546daa`
- `dist/faoxom.min.js`: `e34396d16ffdfa20be8c9ff09a80f82a`
- `dist/faoxom.module.js`: `dac9dab1dbd87bf3af7a246baed5d583`
- `dist/faoxom.module.min.js`: `c5006d6780b9ea9cace4c0c802261cba`

## Remaining release decisions and explicit non-actions

There are no known failing automated validation gates in the tested environment.

- [x] Release version authorized as `8.0.0`; `package.json`, `VERSION`, and the runtime namespace now report v8.
- [ ] Optionally repeat the documented benchmark on a named physical GPU before making hardware-specific performance statements. Current results are the fixed Chromium/SwiftShader baseline and do not support universal physical-GPU claims.
- [x] Review the complete local diff and define safe commit boundaries. See `docs/V8_COMMIT_PLAN.md`; explicit pathspecs are required because the workspace also contains substantial unrelated untracked content.
- [x] Create the authorized five focused local commits for runtime foundations, rendering systems, advanced lighting, validation/release metadata, and rebuilt distributions.
- [ ] Push, tag, publish, release, and deploy only after explicit authorization.

Five local commits were created and the version was updated to 8.0.0. No push, tag, package publication, release, Vercel action, or deployment was performed.

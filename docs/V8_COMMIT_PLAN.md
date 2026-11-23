# FaoxomJS v8 local-diff review and commit plan

Date: 2026-10-07

## Review result

The working tree contains the v8 engine work alongside a much broader untracked workspace. Current inventory:

- 18 modified tracked files.
- 466 modified/untracked file records when untracked files are expanded.
- 137 files under `assets/`, `games/`, `uploads/`, and `website/` (about 17 MB total).
- Large pre-existing groups of browser fixtures, generated screenshots, compatibility tests, game demos, website content, and documentation that are not required by the advanced-rendering release candidate.

A blanket `git add .` is unsafe. Use explicit pathspecs and inspect every staged diff.

## Recommended commit boundaries

### 1. Runtime and world foundations

Purpose: land reusable runtime, ECS, residency, world-partition, spatial, and virtual-geometry foundation code before rendering integrations.

Candidate paths:

- `src/extras/ApplicationLifecycle.js`
- `src/extras/ArchetypeECS.js`
- `src/extras/CompressedGeometryPage.js`
- `src/extras/EngineRuntime.js`
- `src/extras/GPUResidencyManager2.js`
- `src/extras/OriginHierarchy.js`
- `src/extras/RuntimeQualityContract.js`
- `src/extras/UnifiedSpatialDatabase.js`
- `src/extras/VirtualGeometrySystem.js`
- `src/extras/WorldPartition.js`
- `src/renderers/BindlessMaterialTable.js`
- `src/renderers/CausalFrameGraph.js`
- `src/renderers/PersistentGPUScene.js`
- `esm/runtime.js`
- `esm/runtime.d.ts`
- `esm/world.js`
- `esm/world.d.ts`
- Relevant portions of `src/extras/index.js`, `src/renderers/index.js`, `src/core/namespace.js`, `esm/performance.js`, `esm/performance.d.ts`, `esm/compute.d.ts`, and `package.json`.

Because several integration files also contain later rendering exports, this boundary requires interactive staging or temporary patch splitting. Do not stage those shared files wholesale without reviewing their hunks.

### 2. Virtual geometry, visibility, shadows, and temporal reconstruction

Purpose: land the v8 rendering substrate independently of advanced lighting.

Candidate paths:

- `src/extras/FXOMVGS.js`
- `src/renderers/VirtualGeometryGPUHierarchy.js`
- `src/renderers/VirtualGeometryVisibilityPipeline.js`
- `src/renderers/VirtualShadowMap.js`
- `src/renderers/TemporalSuperResolution.js`
- `tests/fxomvgs-v8.test.mjs`
- `tests/virtual-shadow-map.test.mjs`
- `tests/temporal-super-resolution.test.mjs`
- Corresponding export/declaration hunks in shared integration files.

### 3. Advanced lighting, frame graph, lifecycle, and device recovery

Purpose: land the independently tested advanced-lighting feature and its hardened renderer lifecycle.

Candidate paths:

- `src/renderers/AdvancedLighting.js`
- `src/renderers/AdvancedGlobalIllumination.js`
- `src/renderers/AdvancedLightingPipeline.js`
- `src/renderers/AdvancedLightingQualityController.js`
- `src/renderers/AdvancedLightingFrameGraph.js`
- `src/renderers/RayQueryLightingBridge.js`
- `src/renderers/WebGPURenderer.js`
- Remaining advanced-lighting hunks in `src/renderers/index.js`, `src/core/namespace.js`, `esm/compute.d.ts`, `esm/core.d.ts`, and `esm/index.d.ts`.
- `tests/advanced-global-illumination.test.mjs`
- `tests/advanced-lighting.test.mjs`
- `tests/advanced-lighting-pipeline.test.mjs`
- `tests/advanced-lighting-quality-controller.test.mjs`
- `tests/advanced-lighting-frame-graph.test.mjs`
- `tests/advanced-lighting-hardening.test.mjs`
- `tests/ray-query-lighting-bridge.test.mjs`
- `docs/ADVANCED_LIGHTING_LIFECYCLE.md`

### 4. Reproducible advanced-lighting benchmark and release documentation

Purpose: isolate methodology and validation changes from runtime implementation.

Candidate paths:

- `tests/advanced-lighting-benchmark.html`
- `tests/run_advanced_lighting_benchmark.mjs`
- `tests/advanced-lighting-benchmark.test.mjs`
- `tests/advanced-lighting-benchmark-report.json`
- `.gitignore` exception for the deterministic baseline report
- Advanced-lighting sections of `tests/README.md`
- `docs/ADVANCED_LIGHTING_BENCHMARK.md`
- `docs/V8_RELEASE_READINESS.md`
- `docs/V8_COMMIT_PLAN.md`
- `tools/faoxombench.mjs`
- Benchmark/package-file hunks in `package.json`.

`tests/advanced-lighting-benchmark-report.json` is explicitly unignored and included as the deterministic SwiftShader baseline because `advanced-lighting-benchmark.test.mjs` validates it directly. Other generated `tests/*-report.json` files remain ignored.

### 5. Rebuilt distributions

Purpose: make generated output reviewable and clearly tied to validated source state.

Candidate paths:

- `FaoxomJs.js`
- `dist/faoxom.js`
- `dist/faoxom.min.js`
- `dist/faoxom.module.min.js`

`dist/faoxom.module.js` is unchanged and should not be staged. Record the validated hashes from `docs/V8_RELEASE_READINESS.md` in the commit or release notes.

## Keep out of these commits by default

Unless separately reviewed and intentionally included, exclude:

- `assets/`
- `games/`
- `uploads/`
- `website/`
- `faoxomjs-logo.png`
- `faoxomjs-roadmap.md`
- `faoxomjs-v6-systems.md`
- `frimoxshooter.html`
- Unrelated `docs/api/`, v6, game-roadmap, backend, and asset-pipeline documentation.
- Unrelated browser validation pages, screenshots, Blender files, loader fixtures, compatibility fixtures, and generated `.faox` artifacts under `tests/`.

These files may be valid work, but they are not needed to make the reviewed v8 rendering candidate coherent and should not be swept into a rendering release accidentally.

## Validation sequence after each proposed commit

1. `npm run typecheck`
2. Relevant focused `tests/*.test.mjs` suites
3. `git diff --check HEAD^..HEAD` (or the equivalent staged check before committing)
4. Export identity checks for commits touching integration surfaces
5. `npm test` after the source/integration commits
6. `npm run bench:lighting` only when intentionally refreshing the documented SwiftShader baseline
7. `npm pack --dry-run --json` after package and documentation changes
8. Rebuild distributions only after all source commits are finalized

## Remaining decisions

- Whether a physical-GPU benchmark is required before release.
- Authorization to push, tag, publish, release, or deploy.

The plan was executed as five focused local commits with version 8.0.0. No push, tag, publication, release, or deployment was performed.

# FaoxomJS 8.x competitive engine program

## Objective

Make FaoxomJS a highly flexible general 3D engine for browsers, Node.js, Deno, Bun, Electron, Tauri, React Native, and mobile web views. Improvements are accepted through public reproducible tests, compatibility matrices, visual equivalence gates, and measured workload results.

"No production risk" and universal speed superiority are not technically provable. The engineering replacement is a release process with explicit risk budgets, long-running tests, compatibility gates, recovery tests, security review, and published limitations.

## Milestone 1: benchmark and core speed

The first milestone establishes equivalent Three.js, Babylon.js, and FaoxomJS workloads before optimization.

Initial protocol:

- Pinned Three.js 0.186.1 and Babylon.js 9.26.1 development references.
- Fresh browser context for every engine and trial.
- Fixed 256 by 256 rendering resolution.
- Equivalent camera, lighting, PBR material, object count, and transform count.
- WebGL completion synchronized with `finish()`.
- Import, setup, scene transform, frame mean, frame p95, draw calls, pixel coverage, output hash, renderer, and error capture.
- Chromium and SwiftShader for deterministic CI.
- Three fresh trials by default.

This suite is a software-renderer CI protocol. It does not justify universal physical GPU claims. Physical GPU publication requires named adapter, driver, browser, operating system, power mode, resolution, visual-equivalence evidence, repeated trials, and confidence intervals.

Run:

```bash
npm run bench:compare
```

## Required benchmark expansion

1. Lightweight startup and one-mesh rendering.
2. Scene graph updates at 1K, 10K, and 100K nodes.
3. Explicit instancing and automatic batching.
4. Dynamic skinned and morph-target animation.
5. PBR material variety and shader compilation.
6. Shadowed lighting at fixed visual quality.
7. Particle and transparency workloads.
8. Asset decoding for GLB, KTX2, Draco, Meshopt, FBX, OBJ, EXR, and HDR.
9. CPU memory, GPU estimated memory, upload bandwidth, and garbage collection pressure.
10. WebGL 2 and WebGPU on integrated, discrete, mobile, and software adapters.
11. XR frame budgets and multiview where available.
12. Physics throughput, determinism, CCD, stacking stability, constraints, vehicles, cloth, and fluids.

## Later milestones

### WebGL maturity

- Browser and driver compatibility matrix.
- WebGL 2 feature and fallback contracts.
- Context loss and restoration.
- Shader compiler diagnostics.
- State isolation for custom rendering.
- Pixel-level regression corpus.
- Long-duration leak and resource lifetime tests.

### Flexibility and control

- Public low-level command, resource, pipeline, and pass APIs.
- Renderer hooks with documented state contracts.
- Pluggable culling, batching, material, asset, physics, scheduling, and streaming backends.
- Stable extension interfaces without requiring forks.
- Strict modular imports and tree-shakable feature packages.

### Physics and simulation

- Deterministic solver test corpus.
- Broadphase and narrowphase replacement interfaces.
- Continuous collision detection.
- Stable stacking and sleeping.
- Articulations, joints, motors, breakage, vehicles, characters, cloth, soft bodies, fluids, and destruction.
- Worker and shared-memory execution.
- Cross-platform replay hashes.

### Materials and shaders

- Unified graph and code authoring.
- GLSL, WGSL, and portable node compilation.
- PBR, OpenPBR, clearcoat, sheen, transmission, iridescence, anisotropy, subsurface, hair, skin, cloth, terrain, water, atmosphere, volume, and procedural materials.
- Pipeline caching, async compilation, hot reload, reflection, validation, and debugging.

### Asset pipeline

- First-class glTF import and export with extension coverage.
- KTX2, Basis, Draco, Meshopt, animation, skin, morph, and sparse accessor validation.
- Streaming and progressive loading.
- DCC fidelity fixtures.
- Round-trip and malformed-file security testing.

### XR

- VR and AR sessions.
- Controllers, hands, anchors, hit testing, planes, light estimation, depth sensing, layers, multiview, haptics, and accessibility.
- Device matrix and frame pacing tests.

## Release gates

- No claim of superiority without a versioned workload and reproducible report.
- No performance comparison without visual and feature equivalence.
- No release with failing type, unit, rendering, recovery, package, or compatibility gates.
- No silent fallback that changes quality without reporting it.
- Every automatic optimization must be observable, configurable, and disableable.

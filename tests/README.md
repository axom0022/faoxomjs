# Browser and GPU validation

Serve the workspace root so the browser can fetch the framework and local assets:

```bash
python3 -m http.server 4174 --bind 0.0.0.0
```

Open the validation page:

```text
http://localhost:4174/tests/browser-validation.html
```

The page validates WebGL initialization, pixel readback, automatic instancing, Fox GLB animation loading, KTX2 decoding/upload preparation, advanced material fields, WebGPU initialization/submission when the browser exposes WebGPU, and WebXR capability detection.

The separate `feature-validation.html` page checks the geometry factory/cache, quantization/restoration, mesh pooling, static-scene freeze/render snapshot, asset-cache/progress behavior, and worker-backed GLB loading. Run it with:

```bash
node tests/run_feature_validation.mjs http://127.0.0.1:4174 tests/feature-report.json
```

The `performance-benchmark.html` page measures 600-object batched and unbatched render passes, draw-call counts, mean frame time, median frame time, p95 frame time, and draw-call reduction. It records the browser and WebGL environment with the result.

The `run_lifecycle_benchmark.mjs` runner measures startup, renderer setup, geometry/material/mesh creation, first render, warm render, and asset-fetch phases over five fresh browser trials.

The advanced-lighting benchmark runs three deterministic WebGPU scenarios covering balanced ReSTIR/GI/reflections, software-BVH hybrid fallback, and foveated ultra quality. It records encode/submit and queue-completion timing distributions, fixed workload counts, estimated lighting memory, output hashes, adapter details, and WebGPU errors. Run it without a separate server:

```bash
npm run bench:lighting
```

See `docs/ADVANCED_LIGHTING_BENCHMARK.md` for protocol details and interpretation limits. Lifecycle, ownership, disposal, and device-recovery behavior is covered by `advanced-lighting-hardening.test.mjs` and documented in `docs/ADVANCED_LIGHTING_LIFECYCLE.md`.

For automated Chromium execution, install Playwright in a development environment:

```bash
npm install --save-dev playwright
npx playwright install chromium
node tests/run_browser_validation.mjs http://127.0.0.1:4174 tests/browser-report.json
node tests/run_feature_validation.mjs http://127.0.0.1:4174 tests/feature-report.json
node tests/run_game_validation.mjs http://127.0.0.1:4174 tests/game-validation-report.json
node tests/run_performance_benchmark.mjs http://127.0.0.1:4174 tests/performance-report.json 5
node tests/run_lifecycle_benchmark.mjs http://127.0.0.1:4174 tests/lifecycle-report.json 5
```

The runners enable SwiftShader WebGL and unsafe WebGPU flags for CI-style testing. A physical-GPU result must be run separately without SwiftShader and recorded with the browser, adapter, driver, resolution, and power mode.

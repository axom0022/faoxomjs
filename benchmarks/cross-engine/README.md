# Cross-engine benchmark

This benchmark compares pinned FaoxomJS, Three.js, and Babylon.js builds with equivalent deterministic workloads. It is designed to guide optimization, not to manufacture universal winner claims.

## Current workload

- 400 individually authored boxes with shared geometry and material where the engine API permits it.
- Equivalent 50 degree camera, object positions, viewport, and visible pixel coverage.
- 10,000 transform nodes updated in a separate CPU phase.
- Eight warmup frames and 24 measured frames.
- WebGL completion synchronized with `finish()`.
- Three fresh browser contexts per engine.
- Import, setup, transform, frame mean, frame p95, draw count, output hash, coverage, and errors.
- Chromium with SwiftShader for deterministic CI.

FaoxomJS automatic batching remains enabled because automation is part of the engine contract. Three.js and Babylon.js receive the same individually authored scene. A separate explicit-instancing workload will be added so both automatic behavior and manually optimized expert behavior are compared.

## Baseline

The current report records exact values in `report.json`. In this specific software-renderer workload, the three-trial aggregate means were:

| Engine | Frame mean | Transform mean | Setup | Import | Draw calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| FaoxomJS | 1.392 ms | 3.373 ms | 66.7 ms | 109.4 ms | 1 |
| Three.js | 1.590 ms | 1.630 ms | 76.4 ms | 74.7 ms | 400 |
| Babylon.js | 3.939 ms | 6.237 ms | 788.9 ms | 5974.0 ms | 400 |

All engines produced identical covered-pixel counts, deterministic per-engine hashes, nonzero output, and no captured errors. FaoxomJS was faster in aggregate frame mean for this workload after removing unnecessary forced world-matrix propagation, while Three.js had a lower transform mean and frame p95. These differences are workload and environment specific.

Babylon.js is imported through its complete pinned core entry point, while Three.js uses its standard module build and FaoxomJS uses its full root distribution. Import timing therefore measures those selected public entry points, not minimum tree-shaken application bundles.

## Run

```bash
npm run bench:compare
node benchmarks/cross-engine/report.test.mjs
```

Set `TRIALS=1` for a smoke run.

## Interpretation limits

SwiftShader is a deterministic software renderer. It does not predict relative performance on a physical integrated, discrete, mobile, or XR GPU. No result should be generalized beyond the exact versioned protocol. Physical GPU reports must name the hardware, driver, browser, operating system, power mode, resolution, and trial distribution.

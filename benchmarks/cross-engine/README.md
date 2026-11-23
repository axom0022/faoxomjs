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
| FaoxomJS | 1.246 ms | 1.567 ms | 57.3 ms | 102.9 ms | 1 |
| Three.js | 1.669 ms | 1.000 ms | 61.6 ms | 60.3 ms | 400 |
| Babylon.js | 2.719 ms | 6.563 ms | 795.0 ms | 5381.8 ms | 400 |

All engines produced identical covered-pixel counts, deterministic per-engine hashes, nonzero output, and no captured errors. FaoxomJS had the lowest aggregate frame mean in this run after automatic batching and transform-path improvements. Three.js retained the lowest transform mean and had two lower individual frame means, so the overlapping trial variance does not support a universal frame-speed claim. These differences are workload and environment specific.

Babylon.js is imported through its complete pinned core entry point, while Three.js uses its standard module build and FaoxomJS uses its full root distribution. Import timing therefore measures those selected public entry points, not minimum tree-shaken application bundles.

## Run

```bash
npm run bench:compare
node benchmarks/cross-engine/report.test.mjs
```

Set `TRIALS=1` for a smoke run.

## Interpretation limits

SwiftShader is a deterministic software renderer. It does not predict relative performance on a physical integrated, discrete, mobile, or XR GPU. No result should be generalized beyond the exact versioned protocol. Physical GPU reports must name the hardware, driver, browser, operating system, power mode, resolution, and trial distribution.

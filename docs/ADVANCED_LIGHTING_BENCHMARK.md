# Advanced-lighting benchmark

FaoxomJS includes a reproducible WebGPU benchmark for the v8 advanced-lighting pipeline.

## Run

```bash
npm run bench:lighting
```

The runner starts its own local static server, launches Chromium with SwiftShader WebGPU, performs three fresh-browser trials, and writes:

```text
tests/advanced-lighting-benchmark-report.json
```

An existing server and custom protocol can also be used:

```bash
node tests/run_advanced_lighting_benchmark.mjs \
  http://127.0.0.1:4174 \
  tests/advanced-lighting-benchmark-report.json \
  3 8 3
```

The final three numbers are trial count, measured frames per trial, and warm-up frames.

## Fixed scenarios

| Scenario | Resolution | Lights | Quality | BVH fallback |
|---|---:|---:|---|---|
| `balanced-32-lights` | 96×64 | 32 | medium | no |
| `hybrid-bvh-16-lights` | 96×64 | 16 | medium | yes |
| `foveated-ultra-64-lights` | 128×72 | 64 | ultra | no |

Every scenario uses deterministic textures, camera state, lights, material records, velocity, frame count, and seed. Each trial is replayed with a fresh pipeline and fresh resources. The final padded `rgba16float` readback is hashed with FNV-1a. The gate fails if replay hashes or cross-trial hashes differ.

## Recorded metrics

- CPU encode-and-submit time: mean, median, p95, minimum, maximum, and standard deviation.
- Queue-completion wall time using `queue.onSubmittedWorkDone()`.
- Output hash and nonzero output-byte count.
- Estimated owned lighting-resource bytes.
- Pass count and fixed workload counts:
  - ReSTIR candidates
  - spatial reservoir tests
  - GI rays and trace steps
  - reflection trace steps
  - denoiser taps
  - BVH bridge rays
- Browser, adapter, supported timestamp-query feature, and relevant device limits.
- Uncaptured WebGPU errors and browser console errors.

Queue-completion time is explicitly **not** presented as a hardware timestamp. SwiftShader results are useful for regression and reproducibility, not for claims about physical-GPU frame rates. Physical-GPU reports must record the adapter, driver, power mode, browser, and operating system separately.

## Current SwiftShader baseline

Protocol: three fresh-browser trials, three warm-up frames, eight measured frames.

| Scenario | Encode/submit mean range | Queue-completion mean range | Queue p95 range | Estimated lighting bytes | Deterministic hash |
|---|---:|---:|---:|---:|---|
| balanced | 0.412–0.463 ms | 20.200–21.188 ms | 29.3–31.7 ms | 1,425,408 | `40612006` |
| hybrid BVH | 0.363–0.488 ms | 25.875–27.975 ms | 27.1–32.3 ms | 1,523,712 | `c898bdbf` |
| foveated ultra | 0.362–0.375 ms | 43.000–43.287 ms | 47.5–51.8 ms | 2,140,416 | `99b89dc5` |

All three scenarios produced identical hashes across all trials, nonzero HDR output, no console errors, and no uncaptured WebGPU errors.

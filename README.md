# FaoxomJS

[![NPM Version](https://img.shields.io/badge/version-v6-green.svg)](package.json)
[![Zero Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](FaoxomJs.js)
[![jsDelivr](https://data.jsdelivr.com/v1/package/gh/axom0022/faoxomjs/badge)](https://www.jsdelivr.com/package/gh/axom0022/faoxomjs)

> Zero-dependency, high-performance, single-file and modular 3D engine for WebGL2 and WebGPU.

FaoxomJS provides a complete, modern 3D graphics and physics runtime in both a single standalone distribution file (`FaoxomJs.js` / `dist/faoxom.min.js`) and modular tree-shakable ESM packages (`esm/*`).

---

## ⚡ Quick Start & CDN Usage

### 1. jsDelivr CDN - Classic Script Tag (Global `window.FaoxomJs`)
```html
<!-- Load the production-minified UMD standalone bundle -->
<script src="https://cdn.jsdelivr.net/gh/axom0022/faoxomjs@main/dist/faoxom.min.js"></script>

<script>
  const scene = new FaoxomJs.Scene();
  const camera = new FaoxomJs.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);

  const renderer = new FaoxomJs.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const geometry = new FaoxomJs.BoxGeometry(1, 1, 1);
  const material = new FaoxomJs.PhysicalMaterial({ color: 0x0077ff, roughness: 0.2, metalness: 0.8 });
  const mesh = new FaoxomJs.Mesh(geometry, material);
  scene.add(mesh);

  const light = new FaoxomJs.DirectionalLight(0xffffff, 2.0);
  light.position.set(5, 10, 7);
  scene.add(light);

  function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();
</script>
```

### 2. jsDelivr CDN - Modern ES Module
```html
<script type="module">
  import FaoxomJs, { 
    Scene, 
    PerspectiveCamera, 
    WebGLRenderer, 
    Mesh, 
    BoxGeometry, 
    PhysicalMaterial, 
    DirectionalLight 
  } from "https://cdn.jsdelivr.net/gh/axom0022/faoxomjs@main/dist/faoxom.module.min.js";

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new PhysicalMaterial({ color: 0xff3366 }));
  scene.add(mesh);
  scene.add(new DirectionalLight(0xffffff, 2.0));

  renderer.render(scene, camera);
</script>
```

### 3. NPM & Bundlers (Vite / Webpack / Next.js / Rollup)

Installs straight from GitHub until the package lands on the npm registry:
```bash
npm install axom0022/faoxomjs
```

```ts
// Granular modular subpath imports (100% tree-shakable)
import { Vector3, Matrix4 } from "faoxomjs/math";
import { Scene, PerspectiveCamera, WebGLRenderer, Mesh } from "faoxomjs/core";
import { BoxGeometry, SphereGeometry } from "faoxomjs/geometry";
import { PhysicalMaterial, SSSSProfile } from "faoxomjs/materials";
import { PhysicsWorld, RigidBody, ConvexHullCollider } from "faoxomjs/physics";
import { EffectComposer, GTAOPass, ScreenSpaceReflectionsPass } from "faoxomjs/postprocessing";
import { LightClusterGrid, ClusteredLightingManager } from "faoxomjs/lighting";
import { GLTFLoader } from "faoxomjs/loaders";
import { PositionalAudio, AudioListener } from "faoxomjs/audio";
import { WebXRHandTracker } from "faoxomjs/xr";
```

---

## 📦 GitHub Repository File Structure

A clean, production-ready FaoxomJS repository consists of:

```
faoxomjs/
├── dist/                               # Prebuilt CDN & distribution bundles
│   ├── faoxom.js                       # Standalone UMD / globalThis script bundle
│   ├── faoxom.min.js                   # Primary jsDelivr / unpkg CDN target (<script>)
│   ├── faoxom.module.js                # Single-file ES module bundle
│   └── faoxom.module.min.js            # Minified ES module bundle for CDN ESM
├── esm/                                # Modular, tree-shakable ES packages & typings
│   ├── index.js / index.d.ts           # Root ESM package
│   ├── math.js / math.d.ts             # faoxomjs/math
│   ├── core.js / core.d.ts             # faoxomjs/core
│   ├── geometry.js / geometry.d.ts     # faoxomjs/geometry
│   ├── materials.js / materials.d.ts   # faoxomjs/materials
│   ├── lighting.js / lighting.d.ts     # faoxomjs/lighting
│   ├── postprocessing.js / postprocessing.d.ts # faoxomjs/postprocessing
│   ├── physics.js / physics.d.ts       # faoxomjs/physics
│   ├── compute.js / compute.d.ts       # faoxomjs/compute
│   ├── loaders.js / loaders.d.ts       # faoxomjs/loaders
│   ├── audio.js / audio.d.ts           # faoxomjs/audio
│   ├── xr.js / xr.d.ts                 # faoxomjs/xr
│   ├── react.js / react.d.ts           # faoxomjs/react
│   └── controls.js / controls.d.ts     # faoxomjs/controls
├── docs/                               # Architecture and API documentation
├── .gitignore                          # Git ignore rules
├── package.json                        # Package manifest with conditional subpath exports
├── package-lock.json                   # Locked dependency versions
├── tsconfig.json                       # TypeScript compiler options
├── VERSION                             # Version descriptor
├── FaoxomJs.js                         # Unified single-file engine (zero dependencies)
└── FaoxomJs.d.ts                       # Single-file root TypeScript definition
```

---

## 🚀 Key Subsystems & Features

- **Rendering Backends**: Modern WebGL2 pipeline and full WebGPU compute-driven renderer (GPU culling, indirect draw, GPU particles).
- **Clustered / Forward+ Lighting**: 3D view-frustum cluster grid support handling thousands of active real-time point, spot, and area lights.
- **Advanced PBR Material Optics**: Full support for Subsurface Scattering (SSSS Gaussian profiles), Charlie sheen, thin-film iridescence, transmission, dispersion, and anisotropy.
- **Screen-Space Post-Processing Suite**: Integrated `EffectComposer`, GTAO, HBAO, Screen Space Reflections (SSR), Screen Space Global Illumination (SSGI), Bokeh Depth of Field, Progressive Bloom, and Temporal Anti-Aliasing (TAA).
- **Advanced Physics Engine**: Continuous Collision Detection (CCD), TriMesh BVH, GJK & EPA convex/trimesh collision, 6-DOF articulated constraints & ragdolls, Position-Based Dynamics (PBD) cloth & soft bodies, and SPH fluid simulation.
- **Continuous LOD & Virtual Geometry**: Screen-space error metrics, QEM mesh decimation, and out-of-core cluster streaming.
- **Positional & Spatial 3D Audio**: WebAudio HRTF panner models, distance rolloffs, and acoustic environmental occlusion.
- **WebXR Suite**: 25-joint full hand tracking poses, AR plane detection, spherical harmonics light estimation, and controller haptic pulses.

---

## 🧪 Testing & Verification

Typecheck the shipped TypeScript definitions:

```bash
npm run typecheck
```

The full headless-browser validation suites (WebGL2, WebGPU, physics, audio, LOD, game parity, Blender render parity) are executed in the development environment for every release.

---

# [OUR DISCORD SERVER](https://discord.gg/Sps39CydcZ)
# [OUR YOUTUBE CHANNEL](https://youtube.com/@axos0022)

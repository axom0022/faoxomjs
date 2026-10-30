# FaoxomJS

[![NPM Version](https://img.shields.io/badge/version-0.5.0-green.svg)](package.json)
[![Zero Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](FaoxomJs.js)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/faoxomjs/badge)](https://www.jsdelivr.com/package/npm/faoxomjs)

> Zero-dependency, high-performance, 3D engine for WebGL2 and WebGPU.

FaoxomJS provides a complete, modern 3D graphics and physics runtime

---

## Quick Start & CDN Usage

### 1. jsDelivr CDN - Classic Script Tag (Global `window.FaoxomJs`)
```html
<!-- Load the production-minified UMD standalone bundle -->
<script src="https://cdn.jsdelivr.net/npm/faoxomjs/dist/faoxom.min.js"></script>

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
  } from "https://cdn.jsdelivr.net/npm/faoxomjs/dist/faoxom.module.min.js";

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
```bash
npm install faoxomjs
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

## Testing & Verification

Run the full validation suite:

```bash
# Typecheck TypeScript definitions
npm run typecheck

# Run headless browser validation (WebGL2, WebGPU, Physics, Audio, LOD)
npm run test:browser

# Run Cannon Shoots game parity validation
npm run test:game

# Run Blender reference GLB comparison
npm run test:reference

# Run procedural modifier and feature validation
npm run test:feature

# Run all test suites
npm test
```

---



import * as math from "./math.js";
import * as core from "./core.js";
import * as geometry from "./geometry.js";
import * as materials from "./materials.js";
import * as lighting from "./lighting.js";
import * as postprocessing from "./postprocessing.js";
import * as physics from "./physics.js";
import * as compute from "./compute.js";
import * as loaders from "./loaders.js";
import * as audio from "./audio.js";
import * as xr from "./xr.js";
import * as react from "./react.js";
import * as controls from "./controls.js";
import * as performance from "./performance.js";
import * as runtime from "./runtime.js";
import * as world from "./world.js";

export * from "./math.js";
export * from "./core.js";
export * from "./geometry.js";
export * from "./materials.js";
export * from "./lighting.js";
export * from "./postprocessing.js";
export * from "./physics.js";
export * from "./compute.js";
export * from "./loaders.js";
export * from "./audio.js";
export * from "./xr.js";
export * from "./react.js";
export * from "./controls.js";
export * from "./performance.js";
export * from "./runtime.js";
export * from "./world.js";

// Resolve names intentionally exposed by more than one compatibility module.
export { BufferAttribute } from "./core.js";
export { GPUDrivenPipeline } from "./compute.js";
export { MegaGeometry } from "./geometry.js";

declare const FaoxomJs: typeof math &
  typeof core &
  typeof geometry &
  typeof materials &
  typeof lighting &
  typeof postprocessing &
  typeof physics &
  typeof compute &
  typeof loaders &
  typeof audio &
  typeof xr &
  typeof react &
  typeof controls &
  typeof performance &
  typeof runtime &
  typeof world;

export default FaoxomJs;

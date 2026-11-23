# Advanced-lighting lifecycle and device recovery

`WebGPURenderer` owns pipelines it creates from an options object. Calling `setAdvancedLighting(false)`, `disposeAdvancedLighting()`, or `dispose()` releases those resources. Passing an existing `AdvancedLightingPipeline` keeps ownership with the caller; the renderer releases only its frame-graph adapter and never disposes that external pipeline.

Advanced-lighting disposal is idempotent. Encoding or registering work after disposal throws a descriptive error rather than submitting stale GPU resources.

## Device recovery

`invalidateGpuState()` retains a shallow copy of renderer-owned advanced-lighting configuration, disposes resources associated with the old device, and clears the live pipeline. After a replacement device is initialized, `init()` calls `restoreAdvancedLighting()` automatically. Recovery can also be triggered explicitly after assigning a replacement device.

Software-BVH and ray-query objects are device-bound and are never reused on another device. Applications that enable them should provide a factory:

```js
renderer.setAdvancedLighting({
  quality: "high",
  rayQueryFactory(renderer) {
    return createRayQueryForDevice(renderer.device);
  }
});
```

The factory runs during recovery and must return a ray-query object built for the renderer's current device. If the original options contain `rayQuery` or `rayBridge` but no `rayQueryFactory`, recovery continues without that fallback and sets `renderer.advancedLightingRecoveryWarning` to a descriptive message. The application may report that warning or rebuild the feature explicitly.

Externally supplied `AdvancedLightingPipeline` instances are not reconstructed automatically because the renderer has neither ownership nor a reproducible configuration for them.

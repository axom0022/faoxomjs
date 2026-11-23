# Camera controls

FaoxomJS camera controls use direct, non-inverted defaults.

## Orbit and map controls

- Drag right to orbit right.
- Drag down to orbit down.
- Pan right to move the target right.
- Pan down to move the target down.
- Wheel down to zoom out.

Applications that prefer inverted input can opt in:

```js
const controls = app.createOrbitControls(camera, canvas);
controls.invertX = true;
controls.invertY = true;
controls.invertZoom = true;
```

`ArcballControls` and `MapControls` inherit the same direction settings from `OrbitControls`.

## First-person and pointer-lock controls

Mouse right looks right and mouse down looks down by default. Each axis can be inverted independently:

```js
controls.invertX = true;
controls.invertY = true;
```

The defaults are explicit and remain configurable so applications can expose accessibility and player-preference settings.

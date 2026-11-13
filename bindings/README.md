# FaoxomJS Framework Bindings (v6)

Thin, dependency-light bindings for embedding `<faoxom-scene>` declaratively.
All bindings require the engine to be loaded first (UMD script tag or ESM
import) - the custom element is registered globally by
`src/extras/FaoxomSceneElement.js` (also re-exported by the UMD bundle).

```html
<script src="dist/faoxom.js"></script>
```

## React

```jsx
import { FaoxomScene } from "faoxomjs/bindings/react";

export function OfficeScene() {
    return (
        <FaoxomScene
            src="/scenes/office.faox"
            cameraPosition="0,2,6"
            orbit
            ambient="0.6"
            sun="1.2"
            post="bloom,fxaa"
            onReady={() => console.log("engine ready")}
            onLoad={(e) => console.log("loaded", e.detail)}
            onError={(e) => console.error(e.detail)}
        />
    );
}
```

## Vue 3

```js
import { createApp, h } from "vue";
import { FaoxomScene } from "faoxomjs/bindings/vue";

createApp({
    components: { FaoxomScene },
    template: `
        <FaoxomScene src="/scenes/office.faox" orbit
                     camera-position="0,2,6" post="bloom"
                     @load="onLoad" />`
}).mount("#app");
```

## Svelte

Use the ready-made component (`FaoxomScene.svelte`) or the imperative helper
for actions:

```svelte
<script>
    import FaoxomScene from "faoxomjs/bindings/svelte/FaoxomScene.svelte";
</script>

<FaoxomScene src="/scenes/office.faox" orbit on:load={(e) => console.log(e.detail)} />
```

```js
import { mountFaoxomScene } from "faoxomjs/bindings/svelte";

// Svelte action:
const faoxom = (node, options) => {
    const engine = mountFaoxomScene(node, options);
    return { destroy: () => engine.destroy() };
};
```

## Attribute reference

| Attribute         | Default     | Notes                                          |
| ----------------- | ----------- | ---------------------------------------------- |
| `src`             | -           | `.faox` container URL, loaded asynchronously   |
| `backend`         | `webgl`     | `webgl` or `webgpu`                            |
| `width` / `height`| fill parent | CSS pixels                                     |
| `background`      | engine      | `#rrggbb`                                      |
| `camera-fov`      | `60`        | degrees                                        |
| `camera-position` | `0,2,6`     | `"x,y,z"`                                      |
| `camera-target`   | `0,0,0`     | `"x,y,z"`                                      |
| `orbit`           | off         | presence enables `OrbitControls`               |
| `ambient`         | off         | `"intensity"` or `"intensity,#color"`          |
| `sun`             | off         | directional light, shadows on (`noshadow` off) |
| `post`            | off         | comma list: `bloom,fxaa,ssao,vignette`         |

## Events & accessors

`ready`, `load`, `error` DOM events (via `CustomEvent`, detail payloads for
`load`: `{objects, faoxHash}`); on the element: `getApp()`, `getScene()`,
`getCamera()`, `getControls()`, `isLoaded()`.

Bindings are plain ES modules - no build step of their own, no peer
dependencies at runtime except the frameworks themselves.

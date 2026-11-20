<script>
    export let src = "";
    export let background = "";
    export let cameraFov = 60;
    export let cameraPosition = "0,2,6";
    export let cameraTarget = "0,0,0";
    export let orbit = false;
    export let ambient = "";
    export let sun = "";
    export let post = "";
    export let backend = "webgl";
    export let width = 0;
    export let height = 0;

    import { createEventDispatcher, onMount } from "svelte";
    const dispatch = createEventDispatcher();
    let element;

    onMount(() => {
        const emit = (name) => (event) => dispatch(name, event.detail);
        element.addEventListener("ready", emit("ready"));
        element.addEventListener("load", emit("load"));
        element.addEventListener("error", emit("error"));
        return () => {
        };
    });

    $: if (element && src) element.setAttribute("src", src);
    $: if (element && background) element.setAttribute("background", background);
    $: if (element && post) element.setAttribute("post", post);
</script>

<faoxom-scene
    bind:this={element}
    src={src}
    background={background}
    camera-fov={cameraFov}
    camera-position={cameraPosition}
    camera-target={cameraTarget}
    {orbit}
    ambient={ambient}
    sun={sun}
    post={post}
    backend={backend}
    width={width}
    height={height}
></faoxom-scene>

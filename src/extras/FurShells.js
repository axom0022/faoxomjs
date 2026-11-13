import { Group } from "../objects/index.js";
import { Mesh } from "../objects/index.js";
import { ShaderMaterial } from "../materials/index.js";
import { faoxomvalue } from "../math/index.js";

// FurShells - shell-based fur (roadmap item 16).
//
// Builds a stack of extruded copies of a mesh that fade out toward the tips
// with a hash-based strand mask, plus a wind sway that grows quadratically
// with shell height:
//
//   const fur = createFurShells(catMesh, { shells: 8, length: 0.25, color: 0x8a5a2b })
//   scene.add(fur.group)
//   // each frame:
//   fur.update(timeSeconds)
//
// The original mesh keeps rendering as the skin; shells render as opaque
// alpha-cutout geometry so no transparency sorting is needed.
function createFurShells(mesh, options) {
    options = options || {};
    if (!mesh || !mesh.geometry) throw new Error("createFurShells requires a mesh with geometry");
    var shells = Math.max(2, Math.floor(faoxomvalue(options.shells, 8)));
    var length = faoxomvalue(options.length, 0.25);
    var density = faoxomvalue(options.density, 0.75);
    var windStrength = faoxomvalue(options.windStrength, 0.35);
    var windSpeed = faoxomvalue(options.windSpeed, 1.6);
    var color = options.color !== undefined ? options.color : 0x9a7b4f;

    var group = new Group();
    var shellMeshes = [];
    var timeUniform = { value: 0 };

    for (var i = 1; i < shells; i++) {
        var fraction = i / (shells - 1);
        var material = new ShaderMaterial({
            uniforms: {
                uFraction: { value: fraction },
                uLength: { value: length },
                uDensity: { value: density },
                uWind: { value: windStrength },
                uWindSpeed: { value: windSpeed },
                uTime: timeUniform,
                uColor: { value: colorIsArray(color) ? color : hexToRgb(color) }
            },
            vertexShader:
                "uniform float uFraction; uniform float uLength; uniform float uWind; uniform float uWindSpeed; uniform float uTime;" +
                "varying vec2 vUvFur; varying float vHeight;" +
                "void main(){" +
                " vUvFur = uv; vHeight = uFraction;" +
                " vec3 displaced = position + normal * uLength * uFraction;" +
                " float sway = uFraction * uFraction * uWind;" +
                " displaced.x += sin(uTime * uWindSpeed + position.z * 2.1 + position.y * 1.3) * sway;" +
                " displaced.z += cos(uTime * uWindSpeed * 0.83 + position.x * 1.7) * sway * 0.8;" +
                " gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(displaced, 1.0);" +
                "}",
            fragmentShader:
                "precision highp float; uniform vec3 uColor; uniform float uDensity; uniform float uFraction;" +
                "varying vec2 vUvFur; varying float vHeight;" +
                "float furHash(vec2 p){ return fract(sin(dot(floor(p), vec2(127.1, 311.7))) * 43758.5453); }" +
                "void main(){" +
                " float strands = 140.0;" +
                " float h = furHash(vUvFur * strands);" +
                // strands thin out toward the tips
                " float keep = step(uFraction * (1.0 - uDensity * 0.85), h);" +
                " if (keep < 0.5) discard;" +
                // darker at the roots, tip highlight
                " vec3 color = uColor * mix(0.55, 1.15, vHeight);" +
                " gl_FragColor = vec4(color, 1.0);" +
                "}"
        });
        var shell = new Mesh(mesh.geometry, material);
        shell.castShadow = false;
        shell.receiveShadow = false;
        shell.renderOrder = 10 + i;
        group.add(shell);
        shellMeshes.push(shell);
    }

    // follow the source mesh transform
    if (mesh.matrixWorld) {
        mesh.updateMatrixWorld(true);
        group.position.copy(mesh.position);
        group.quaternion.copy(mesh.quaternion);
        group.scale.copy(mesh.scale);
    }

    return {
        group: group,
        shells: shellMeshes,
        timeUniform: timeUniform,
        update: function(time) {
            timeUniform.value = time === undefined ? (timeUniform.value + 0.016) : time;
        },
        dispose: function() {
            for (var i = 0; i < shellMeshes.length; i++) group.remove(shellMeshes[i]);
            shellMeshes.length = 0;
        }
    };
}

function colorIsArray(color) { return Array.isArray(color) && color.length >= 3; }

function hexToRgb(hex) {
    if (typeof hex !== "number") return [0.6, 0.48, 0.31];
    return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export { createFurShells };

import { Group } from "../objects/index.js";

import { Mesh } from "../objects/index.js";

import { ShaderMaterial } from "../materials/index.js";

import { faoxomvalue } from "../math/index.js";

function createFurShells(zahmc, zahmd) {
    zahmd = zahmd || {};
    if (!zahmc || !zahmc.geometry) throw new Error("createFurShells requires a mesh with geometry");
    var zahme = Math.max(2, Math.floor(faoxomvalue(zahmd.shells, 8)));
    var zahmf = faoxomvalue(zahmd.length, .25);
    var zahmg = faoxomvalue(zahmd.density, .75);
    var zahmh = faoxomvalue(zahmd.windStrength, .35);
    var zahmi = faoxomvalue(zahmd.windSpeed, 1.6);
    var zahmj = zahmd.color !== undefined ? zahmd.color : 10124111;
    var zahmk = new Group;
    var zahml = [];
    var zahmm = {
        value: 0
    };
    for (var zahmn = 1; zahmn < zahme; zahmn++) {
        var zahmo = zahmn / (zahme - 1);
        var zahmp = new ShaderMaterial({
            uniforms: {
                uFraction: {
                    value: zahmo
                },
                uLength: {
                    value: zahmf
                },
                uDensity: {
                    value: zahmg
                },
                uWind: {
                    value: zahmh
                },
                uWindSpeed: {
                    value: zahmi
                },
                uTime: zahmm,
                uColor: {
                    value: zahma(zahmj) ? zahmj : zahmb(zahmj)
                }
            },
            vertexShader: "uniform float uFraction; uniform float uLength; uniform float uWind; uniform float uWindSpeed; uniform float uTime;" + "varying vec2 vUvFur; varying float vHeight;" + "void main(){" + " vUvFur = uv; vHeight = uFraction;" + " vec3 displaced = position + normal * uLength * uFraction;" + " float sway = uFraction * uFraction * uWind;" + " displaced.x += sin(uTime * uWindSpeed + position.z * 2.1 + position.y * 1.3) * sway;" + " displaced.z += cos(uTime * uWindSpeed * 0.83 + position.x * 1.7) * sway * 0.8;" + " gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(displaced, 1.0);" + "}",
            fragmentShader: "precision highp float; uniform vec3 uColor; uniform float uDensity; uniform float uFraction;" + "varying vec2 vUvFur; varying float vHeight;" + "float furHash(vec2 p){ return fract(sin(dot(floor(p), vec2(127.1, 311.7))) * 43758.5453); }" + "void main(){" + " float strands = 140.0;" + " float h = furHash(vUvFur * strands);" + " float keep = step(uFraction * (1.0 - uDensity * 0.85), h);" + " if (keep < 0.5) discard;" + " vec3 color = uColor * mix(0.55, 1.15, vHeight);" + " gl_FragColor = vec4(color, 1.0);" + "}"
        });
        var zahmq = new Mesh(zahmc.geometry, zahmp);
        zahmq.castShadow = false;
        zahmq.receiveShadow = false;
        zahmq.renderOrder = 10 + zahmn;
        zahmk.add(zahmq);
        zahml.push(zahmq);
    }
    if (zahmc.matrixWorld) {
        zahmc.updateMatrixWorld(true);
        zahmk.position.copy(zahmc.position);
        zahmk.quaternion.copy(zahmc.quaternion);
        zahmk.scale.copy(zahmc.scale);
    }
    return {
        group: zahmk,
        shells: zahml,
        timeUniform: zahmm,
        update: function(zahma) {
            zahmm.value = zahma === undefined ? zahmm.value + .016 : zahma;
        },
        dispose: function() {
            for (var zahma = 0; zahma < zahml.length; zahma++) zahmk.remove(zahml[zahma]);
            zahml.length = 0;
        }
    };
}

function zahma(zahma) {
    return Array.isArray(zahma) && zahma.length >= 3;
}

function zahmb(zahma) {
    if (typeof zahma !== "number") return [ .6, .48, .31 ];
    return [ (zahma >> 16 & 255) / 255, (zahma >> 8 & 255) / 255, (zahma & 255) / 255 ];
}

export { createFurShells };

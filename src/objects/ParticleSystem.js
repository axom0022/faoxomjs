import { Geometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Vector3, faoxomvalue } from "../math/index.js";

import { Mesh } from "./Mesh.js";

class ParticleSystem extends Mesh {
    constructor(zarxa) {
        zarxa = zarxa || {};
        var zarxb = new Geometry;
        zarxb.setAttribute("position", new Float32Array(0), 3);
        zarxb.setAttribute("uv", new Float32Array(0), 2);
        super(zarxb, zarxa.material || new BasicMaterial({
            color: zarxa.color === undefined ? 16777215 : zarxa.color,
            transparent: true,
            opacity: faoxomvalue(zarxa.opacity, 1),
            side: "double"
        }));
        this.type = "ParticleSystem";
        this.maxParticles = Math.max(1, Math.floor(faoxomvalue(zarxa.maxParticles, 1e3)));
        this.particles = [];
        this.gravity = zarxa.gravity ? zarxa.gravity.clone() : new Vector3(0, -1, 0);
        this.drag = faoxomvalue(zarxa.drag, .02);
        this.autoUpdate = zarxa.autoUpdate !== false;
        this.sortParticles = zarxa.sortParticles !== false;
    }
    spawn(zarxa) {
        zarxa = zarxa || {};
        if (this.particles.length >= this.maxParticles) return null;
        var zarxb = {
            position: zarxa.position ? zarxa.position.clone() : new Vector3,
            velocity: zarxa.velocity ? zarxa.velocity.clone() : new Vector3,
            size: faoxomvalue(zarxa.size, .1),
            life: faoxomvalue(zarxa.life, 1),
            age: 0,
            gravity: zarxa.gravity ? zarxa.gravity.clone() : this.gravity.clone()
        };
        this.particles.push(zarxb);
        this.rebuild();
        return zarxb;
    }
    update(zarxa, zarxb) {
        if (!this.autoUpdate && !zarxb) return this;
        for (var zarxc = this.particles.length - 1; zarxc >= 0; zarxc--) {
            var zarxd = this.particles[zarxc];
            zarxd.age += zarxa;
            if (zarxd.age >= zarxd.life) {
                this.particles.splice(zarxc, 1);
                continue;
            }
            zarxd.velocity.addScaledVector(zarxd.gravity, zarxa);
            zarxd.velocity.multiplyScalar(Math.max(0, 1 - this.drag * zarxa));
            zarxd.position.addScaledVector(zarxd.velocity, zarxa);
        }
        if (this.sortParticles && zarxb) this.particles.sort(function(zarxa, zarxc) {
            return zarxb.position.distanceToSquared(zarxc.position) - zarxb.position.distanceToSquared(zarxa.position);
        });
        this.rebuild();
        return this;
    }
    rebuild() {
        var zarxa = [];
        var zarxb = [];
        var zarxc;
        for (var zarxd = 0; zarxd < this.particles.length; zarxd++) {
            var zarxe = this.particles[zarxd];
            zarxc = zarxe.size * .5;
            zarxa.push(zarxe.position.x - zarxc, zarxe.position.y - zarxc, zarxe.position.z, zarxe.position.x + zarxc, zarxe.position.y - zarxc, zarxe.position.z, zarxe.position.x + zarxc, zarxe.position.y + zarxc, zarxe.position.z, zarxe.position.x - zarxc, zarxe.position.y - zarxc, zarxe.position.z, zarxe.position.x + zarxc, zarxe.position.y + zarxc, zarxe.position.z, zarxe.position.x - zarxc, zarxe.position.y + zarxc, zarxe.position.z);
            zarxb.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
        }
        this.geometry.attributes.position.array = new Float32Array(zarxa);
        this.geometry.attributes.uv.array = new Float32Array(zarxb);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.uv.needsUpdate = true;
        this.geometry.attributes.position.version++;
        this.geometry.attributes.uv.version++;
        this.geometry.computeBounds();
        return this;
    }
}

export { ParticleSystem };

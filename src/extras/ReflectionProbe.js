import { PerspectiveCamera } from "../camera/index.js";

import { Vector3, faoxomvalue } from "../math/index.js";

import { ReflectionProbeEnvironment } from "./ReflectionProbeEnvironment.js";

class ReflectionProbe {
    constructor(zaipa, zaipb) {
        zaipb = zaipb || {};
        this.renderer = zaipa;
        this.position = zaipb.position ? zaipb.position.clone() : new Vector3;
        this.resolution = Math.max(16, Math.floor(faoxomvalue(zaipb.resolution, 128)));
        this.near = faoxomvalue(zaipb.near, .1);
        this.far = faoxomvalue(zaipb.far, 1e3);
        this.environment = null;
        this.texture = null;
        this.depthTexture = null;
    }
    capture(zaipa) {
        var zaipb = this.renderer;
        if (!zaipb || !zaipb.device || !zaipb.initialized) throw new Error("Reflection probes require an initialized WebGPU renderer");
        var zaipc = zaipb.device;
        var zaipd = this.resolution;
        if (this.texture) this.texture.destroy();
        if (this.depthTexture) this.depthTexture.destroy();
        this.texture = zaipc.createTexture({
            size: [ zaipd, zaipd, 6 ],
            dimension: "2d",
            format: "rgba16float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.depthTexture = zaipc.createTexture({
            size: [ zaipd, zaipd, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        var zaipe = [ [ 1, 0, 0, 0, -1, 0 ], [ -1, 0, 0, 0, -1, 0 ], [ 0, 1, 0, 0, 0, 1 ], [ 0, -1, 0, 0, 0, -1 ], [ 0, 0, 1, 0, -1, 0 ], [ 0, 0, -1, 0, -1, 0 ] ];
        for (var zaipf = 0; zaipf < 6; zaipf++) {
            var zaipg = zaipe[zaipf];
            var zaiph = new PerspectiveCamera(90, 1, this.near, this.far);
            zaiph.position.copy(this.position);
            zaiph.up.set(zaipg[3], zaipg[4], zaipg[5]);
            zaiph.lookAt(new Vector3(this.position.x + zaipg[0], this.position.y + zaipg[1], this.position.z + zaipg[2]));
            var zaipi = this.texture.createView({
                dimension: "2d",
                baseMipLevel: 0,
                mipLevelCount: 1,
                baseArrayLayer: zaipf,
                arrayLayerCount: 1
            });
            zaipb.renderToView(zaipa, zaiph, zaipi, this.depthTexture.createView(), "rgba16float");
        }
        this.environment = new ReflectionProbeEnvironment({
            texture: this.texture,
            view: this.texture.createView({
                dimension: "cube"
            }),
            sampler: zaipb.resourceManager.sampler({
                minFilter: "linear"
            })
        }, zaipd);
        return this.environment;
    }
    update(zaipa, zaipb) {
        if (zaipb) this.position.copy(zaipb);
        return this.capture(zaipa);
    }
    dispose() {
        if (this.environment) this.environment.dispose(); else {
            if (this.texture) this.texture.destroy();
            if (this.depthTexture) this.depthTexture.destroy();
        }
        this.environment = null;
        this.texture = null;
        this.depthTexture = null;
    }
}

export { ReflectionProbe };

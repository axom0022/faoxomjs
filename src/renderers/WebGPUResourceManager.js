class WebGPUResourceManager {
    constructor(zauna) {
        this.device = zauna;
        this.buffers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.textures = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.cubeTextures = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.volumeTextures = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.boneBuffers = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.samplers = {};
        this.uniforms = [];
        this.defaultTexture = null;
        this.defaultTextures = {};
        this.defaultCube = null;
        this.defaultBone = null;
    }
    buffer(zauna, zaunb) {
        var zaunc = this.buffers ? this.buffers.get(zauna) : null;
        if (zaunc) return zaunc;
        var zaund = zauna.array || zauna;
        var zaune = Math.max(4, zaund.byteLength + 3 & ~3);
        var zaunf = this.device.createBuffer({
            size: zaune,
            usage: zaunb,
            mappedAtCreation: true
        });
        new Uint8Array(zaunf.getMappedRange()).set(new Uint8Array(zaund.buffer, zaund.byteOffset || 0, zaund.byteLength));
        zaunf.unmap();
        if (this.buffers) this.buffers.set(zauna, zaunf);
        return zaunf;
    }
    uniform(zauna) {
        return this.device.createBuffer({
            size: zauna + 15 & ~15,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    sampler(zauna) {
        zauna = zauna || {};
        var zaunb = (zauna.minFilter || "linear") + "|" + (zauna.magFilter || "linear") + "|" + (zauna.addressModeU || "repeat") + "|" + (zauna.addressModeV || "repeat");
        if (this.samplers[zaunb]) return this.samplers[zaunb];
        this.samplers[zaunb] = this.device.createSampler({
            minFilter: zauna.minFilter === "nearest" ? "nearest" : "linear",
            magFilter: zauna.magFilter === "nearest" ? "nearest" : "linear",
            mipmapFilter: zauna.minFilter && zauna.minFilter.indexOf("mipmap") !== -1 ? "linear" : "nearest",
            addressModeU: zauna.addressModeU === "clamp" ? "clamp-to-edge" : "repeat",
            addressModeV: zauna.addressModeV === "clamp" ? "clamp-to-edge" : "repeat"
        });
        return this.samplers[zaunb];
    }
    writeTextureData(zauna, zaunb, zaunc, zaund, zaune) {
        var zaunf = Math.max(1, zaunc * zaune);
        var zaung = Math.ceil(zaunf / 256) * 256;
        if (zaung === zaunf) {
            this.device.queue.writeTexture({
                texture: zauna
            }, zaunb, {
                bytesPerRow: zaunf,
                rowsPerImage: zaund
            }, [ zaunc, zaund, 1 ]);
            return this;
        }
        var zaunh = new Uint8Array(zaung * zaund);
        var zauni = new Uint8Array(zaunb.buffer || zaunb, zaunb.byteOffset || 0, Math.min(zaunb.byteLength || zaunb.length, zaunf * zaund));
        for (var zaunj = 0; zaunj < zaund; zaunj++) zaunh.set(zauni.subarray(zaunj * zaunf, zaunj * zaunf + zaunf), zaunj * zaung);
        this.device.queue.writeTexture({
            texture: zauna
        }, zaunh, {
            bytesPerRow: zaung,
            rowsPerImage: zaund
        }, [ zaunc, zaund, 1 ]);
        return this;
    }
    texture(zauna, zaunb) {
        if (zauna && this.textures) {
            var zaunc = this.textures.get(zauna);
            if (zaunc && !zauna.needsUpdate) return zaunc;
        }
        var zaund = zauna && (zauna.isDataTexture || zauna.isArrayTexture) && zauna.data ? zauna : null;
        var zaune = zauna && zauna.image && zauna.image.width && zauna.image.height ? zauna.image : null;
        var zaunf = zauna && zauna.compressed && zauna.compressed.target === "2d" ? zauna.compressed : null;
        var zaung = zauna && zauna.hdrData ? zauna : null;
        var zaunh = zaune ? zaune.width : zaunf ? zaunf.width : zaung ? zaung.width : zaund ? zaund.width : 1;
        var zauni = zaune ? zaune.height : zaunf ? zaunf.height : zaung ? zaung.height : zaund ? zaund.height : 1;
        var zaunj = zaung || zaund && zaund.type === "float" ? "rgba32float" : "rgba8unorm";
        var zaunk = this.device.createTexture({
            size: [ Math.max(1, zaunh), Math.max(1, zauni), 1 ],
            format: zaunj,
            mipLevelCount: 1,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        if (zaune && zaune.data && zaune.data.constructor === Uint8Array) this.writeTextureData(zaunk, zaune.data, zaunh, zauni, 4); else if (zaund) this.writeTextureData(zaunk, zaund.data, zaunh, zauni, zaund.type === "float" ? 16 : 4); else if (zaune && this.device.queue.copyExternalImageToTexture) this.device.queue.copyExternalImageToTexture({
            source: zaune
        }, {
            texture: zaunk,
            flipY: zauna && zauna.flipY === true
        }, [ zaunh, zauni ]); else if (zaunf && zaunf.levels.length && zaunf.levels[0].data && !zaunf.levels[0].compressed) this.writeTextureData(zaunk, zaunf.levels[0].data, zaunh, zauni, 4); else if (zaung) this.writeTextureData(zaunk, zaung.hdrData, zaunh, zauni, 16); else {
            var zaunl = zaunb || [ 255, 255, 255, 255 ];
            this.device.queue.writeTexture({
                texture: zaunk
            }, new Uint8Array(zaunl), {
                bytesPerRow: 4,
                rowsPerImage: 1
            }, [ 1, 1, 1 ]);
        }
        var zaunm = {
            texture: zaunk,
            view: zaunk.createView(),
            sampler: this.sampler(zaung ? {
                minFilter: "nearest",
                magFilter: "nearest"
            } : zauna || {})
        };
        if (zauna && this.textures) {
            this.textures.set(zauna, zaunm);
            zauna.needsUpdate = false;
        }
        return zaunm;
    }
    cubeTexture(zauna, zaunb) {
        if (zauna && this.cubeTextures) {
            var zaunc = this.cubeTextures.get(zauna);
            if (zaunc && !zauna.needsUpdate) return zaunc;
        }
        var zaund = zauna && zauna.images ? zauna.images : [];
        var zaune = 1;
        for (var zaunf = 0; zaunf < 6; zaunf++) {
            var zaung = zaund[zaunf];
            if (zaung && zaung.width && zaung.height) {
                zaune = Math.max(1, Math.floor(zaung.width));
                break;
            }
        }
        var zaunh = this.device.createTexture({
            size: [ zaune, zaune, 6 ],
            dimension: "2d",
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            mipLevelCount: 1
        });
        var zauni = zaunb || [ 16, 20, 28, 255 ];
        for (var zaunj = 0; zaunj < 6; zaunj++) {
            var zaunk = zaund[zaunj];
            if (zaunk && zaunk.width && zaunk.height && this.device.queue.copyExternalImageToTexture) this.device.queue.copyExternalImageToTexture({
                source: zaunk
            }, {
                texture: zaunh,
                origin: {
                    x: 0,
                    y: 0,
                    z: zaunj
                }
            }, [ Math.min(zaunk.width, zaune), Math.min(zaunk.height, zaune) ]); else this.device.queue.writeTexture({
                texture: zaunh,
                origin: {
                    x: 0,
                    y: 0,
                    z: zaunj
                }
            }, new Uint8Array(zauni), {
                bytesPerRow: 4,
                rowsPerImage: 1
            }, [ 1, 1, 1 ]);
        }
        var zaunl = {
            texture: zaunh,
            view: zaunh.createView({
                dimension: "cube"
            }),
            sampler: this.sampler({
                minFilter: "linearMipmapLinear"
            })
        };
        if (zauna && this.cubeTextures) {
            this.cubeTextures.set(zauna, zaunl);
            zauna.needsUpdate = false;
        }
        return zaunl;
    }
    volumeTexture(zauna) {
        if (zauna && this.volumeTextures) {
            var zaunb = this.volumeTextures.get(zauna);
            if (zaunb && !zauna.needsUpdate) return zaunb;
        }
        var zaunc = zauna && zauna.compressed ? zauna.compressed : zauna;
        var zaund = zauna && zauna.target === "3d" || zaunc && zaunc.target === "3d";
        var zaune = zaund ? Math.max(1, zaunc.depth || 1) : Math.max(1, zaunc.layers || 1);
        var zaunf = "rgba8unorm";
        var zaung = zaunc && zaunc.levels ? zaunc.levels.length : 1;
        var zaunh = this.device.createTexture({
            size: [ zaunc.width, zaunc.height, zaune ],
            dimension: zaund ? "3d" : "2d",
            format: zaunf,
            mipLevelCount: zaung,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        if (zaunc && zaunc.levels) for (var zauni = 0; zauni < zaunc.levels.length; zauni++) {
            var zaunj = zaunc.levels[zauni];
            var zaunk = zaunj.slices || [];
            for (var zaunl = 0; zaunl < zaunk.length; zaunl++) if (!zaunj.compressed && zaunk[zaunl].data) this.device.queue.writeTexture({
                texture: zaunh,
                mipLevel: zaunj.level,
                origin: {
                    x: 0,
                    y: 0,
                    z: zaunl
                }
            }, zaunk[zaunl].data, {
                bytesPerRow: zaunj.width * 4,
                rowsPerImage: zaunj.height
            }, [ zaunj.width, zaunj.height, 1 ]);
        }
        var zaunm = {
            texture: zaunh,
            view: zaunh.createView({
                dimension: zaund ? "3d" : "2d-array"
            }),
            sampler: this.sampler({
                minFilter: zaung > 1 ? "linearMipmapLinear" : "linear"
            }),
            target: zaund ? "3d" : "array"
        };
        if (zauna && this.volumeTextures) {
            this.volumeTextures.set(zauna, zaunm);
            zauna.needsUpdate = false;
        }
        return zaunm;
    }
    defaultCubeResource() {
        if (this.defaultCube) return this.defaultCube;
        this.defaultCube = this.cubeTexture(null, [ 16, 20, 28, 255 ]);
        return this.defaultCube;
    }
    boneResource(zauna) {
        if (zauna && this.boneBuffers) {
            var zaunb = this.boneBuffers.get(zauna);
            if (zaunb) {
                if (zauna.update) zauna.update();
                this.device.queue.writeBuffer(zaunb.buffer, 0, zauna.boneMatrices);
                return zaunb;
            }
        }
        var zaunc = zauna && zauna.boneMatrices && zauna.boneMatrices.length ? zauna.boneMatrices : new Float32Array([ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]);
        var zaund = this.device.createBuffer({
            size: Math.max(64, zaunc.byteLength + 15 & ~15),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(zaund, 0, zaunc);
        var zaune = {
            buffer: zaund
        };
        if (zauna && this.boneBuffers) this.boneBuffers.set(zauna, zaune);
        return zaune;
    }
    defaultBoneResource() {
        if (this.defaultBone) return this.defaultBone;
        this.defaultBone = this.boneResource(null);
        return this.defaultBone;
    }
    defaultTextureResource(zauna, zaunb) {
        zauna = zauna || "white";
        if (this.defaultTextures[zauna]) return this.defaultTextures[zauna];
        this.defaultTextures[zauna] = this.texture(null, zaunb);
        return this.defaultTextures[zauna];
    }
    dispose() {
        this.buffers = null;
        this.textures = null;
        this.cubeTextures = null;
        this.volumeTextures = null;
        this.boneBuffers = null;
        this.samplers = {};
        this.uniforms = [];
        this.defaultTexture = null;
        this.defaultTextures = {};
        this.defaultCube = null;
        this.defaultBone = null;
    }
}

export { WebGPUResourceManager };

import { faoxomidnext } from "../core/index.js";

import { Matrix3, Vector2, faoxomvalue } from "../math/index.js";

class Texture {
    constructor(zavda, zavdb) {
        zavdb = zavdb || {};
        this.id = faoxomidnext();
        this.isTexture = true;
        this.source = zavda || null;
        this.image = null;
        this.loaded = false;
        this.error = null;
        this.mapping = zavdb.mapping || null;
        this.channel = zavdb.channel === undefined ? 0 : zavdb.channel;
        this.wrapS = faoxomvalue(zavdb.wrapS, "repeat");
        this.wrapT = faoxomvalue(zavdb.wrapT, "repeat");
        this.minFilter = faoxomvalue(zavdb.minFilter, "linearMipmapLinear");
        this.magFilter = faoxomvalue(zavdb.magFilter, "linear");
        this.format = faoxomvalue(zavdb.format, "rgba");
        this.type = faoxomvalue(zavdb.type, "unsignedByte");
        this.colorSpace = faoxomvalue(zavdb.colorSpace, "srgb");
        this.anisotropy = faoxomvalue(zavdb.anisotropy, 1);
        this.flipY = zavdb.flipY !== false;
        this.generateMipmaps = zavdb.generateMipmaps !== false;
        this.mipmapsAutoUpdate = zavdb.mipmapsAutoUpdate !== false;
        this.premultiplyAlpha = !!zavdb.premultiplyAlpha;
        this.unpackAlignment = zavdb.unpackAlignment || 4;
        this.offset = zavdb.offset && zavdb.offset.clone ? zavdb.offset.clone() : new Vector2(0, 0);
        this.repeat = zavdb.repeat && zavdb.repeat.clone ? zavdb.repeat.clone() : new Vector2(1, 1);
        this.center = zavdb.center && zavdb.center.clone ? zavdb.center.clone() : new Vector2(0, 0);
        this.rotation = zavdb.rotation || 0;
        this.matrixAutoUpdate = zavdb.matrixAutoUpdate !== false;
        this.matrix = new Matrix3;
        this.compressed = null;
        this.needsUpdate = true;
        this.promise = null;
        if (zavda && typeof zavda === "string") this.load(zavda); else if (zavda) {
            this.image = zavda;
            this.loaded = true;
        }
    }
    load(zavda) {
        var zavdb = this;
        if (typeof Image === "undefined") {
            this.promise = Promise.resolve(this);
            return this.promise;
        }
        this.promise = new Promise(function(zavdc, zavdd) {
            var zavde = new Image;
            zavde.onload = function() {
                zavdb.image = zavde;
                zavdb.loaded = true;
                zavdb.needsUpdate = true;
                zavdc(zavdb);
            };
            zavde.onerror = function(zavda) {
                zavdb.error = zavda;
                zavdd(zavda);
            };
            zavde.src = zavda;
        });
        return this.promise;
    }
    updateMatrix() {
        var zavda = Math.cos(this.rotation), zavdb = Math.sin(this.rotation), zavdc = this.center.x, zavdd = this.center.y;
        this.matrix.set(this.repeat.x * zavda, this.repeat.x * zavdb, -this.repeat.x * (zavda * zavdc + zavdb * zavdd) + this.offset.x + zavdc, -this.repeat.y * zavdb, this.repeat.y * zavda, -this.repeat.y * (-zavdb * zavdc + zavda * zavdd) + this.offset.y + zavdd, 0, 0, 1);
        return this;
    }
    transformUv(zavda) {
        if (this.matrixAutoUpdate) this.updateMatrix();
        if (this.mapping === "cube" || this.mapping === "equirectangularReflection" || this.mapping === "equirectangularRefraction") return zavda;
        return zavda.applyMatrix3(this.matrix);
    }
    clone() {
        var zavda = new Texture(this.image || this.source, {
            wrapS: this.wrapS,
            wrapT: this.wrapT,
            minFilter: this.minFilter,
            magFilter: this.magFilter,
            format: this.format,
            type: this.type,
            anisotropy: this.anisotropy,
            flipY: this.flipY,
            colorSpace: this.colorSpace,
            generateMipmaps: this.generateMipmaps,
            premultiplyAlpha: this.premultiplyAlpha,
            unpackAlignment: this.unpackAlignment,
            offset: this.offset,
            repeat: this.repeat,
            center: this.center,
            rotation: this.rotation
        });
        return zavda;
    }
    dispose() {
        this.image = null;
        this.source = null;
        this.needsUpdate = false;
    }
}

Texture.prototype.isTexture = true;

export { Texture };

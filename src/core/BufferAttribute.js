import { StaticDrawUsage } from "./StaticDrawUsage.js";

class BufferAttribute {
    constructor(zacda, zacdb, zacdc) {
        this.array = zacda || new Float32Array;
        this.itemSize = zacdb || 1;
        this.normalized = !!zacdc;
        this.needsUpdate = true;
        this.version = 0;
        this.usage = StaticDrawUsage;
    }
    get count() {
        return this.array.length / this.itemSize;
    }
    getX(zacda) {
        return this.array[zacda * this.itemSize];
    }
    getY(zacda) {
        return this.array[zacda * this.itemSize + 1];
    }
    getZ(zacda) {
        return this.array[zacda * this.itemSize + 2];
    }
    getW(zacda) {
        return this.array[zacda * this.itemSize + 3];
    }
    set(zacda, zacdb) {
        this.array.set(zacda, zacdb || 0);
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    copy(zacda) {
        this.array = new zacda.array.constructor(zacda.array);
        this.itemSize = zacda.itemSize;
        this.normalized = zacda.normalized;
        this.usage = zacda.usage;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    onUpload(zacda) {
        this._onUpload = zacda;
        return this;
    }
    setUsage(zacda) {
        this.usage = zacda;
        return this;
    }
    setX(zacda, zacdb) {
        this.array[zacda * this.itemSize] = zacdb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setY(zacda, zacdb) {
        this.array[zacda * this.itemSize + 1] = zacdb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setZ(zacda, zacdb) {
        this.array[zacda * this.itemSize + 2] = zacdb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setW(zacda, zacdb) {
        this.array[zacda * this.itemSize + 3] = zacdb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setXY(zacda, zacdb, zacdc) {
        return this.setX(zacda, zacdb).setY(zacda, zacdc);
    }
    setXYZ(zacda, zacdb, zacdc, zacdd) {
        return this.setX(zacda, zacdb).setY(zacda, zacdc).setZ(zacda, zacdd);
    }
    setXYZW(zacda, zacdb, zacdc, zacdd, zacde) {
        return this.setX(zacda, zacdb).setY(zacda, zacdc).setZ(zacda, zacdd).setW(zacda, zacde);
    }
    clone() {
        return new BufferAttribute(new this.array.constructor(this.array), this.itemSize, this.normalized).setUsage(this.usage);
    }
}

export { BufferAttribute };

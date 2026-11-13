import { StaticDrawUsage } from "./StaticDrawUsage.js";

class BufferAttribute {
    constructor(array, itemSize, normalized) { this.array = array || new Float32Array(); this.itemSize = itemSize || 1; this.normalized = !!normalized; this.needsUpdate = true; this.version = 0; this.usage = StaticDrawUsage; }
    get count() { return this.array.length / this.itemSize; }
    getX(index) { return this.array[index * this.itemSize]; }
    getY(index) { return this.array[index * this.itemSize + 1]; }
    getZ(index) { return this.array[index * this.itemSize + 2]; }
    getW(index) { return this.array[index * this.itemSize + 3]; }
    set(array, offset) { this.array.set(array, offset || 0); this.needsUpdate = true; this.version++; return this; }
    copy(source) { this.array = new source.array.constructor(source.array); this.itemSize = source.itemSize; this.normalized = source.normalized; this.usage = source.usage; this.needsUpdate = true; this.version++; return this; }
    onUpload(callback) { this._onUpload = callback; return this; }
    setUsage(usage) { this.usage = usage; return this; }
    setX(index, value) { this.array[index * this.itemSize] = value; this.needsUpdate = true; this.version++; return this; }
    setY(index, value) { this.array[index * this.itemSize + 1] = value; this.needsUpdate = true; this.version++; return this; }
    setZ(index, value) { this.array[index * this.itemSize + 2] = value; this.needsUpdate = true; this.version++; return this; }
    setW(index, value) { this.array[index * this.itemSize + 3] = value; this.needsUpdate = true; this.version++; return this; }
    setXY(index, x, y) { return this.setX(index, x).setY(index, y); }
    setXYZ(index, x, y, z) { return this.setX(index, x).setY(index, y).setZ(index, z); }
    setXYZW(index, x, y, z, w) { return this.setX(index, x).setY(index, y).setZ(index, z).setW(index, w); }
    clone() { return new BufferAttribute(new this.array.constructor(this.array), this.itemSize, this.normalized).setUsage(this.usage); }
}

export { BufferAttribute };

class ObjectPool {
    constructor(factory, options) { options = options || {}; if (typeof factory !== "function") throw new Error("ObjectPool requires a factory function"); this.factory = factory; this.reset = options.reset || function() {}; this.onAcquire = options.onAcquire || null; this.onRelease = options.onRelease || null; this.maxSize = Math.max(0, Math.floor(options.maxSize === undefined ? Infinity : options.maxSize)); this.available = []; this.active = []; this.totalCreated = 0; }
    acquire() { var created = !this.available.length, object = created ? this.factory.apply(null, arguments) : this.available.pop(); if (created) this.totalCreated++; if (!object) throw new Error("ObjectPool factory returned no object"); var activeIndex = this.active.indexOf(object); if (activeIndex === -1) this.active.push(object); object.userData = object.userData || {}; object.userData.pooled = true; if (this.onAcquire) this.onAcquire(object); return object; }
    release(object) { if (!object) return this; var activeIndex = this.active.indexOf(object); if (activeIndex === -1) return this; this.active.splice(activeIndex, 1); if (object.parent) object.parent.remove(object); this.reset(object); if (this.onRelease) this.onRelease(object); if (this.available.length < this.maxSize) this.available.push(object); else if (object.dispose) object.dispose(); return this; }
    releaseAll() { while (this.active.length) this.release(this.active[this.active.length - 1]); return this; }
    preallocate(count) { count = Math.max(0, Math.floor(count || 0)); while (this.available.length + this.active.length < count) { var object = this.factory(); this.totalCreated++; this.reset(object); this.available.push(object); } return this; }
    drain() { this.releaseAll(); while (this.available.length) { var object = this.available.pop(); if (object.dispose) object.dispose(); } return this; }
    stats() { return { active: this.active.length, available: this.available.length, totalCreated: this.totalCreated || this.active.length + this.available.length, maxSize: this.maxSize }; }
}

export { ObjectPool };

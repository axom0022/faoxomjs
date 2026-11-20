class ObjectPool {
    constructor(zarwa, zarwb) {
        zarwb = zarwb || {};
        if (typeof zarwa !== "function") throw new Error("ObjectPool requires a factory function");
        this.factory = zarwa;
        this.reset = zarwb.reset || function() {};
        this.onAcquire = zarwb.onAcquire || null;
        this.onRelease = zarwb.onRelease || null;
        this.maxSize = Math.max(0, Math.floor(zarwb.maxSize === undefined ? Infinity : zarwb.maxSize));
        this.available = [];
        this.active = [];
        this.totalCreated = 0;
    }
    acquire() {
        var zarwa = !this.available.length, zarwb = zarwa ? this.factory.apply(null, arguments) : this.available.pop();
        if (zarwa) this.totalCreated++;
        if (!zarwb) throw new Error("ObjectPool factory returned no object");
        var zarwc = this.active.indexOf(zarwb);
        if (zarwc === -1) this.active.push(zarwb);
        zarwb.userData = zarwb.userData || {};
        zarwb.userData.pooled = true;
        if (this.onAcquire) this.onAcquire(zarwb);
        return zarwb;
    }
    release(zarwa) {
        if (!zarwa) return this;
        var zarwb = this.active.indexOf(zarwa);
        if (zarwb === -1) return this;
        this.active.splice(zarwb, 1);
        if (zarwa.parent) zarwa.parent.remove(zarwa);
        this.reset(zarwa);
        if (this.onRelease) this.onRelease(zarwa);
        if (this.available.length < this.maxSize) this.available.push(zarwa); else if (zarwa.dispose) zarwa.dispose();
        return this;
    }
    releaseAll() {
        while (this.active.length) this.release(this.active[this.active.length - 1]);
        return this;
    }
    preallocate(zarwa) {
        zarwa = Math.max(0, Math.floor(zarwa || 0));
        while (this.available.length + this.active.length < zarwa) {
            var zarwb = this.factory();
            this.totalCreated++;
            this.reset(zarwb);
            this.available.push(zarwb);
        }
        return this;
    }
    drain() {
        this.releaseAll();
        while (this.available.length) {
            var zarwa = this.available.pop();
            if (zarwa.dispose) zarwa.dispose();
        }
        return this;
    }
    stats() {
        return {
            active: this.active.length,
            available: this.available.length,
            totalCreated: this.totalCreated || this.active.length + this.available.length,
            maxSize: this.maxSize
        };
    }
}

export { ObjectPool };

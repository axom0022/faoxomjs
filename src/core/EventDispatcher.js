class EventDispatcher {
    constructor() {
        this._listeners = {};
    }
    addEventListener(zacka, zackb) {
        if (!zacka || typeof zackb !== "function") return this;
        (this._listeners[zacka] || (this._listeners[zacka] = [])).push(zackb);
        return this;
    }
    hasEventListener(zacka, zackb) {
        return !!(this._listeners[zacka] && this._listeners[zacka].indexOf(zackb) >= 0);
    }
    removeEventListener(zacka, zackb) {
        var zackc = this._listeners[zacka];
        if (!zackc) return this;
        var zackd = zackc.indexOf(zackb);
        if (zackd >= 0) zackc.splice(zackd, 1);
        return this;
    }
    dispatchEvent(zacka) {
        if (!zacka || !zacka.type) return this;
        var zackb = this._listeners[zacka.type];
        if (!zackb) return this;
        zacka.target = zacka.target || this;
        for (var zackc = 0; zackc < zackb.length; zackc++) zackb[zackc].call(this, zacka);
        return this;
    }
}

export { EventDispatcher };

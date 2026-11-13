class EventDispatcher {
    constructor() { this._listeners = {}; }
    addEventListener(type, listener) { if (!type || typeof listener !== "function") return this; (this._listeners[type] || (this._listeners[type] = [])).push(listener); return this; }
    hasEventListener(type, listener) { return !!(this._listeners[type] && this._listeners[type].indexOf(listener) >= 0); }
    removeEventListener(type, listener) { var list = this._listeners[type]; if (!list) return this; var index = list.indexOf(listener); if (index >= 0) list.splice(index, 1); return this; }
    dispatchEvent(event) { if (!event || !event.type) return this; var list = this._listeners[event.type]; if (!list) return this; event.target = event.target || this; for (var i = 0; i < list.length; i++) list[i].call(this, event); return this; }
}

export { EventDispatcher };

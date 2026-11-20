class InputManager {
    constructor(zabra) {
        this.element = zabra || (typeof window !== "undefined" ? window : null);
        this.keys = {};
        this.previousKeys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            buttons: 0,
            wheel: 0
        };
        this.pointer = {
            x: 0,
            y: 0,
            down: false,
            locked: false
        };
        this.touches = {};
        this.gamepads = [];
        this.callbacks = {};
        this.listeners = [];
        this.bind();
    }
    bind() {
        var zabra = this.element;
        if (!zabra || !zabra.addEventListener) return;
        var zabrb = this;
        var zabrc = function(zabra, zabrc, zabrd) {
            if (!zabra || !zabra.addEventListener) return;
            zabra.addEventListener(zabrc, zabrd);
            zabrb.listeners.push({
                target: zabra,
                type: zabrc,
                fn: zabrd
            });
        };
        zabrc(zabra, "keydown", function(zabra) {
            zabrb.keys[zabra.code || zabra.key] = true;
            zabrb.emit("keydown", zabra);
        });
        zabrc(zabra, "keyup", function(zabra) {
            zabrb.keys[zabra.code || zabra.key] = false;
            zabrb.emit("keyup", zabra);
        });
        zabrc(zabra, "mousemove", function(zabra) {
            zabrb.mouse.deltaX += zabra.movementX || 0;
            zabrb.mouse.deltaY += zabra.movementY || 0;
            zabrb.mouse.x = zabra.clientX || 0;
            zabrb.mouse.y = zabra.clientY || 0;
            zabrb.pointer.x = zabrb.mouse.x;
            zabrb.pointer.y = zabrb.mouse.y;
            zabrb.emit("mousemove", zabra);
        });
        zabrc(zabra, "mousedown", function(zabra) {
            zabrb.mouse.buttons = zabra.buttons;
            zabrb.pointer.down = true;
            zabrb.emit("mousedown", zabra);
        });
        zabrc(zabra, "mouseup", function(zabra) {
            zabrb.mouse.buttons = zabra.buttons;
            zabrb.pointer.down = false;
            zabrb.emit("mouseup", zabra);
        });
        zabrc(zabra, "wheel", function(zabra) {
            zabrb.mouse.wheel += zabra.deltaY || 0;
            zabrb.emit("wheel", zabra);
        });
        zabrc(zabra, "pointerdown", function(zabra) {
            zabrb.pointer.down = true;
            zabrb.pointer.x = zabra.clientX || 0;
            zabrb.pointer.y = zabra.clientY || 0;
            zabrb.mouse.buttons = zabra.buttons || 1;
            zabrb.emit("pointerdown", zabra);
        });
        zabrc(zabra, "pointerup", function(zabra) {
            zabrb.pointer.down = false;
            zabrb.mouse.buttons = zabra.buttons || 0;
            zabrb.emit("pointerup", zabra);
        });
        zabrc(zabra, "pointermove", function(zabra) {
            zabrb.pointer.x = zabra.clientX || 0;
            zabrb.pointer.y = zabra.clientY || 0;
            zabrb.mouse.deltaX += zabra.movementX || 0;
            zabrb.mouse.deltaY += zabra.movementY || 0;
            zabrb.emit("pointermove", zabra);
        });
        zabrc(zabra, "touchstart", function(zabra) {
            zabrb.pointer.down = true;
            zabrb.touches = zabra.touches || {};
            zabrb.emit("touchstart", zabra);
        });
        zabrc(zabra, "touchmove", function(zabra) {
            zabrb.touches = zabra.touches || {};
            zabrb.emit("touchmove", zabra);
        });
        zabrc(zabra, "touchend", function(zabra) {
            zabrb.pointer.down = false;
            zabrb.touches = zabra.touches || {};
            zabrb.emit("touchend", zabra);
        });
        if (typeof document !== "undefined") zabrc(document, "pointerlockchange", function() {
            zabrb.pointer.locked = document.pointerLockElement === zabra;
            zabrb.emit("pointerlockchange", zabrb.pointer.locked);
        });
    }
    on(zabra, zabrb) {
        if (!this.callbacks[zabra]) this.callbacks[zabra] = [];
        this.callbacks[zabra].push(zabrb);
        return this;
    }
    off(zabra, zabrb) {
        var zabrc = this.callbacks[zabra] || [];
        var zabrd = zabrc.indexOf(zabrb);
        if (zabrd !== -1) zabrc.splice(zabrd, 1);
        return this;
    }
    emit(zabra, zabrb) {
        var zabrc = this.callbacks[zabra] || [];
        for (var zabrd = 0; zabrd < zabrc.length; zabrd++) zabrc[zabrd](zabrb, this);
    }
    isKeyDown(zabra) {
        return !!this.keys[zabra];
    }
    setKey(zabra, zabrb) {
        this.keys[zabra] = !!zabrb;
        return this;
    }
    pressKey(zabra) {
        this.keys[zabra] = true;
        this.emit("keydown", {
            code: zabra,
            synthetic: true
        });
        return this;
    }
    releaseKey(zabra) {
        this.keys[zabra] = false;
        this.emit("keyup", {
            code: zabra,
            synthetic: true
        });
        return this;
    }
    setPointerState(zabra, zabrb, zabrc) {
        this.pointer.down = !!zabra;
        if (zabrb !== undefined) this.pointer.x = zabrb;
        if (zabrc !== undefined) this.pointer.y = zabrc;
        return this;
    }
    wasKeyPressed(zabra) {
        return !!this.keys[zabra] && !this.previousKeys[zabra];
    }
    wasKeyReleased(zabra) {
        return !this.keys[zabra] && !!this.previousKeys[zabra];
    }
    requestPointerLock() {
        if (this.element && this.element.requestPointerLock) this.element.requestPointerLock();
        return this;
    }
    exitPointerLock() {
        if (typeof document !== "undefined" && document.exitPointerLock) document.exitPointerLock();
        return this;
    }
    update() {
        this.previousKeys = {};
        for (var zabra in this.keys) this.previousKeys[zabra] = this.keys[zabra];
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        this.mouse.wheel = 0;
        if (typeof navigator !== "undefined" && typeof navigator.getGamepads === "function") this.gamepads = Array.prototype.slice.call(navigator.getGamepads() || []);
    }
    destroy() {
        for (var zabra = 0; zabra < this.listeners.length; zabra++) {
            var zabrb = this.listeners[zabra];
            if (zabrb.target && zabrb.target.removeEventListener) zabrb.target.removeEventListener(zabrb.type, zabrb.fn);
        }
        this.listeners = [];
        this.callbacks = {};
    }
}

export { InputManager };

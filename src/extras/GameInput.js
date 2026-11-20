import { faoxomclamp, faoxomvalue } from "../math/index.js";

var zahra = /^(Key[A-Z0-9]+|Digit[0-9]|Numpad[0-9]+|Space|Enter|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|Tab|Backspace|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Backslash|Comma|Period|Slash|IntlBackslash)$/;

var zahrb = /^Mouse([0-9]+)$/;

var zahrc = /^Pad([0-9]+):B([0-9]+)$/;

var zahrd = /^Pad([0-9]+):A([0-9]+)([+-])?$/;

function zahre(zahre) {
    if (!zahre || typeof zahre !== "string") return null;
    if (zahrb.test(zahre)) return {
        kind: "mouse",
        button: parseInt(zahre.match(zahrb)[1], 10)
    };
    if (zahrc.test(zahre)) {
        var zahrf = zahre.match(zahrc);
        return {
            kind: "padButton",
            pad: parseInt(zahrf[1], 10),
            button: parseInt(zahrf[2], 10)
        };
    }
    if (zahrd.test(zahre)) {
        var zahrg = zahre.match(zahrd);
        return {
            kind: "padAxis",
            pad: parseInt(zahrg[1], 10),
            axis: parseInt(zahrg[2], 10),
            sign: zahrg[3] === "-" ? -1 : 1
        };
    }
    if (zahra.test(zahre)) return {
        kind: "key",
        code: zahre
    };
    return null;
}

function zahrf(zahra, zahrb) {
    var zahrc = Math.abs(zahra);
    if (zahrc <= zahrb) return 0;
    return Math.sign(zahra) * ((zahrc - zahrb) / (1 - zahrb));
}

class GameInput {
    constructor(zahra) {
        zahra = zahra || {};
        if (typeof window === "undefined" || typeof document === "undefined") throw new Error("GameInput requires a browser environment");
        this.target = zahra.target || document.body || document.documentElement;
        this.deadzone = faoxomclamp(faoxomvalue(zahra.gamepadDeadzone, .12), 0, .95);
        this.axisThreshold = faoxomclamp(faoxomvalue(zahra.axisThreshold, .5), .05, .95);
        this.bindings = {};
        this.defaultBindings = {};
        this.axes = {};
        this.callbacks = {};
        this.lockCallbacks = [];
        this.padConnectCallbacks = [];
        this.padDisconnectCallbacks = [];
        this.disposed = false;
        this._keys = {};
        this._mouseButtons = {};
        this._pointer = {
            x: 0,
            y: 0
        };
        this._mouseDelta = {
            x: 0,
            y: 0
        };
        this._wheelDelta = 0;
        this._wheelEdges = {
            up: false,
            down: false
        };
        this._prevActionState = {};
        this._padStates = {};
        this._prevPads = [];
        this._rebind = null;
        this.stats = {
            updates: 0,
            actionsFired: 0,
            padsConnected: 0,
            rebinds: 0
        };
        var zahrb = zahra.bindings || {};
        for (var zahrc in zahrb) {
            var zahrd = Array.isArray(zahrb[zahrc]) ? zahrb[zahrc] : [ zahrb[zahrc] ];
            for (var zahre = 0; zahre < zahrd.length; zahre++) this.setBinding(zahrc, zahrd[zahre], true);
        }
        var zahrf = this;
        this._handlers = {
            keydown: function(zahra) {
                zahrf._onKeyDown(zahra);
            },
            keyup: function(zahra) {
                zahrf._onKeyUp(zahra);
            },
            mousedown: function(zahra) {
                zahrf._mouseButtons[zahra.button] = {
                    down: true,
                    edge: true
                };
            },
            mouseup: function(zahra) {
                zahrf._mouseButtons[zahra.button] = {
                    down: false,
                    edge: true
                };
            },
            mousemove: function(zahra) {
                zahrf._pointer.x = zahra.clientX;
                zahrf._pointer.y = zahra.clientY;
                if (document.pointerLockElement === zahrf.target) {
                    zahrf._mouseDelta.x += zahra.movementX || 0;
                    zahrf._mouseDelta.y += zahra.movementY || 0;
                }
            },
            wheel: function(zahra) {
                zahrf._wheelDelta += zahra.deltaY;
                if (zahra.deltaY < 0) zahrf._wheelEdges.up = true; else if (zahra.deltaY > 0) zahrf._wheelEdges.down = true;
            },
            pointerlockchange: function() {
                zahrf._fireLockChange(document.pointerLockElement === zahrf.target);
            },
            gamepadconnected: function(zahra) {
                zahrf._onPadConnected(zahra && zahra.gamepad);
            },
            gamepaddisconnected: function(zahra) {
                zahrf._onPadDisconnected(zahra && zahra.gamepad);
            },
            contextmenu: function(zahra) {
                zahra.preventDefault();
            }
        };
        window.addEventListener("keydown", this._handlers.keydown);
        window.addEventListener("keyup", this._handlers.keyup);
        this.target.addEventListener("mousedown", this._handlers.mousedown);
        window.addEventListener("mouseup", this._handlers.mouseup);
        window.addEventListener("mousemove", this._handlers.mousemove);
        window.addEventListener("wheel", this._handlers.wheel, {
            passive: true
        });
        document.addEventListener("pointerlockchange", this._handlers.pointerlockchange);
        window.addEventListener("gamepadconnected", this._handlers.gamepadconnected);
        window.addEventListener("gamepaddisconnected", this._handlers.gamepaddisconnected);
        this.target.addEventListener("contextmenu", this._handlers.contextmenu);
    }
    _onKeyDown(zahra) {
        var zahrb = zahra.code;
        if (this._rebind) {
            if (zahrb === (this._rebind.cancelKey || "Escape")) this.cancelRebind(); else this._finishRebind({
                kind: "key",
                code: zahrb,
                label: zahrb
            });
            if (zahra.preventDefault) zahra.preventDefault();
            return;
        }
        if (!this._keys[zahrb]) this._keys[zahrb] = {
            down: true,
            edge: true
        }; else {
            this._keys[zahrb].down = true;
        }
        if (zahra.preventDefault && this._bindingsForSource("key:" + zahrb).length) zahra.preventDefault();
    }
    _onKeyUp(zahra) {
        var zahrb = zahra.code;
        if (this._keys[zahrb]) {
            this._keys[zahrb].down = false;
            this._keys[zahrb].edge = true;
        }
    }
    _bindingsForSource(zahra) {
        var zahrb = [];
        for (var zahrc in this.bindings) {
            var zahrd = this.bindings[zahrc];
            for (var zahre = 0; zahre < zahrd.length; zahre++) if (zahrd[zahre]._sourceKey === zahra) zahrb.push(zahrc);
        }
        return zahrb;
    }
    setBinding(zahra, zahrb, zahrc) {
        if (this.disposed) throw new Error("GameInput is disposed");
        if (!zahra || typeof zahra !== "string") throw new Error("setBinding requires an action name");
        var zahrd = zahre(zahrb);
        if (!zahrd) throw new Error("invalid input source '" + zahrb + "'");
        if (!this.bindings[zahra]) this.bindings[zahra] = [];
        var zahrf = false;
        for (var zahrg = 0; zahrg < this.bindings[zahra].length; zahrg++) if (this.bindings[zahra][zahrg].source === zahrb) zahrf = true;
        if (zahrf) return this;
        this.bindings[zahra].push({
            source: zahrb,
            parsed: zahrd,
            _sourceKey: this._sourceKey(zahrd)
        });
        if (zahrc) {
            if (!this.defaultBindings[zahra]) this.defaultBindings[zahra] = [];
            this.defaultBindings[zahra].push(zahrb);
        }
        return this;
    }
    _sourceKey(zahra) {
        if (zahra.kind === "key") return "key:" + zahra.code;
        if (zahra.kind === "mouse") return "mouse:" + zahra.button;
        if (zahra.kind === "padButton") return "padButton:" + zahra.pad + ":" + zahra.button;
        return "padAxis:" + zahra.pad + ":" + zahra.axis + ":" + (zahra.sign > 0 ? "+" : "-");
    }
    getBindings(zahra) {
        var zahrb = this.bindings[zahra] || [];
        var zahrc = [];
        for (var zahrd = 0; zahrd < zahrb.length; zahrd++) zahrc.push(zahrb[zahrd].source);
        return zahrc;
    }
    clearBindings(zahra) {
        if (this.bindings[zahra]) this.bindings[zahra].length = 0;
        return this;
    }
    resetBindings() {
        this.bindings = {};
        for (var zahra in this.defaultBindings) {
            var zahrb = this.defaultBindings[zahra];
            for (var zahrc = 0; zahrc < zahrb.length; zahrc++) this.setBinding(zahra, zahrb[zahrc], true);
        }
        return this;
    }
    bindAxis(zahra, zahrb) {
        zahrb = zahrb || {};
        this.axes[zahra] = {
            up: zahrb.up || null,
            down: zahrb.down || null,
            left: zahrb.left || null,
            right: zahrb.right || null,
            pad: zahrb.pad === undefined ? null : zahrb.pad,
            padXAxis: zahrb.padXAxis === undefined ? 0 : zahrb.padXAxis,
            padYAxis: zahrb.padYAxis === undefined ? 1 : zahrb.padYAxis,
            invertY: zahrb.invertY === true
        };
        return this;
    }
    startRebind(zahra, zahrb) {
        if (this.disposed) throw new Error("GameInput is disposed");
        zahrb = zahrb || {};
        if (!zahra || !this.bindings[zahra]) throw new Error("rebind requires an existing action");
        if (this._rebind) return this;
        this._rebind = {
            action: zahra,
            mode: zahrb.add === true ? "add" : "replace",
            cancelKey: zahrb.cancelKey || "Escape",
            timeout: faoxomvalue(zahrb.timeout, 0),
            onDone: zahrb.onDone || null,
            onCancel: zahrb.onCancel || null,
            startedAt: Date.now()
        };
        return this;
    }
    cancelRebind() {
        if (!this._rebind) return this;
        var zahra = this._rebind;
        this._rebind = null;
        if (zahra.onCancel) zahra.onCancel(zahra.action);
        return this;
    }
    get isRebinding() {
        return !!this._rebind;
    }
    _finishRebind(zahra) {
        var zahrb = this._rebind;
        if (!zahrb) return;
        this._rebind = null;
        var zahrc = zahra.kind === "key" ? zahra.code : zahra.kind === "mouse" ? "Mouse" + zahra.button : zahra.kind === "padButton" ? "Pad" + zahra.pad + ":B" + zahra.button : "Pad" + zahra.pad + ":A" + zahra.axis + (zahra.sign < 0 ? "-" : "+");
        if (zahrb.mode === "replace") this.clearBindings(zahrb.action);
        this.setBinding(zahrb.action, zahrc);
        this.stats.rebinds++;
        if (zahrb.onDone) zahrb.onDone(zahrb.action, zahrc);
    }
    onAction(zahra, zahrb) {
        if (!this.callbacks[zahra]) this.callbacks[zahra] = [];
        this.callbacks[zahra].push(zahrb);
        return this;
    }
    offAction(zahra, zahrb) {
        var zahrc = this.callbacks[zahra];
        if (!zahrc) return this;
        var zahrd = zahrb === undefined ? -1 : zahrc.indexOf(zahrb);
        if (zahrd === -1) zahrc.length = 0; else zahrc.splice(zahrd, 1);
        return this;
    }
    onLockChange(zahra) {
        this.lockCallbacks.push(zahra);
        return this;
    }
    _fireLockChange(zahra) {
        for (var zahrb = 0; zahrb < this.lockCallbacks.length; zahrb++) this.lockCallbacks[zahrb](zahra);
    }
    onGamepadConnected(zahra) {
        this.padConnectCallbacks.push(zahra);
        return this;
    }
    onGamepadDisconnected(zahra) {
        this.padDisconnectCallbacks.push(zahra);
        return this;
    }
    _onPadConnected(zahra) {
        if (!zahra || this._prevPads.indexOf(zahra.index) >= 0) return;
        this._prevPads.push(zahra.index);
        this.stats.padsConnected++;
        for (var zahrb = 0; zahrb < this.padConnectCallbacks.length; zahrb++) this.padConnectCallbacks[zahrb](zahra);
    }
    _onPadDisconnected(zahra) {
        if (!zahra) return;
        var zahrb = this._prevPads.indexOf(zahra.index);
        if (zahrb < 0) return;
        this._prevPads.splice(zahrb, 1);
        delete this._padStates[zahra.index];
        for (var zahrc = 0; zahrc < this.padDisconnectCallbacks.length; zahrc++) this.padDisconnectCallbacks[zahrc](zahra);
    }
    lock() {
        if (this.disposed) throw new Error("GameInput is disposed");
        if (this.target && this.target.requestPointerLock) {
            var zahra = this.target.requestPointerLock();
            if (zahra && zahra.catch) zahra.catch(function() {});
            return true;
        }
        return false;
    }
    unlock() {
        if (this.disposed) throw new Error("GameInput is disposed");
        if (document.exitPointerLock) {
            document.exitPointerLock();
            return true;
        }
        return false;
    }
    get isLocked() {
        return typeof document !== "undefined" && document.pointerLockElement === this.target;
    }
    _padList() {
        if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
        var zahra = navigator.getGamepads() || [];
        var zahrb = [];
        for (var zahrc = 0; zahrc < zahra.length; zahrc++) if (zahra && zahra[zahrc]) zahrb.push(zahra[zahrc]);
        return zahrb;
    }
    gamepads() {
        var zahra = this._padList();
        var zahrb = [];
        for (var zahrc = 0; zahrc < zahra.length; zahrc++) {
            var zahrd = zahra[zahrc], zahre = this._padStates[zahrd.index];
            zahrb.push({
                index: zahrd.index,
                id: zahrd.id,
                mapping: zahrd.mapping,
                buttons: zahre ? zahre.buttons.map(function(zahra) {
                    return {
                        pressed: zahra.pressed,
                        justPressed: zahra.justPressed,
                        justReleased: zahra.justReleased,
                        value: zahra.value
                    };
                }) : [],
                rawAxes: zahrd.axes ? Array.prototype.slice.call(zahrd.axes) : [],
                axes: zahre ? zahre.axes.slice() : []
            });
        }
        return zahrb;
    }
    setDeadzone(zahra, zahrb, zahrc) {
        var zahrd = faoxomclamp(zahra, 0, .95);
        if (zahrb === undefined) {
            this.deadzone = zahrd;
            return this;
        }
        var zahre = this._padStates[zahrb];
        if (!zahre) return this;
        if (zahrc === undefined) for (var zahrf = 0; zahrf < zahre.axesDeadzone.length; zahrf++) zahre.axesDeadzone[zahrf] = zahrd; else if (zahre.axesDeadzone[zahrc] !== undefined) zahre.axesDeadzone[zahrc] = zahrd;
        return this;
    }
    _pollGamepads() {
        var zahra = this._padList();
        var zahrb = {};
        for (var zahrc = 0; zahrc < zahra.length; zahrc++) {
            var zahrd = zahra[zahrc];
            zahrb[zahrd.index] = true;
            if (this._prevPads.indexOf(zahrd.index) < 0) {
                this._prevPads.push(zahrd.index);
                this.stats.padsConnected++;
                for (var zahre = 0; zahre < this.padConnectCallbacks.length; zahre++) this.padConnectCallbacks[zahre](zahrd);
            }
            var zahrg = this._padStates[zahrd.index];
            if (!zahrg) {
                zahrg = this._padStates[zahrd.index] = {
                    buttons: [],
                    axes: [],
                    axesDeadzone: []
                };
                for (var zahrh = 0; zahrh < (zahrd.buttons ? zahrd.buttons.length : 0); zahrh++) zahrg.buttons.push({
                    pressed: false,
                    justPressed: false,
                    justReleased: false,
                    value: 0
                });
                for (var zahri = 0; zahri < (zahrd.axes ? zahrd.axes.length : 0); zahri++) {
                    zahrg.axes.push(0);
                    zahrg.axesDeadzone.push(this.deadzone);
                }
            }
            while (zahrg.buttons.length < (zahrd.buttons ? zahrd.buttons.length : 0)) zahrg.buttons.push({
                pressed: false,
                justPressed: false,
                justReleased: false,
                value: 0
            });
            while (zahrg.axes.length < (zahrd.axes ? zahrd.axes.length : 0)) {
                zahrg.axes.push(0);
                zahrg.axesDeadzone.push(this.deadzone);
            }
            for (var zahrj = 0; zahrj < (zahrd.buttons ? zahrd.buttons.length : 0); zahrj++) {
                var zahrk = zahrd.buttons[zahrj];
                var zahrl = zahrg.buttons[zahrj];
                var zahrm = !!(zahrk && (zahrk.pressed || (zahrk.value || 0) > this.axisThreshold));
                zahrl.justPressed = zahrm && !zahrl.pressed;
                zahrl.justReleased = !zahrm && zahrl.pressed;
                zahrl.pressed = zahrm;
                zahrl.value = zahrk ? +zahrk.value || 0 : 0;
                if (this._rebind && zahrl.justPressed && this._rebind.padIndex === undefined) {
                    this._rebind.padIndex = zahrd.index;
                    this._finishRebind({
                        kind: "padButton",
                        pad: zahrd.index,
                        button: zahrj,
                        sign: 1
                    });
                }
            }
            for (var zahrn = 0; zahrn < (zahrd.axes ? zahrd.axes.length : 0); zahrn++) {
                zahrg.axes[zahrn] = zahrf(+zahrd.axes[zahrn] || 0, zahrg.axesDeadzone[zahrn] || this.deadzone);
            }
        }
        var zahro = this._prevPads.slice();
        for (var zahrp = 0; zahrp < zahro.length; zahrp++) {
            if (!zahrb[zahro[zahrp]]) {
                var zahrq = this._prevPads.indexOf(zahro[zahrp]);
                this._prevPads.splice(zahrq, 1);
                delete this._padStates[zahro[zahrp]];
                for (var zahrr = 0; zahrr < this.padDisconnectCallbacks.length; zahrr++) this.padDisconnectCallbacks[zahrr]({
                    index: zahro[zahrp],
                    id: ""
                });
            }
        }
    }
    _bindingActive(zahra) {
        var zahrb = zahra.parsed;
        if (zahrb.kind === "key") {
            var zahrc = this._keys[zahrb.code];
            return !!(zahrc && zahrc.down);
        }
        if (zahrb.kind === "mouse") {
            var zahrd = this._mouseButtons[zahrb.button];
            return !!(zahrd && zahrd.down);
        }
        if (zahrb.kind === "padButton") {
            var zahre = this._padStates[zahrb.pad];
            if (!zahre) return false;
            var zahrf = zahre.buttons[zahrb.button];
            return !!(zahrf && zahrf.pressed);
        }
        if (zahrb.kind === "padAxis") {
            var zahrg = this._padStates[zahrb.pad];
            if (!zahrg) return false;
            var zahrh = zahrg.axes[zahrb.axis];
            if (zahrh === undefined) return false;
            return zahrb.sign > 0 ? zahrh > this.axisThreshold : zahrh < -this.axisThreshold;
        }
        return false;
    }
    _bindingValue(zahra) {
        var zahrb = zahra.parsed;
        if (zahrb.kind === "key") {
            var zahrc = this._keys[zahrb.code];
            return zahrc && zahrc.down ? 1 : 0;
        }
        if (zahrb.kind === "mouse") {
            var zahrd = this._mouseButtons[zahrb.button];
            return zahrd && zahrd.down ? 1 : 0;
        }
        if (zahrb.kind === "padButton") {
            var zahre = this._padStates[zahrb.pad];
            if (!zahre) return 0;
            var zahrf = zahre.buttons[zahrb.button];
            return zahrf ? faoxomclamp(zahrf.value, 0, 1) : 0;
        }
        if (zahrb.kind === "padAxis") {
            var zahrg = this._padStates[zahrb.pad];
            if (!zahrg) return 0;
            var zahrh = zahrg.axes[zahrb.axis];
            if (zahrh === undefined) return 0;
            var zahri = zahrb.sign > 0 ? zahrh : -zahrh;
            return zahri > this.axisThreshold ? zahri : 0;
        }
        return 0;
    }
    update() {
        if (this.disposed) throw new Error("GameInput is disposed");
        this._actionEdges = {};
        this._pollGamepads();
        if (this._rebind && this._rebind.timeout > 0 && Date.now() - this._rebind.startedAt > this._rebind.timeout) this.cancelRebind();
        for (var zahra in this.bindings) {
            var zahrb = this.bindings[zahra];
            var zahrc = false, zahrd = 0;
            for (var zahre = 0; zahre < zahrb.length; zahre++) {
                if (this._bindingActive(zahrb[zahre])) zahrc = true;
                var zahrf = this._bindingValue(zahrb[zahre]);
                if (zahrf > zahrd) zahrd = zahrf;
            }
            var zahrg = !!this._prevActionState[zahra];
            var zahrh = zahrc && !zahrg;
            var zahri = !zahrc && zahrg;
            this._prevActionState[zahra] = zahrc;
            if (!this._actionEdges) this._actionEdges = {};
            this._actionEdges[zahra] = {
                pressed: zahrh,
                released: zahri
            };
            if (zahrh) {
                this.stats.actionsFired++;
                var zahrj = this.callbacks[zahra];
                if (zahrj) for (var zahrk = 0; zahrk < zahrj.length; zahrk++) zahrj[zahrk](zahra, zahrd);
            }
        }
        for (var zahrl in this._keys) this._keys[zahrl].edge = false;
        for (var zahrm in this._mouseButtons) this._mouseButtons[zahrm].edge = false;
        for (var zahrn in this._padStates) {
            var zahro = this._padStates[zahrn];
            for (var zahrp = 0; zahrp < zahro.buttons.length; zahrp++) {
                zahro.buttons[zahrp].justPressed = false;
                zahro.buttons[zahrp].justReleased = false;
            }
        }
        this._mouseDelta.x = 0;
        this._mouseDelta.y = 0;
        this._wheelDelta = 0;
        this._wheelEdges.up = false;
        this._wheelEdges.down = false;
        this.stats.updates++;
        return this;
    }
    isDown(zahra) {
        var zahrb = this.bindings[zahra];
        if (!zahrb) return false;
        for (var zahrc = 0; zahrc < zahrb.length; zahrc++) if (this._bindingActive(zahrb[zahrc])) return true;
        return false;
    }
    getValue(zahra) {
        var zahrb = this.bindings[zahra];
        if (!zahrb) return 0;
        var zahrc = 0;
        for (var zahrd = 0; zahrd < zahrb.length; zahrd++) {
            var zahre = this._bindingValue(zahrb[zahrd]);
            if (zahre > zahrc) zahrc = zahre;
        }
        return zahrc;
    }
    wasPressed(zahra) {
        if (this._actionEdges && this._actionEdges[zahra]) return this._actionEdges[zahra].pressed;
        return this.isDown(zahra) && !this._prevActionState[zahra];
    }
    wasReleased(zahra) {
        if (this._actionEdges && this._actionEdges[zahra]) return this._actionEdges[zahra].released;
        return !this.isDown(zahra) && !!this._prevActionState[zahra];
    }
    getVector2(zahra) {
        var zahrb = this.axes[zahra];
        if (!zahrb) return {
            x: 0,
            y: 0
        };
        var zahrc = 0, zahrd = 0;
        if (zahrb.right && this._directionDown(zahrb.right)) zahrc += 1;
        if (zahrb.left && this._directionDown(zahrb.left)) zahrc -= 1;
        if (zahrb.up && this._directionDown(zahrb.up)) zahrd += 1;
        if (zahrb.down && this._directionDown(zahrb.down)) zahrd -= 1;
        if (zahrb.pad !== null) {
            var zahre = this._padStates[zahrb.pad];
            if (zahre) {
                var zahrf = zahre.axes[zahrb.padXAxis] || 0;
                var zahrg = zahre.axes[zahrb.padYAxis] || 0;
                if (Math.abs(zahrf) > Math.abs(zahrc)) zahrc = zahrf;
                if (Math.abs(zahrg) > Math.abs(zahrd)) zahrd = zahrg;
            }
        }
        if (zahrc !== 0 && zahrd !== 0) {
            var zahrh = Math.sqrt(zahrc * zahrc + zahrd * zahrd);
            zahrc /= zahrh;
            zahrd /= zahrh;
        }
        if (zahrb.invertY) zahrd = -zahrd;
        return {
            x: zahrc,
            y: zahrd
        };
    }
    _directionDown(zahra) {
        var zahrb = this._keys[zahra];
        if (zahrb && zahrb.down) return true;
        return this.isDown(zahra);
    }
    get pointer() {
        return {
            x: this._pointer.x,
            y: this._pointer.y
        };
    }
    get mouseDelta() {
        return {
            x: this._mouseDelta.x,
            y: this._mouseDelta.y
        };
    }
    get wheelDelta() {
        return this._wheelDelta;
    }
    get wheelScrolledUp() {
        return this._wheelEdges.up;
    }
    get wheelScrolledDown() {
        return this._wheelEdges.down;
    }
    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        window.removeEventListener("keydown", this._handlers.keydown);
        window.removeEventListener("keyup", this._handlers.keyup);
        this.target.removeEventListener("mousedown", this._handlers.mousedown);
        window.removeEventListener("mouseup", this._handlers.mouseup);
        window.removeEventListener("mousemove", this._handlers.mousemove);
        window.removeEventListener("wheel", this._handlers.wheel);
        document.removeEventListener("pointerlockchange", this._handlers.pointerlockchange);
        window.removeEventListener("gamepadconnected", this._handlers.gamepadconnected);
        window.removeEventListener("gamepaddisconnected", this._handlers.gamepaddisconnected);
        this.target.removeEventListener("contextmenu", this._handlers.contextmenu);
        this.bindings = {};
        this.axes = {};
        this.callbacks = {};
        this.lockCallbacks = [];
        this.padConnectCallbacks = [];
        this.padDisconnectCallbacks = [];
        this._padStates = {};
        this._prevPads = [];
        return this;
    }
}

export { GameInput };

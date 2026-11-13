import { faoxomclamp, faoxomvalue } from "../math/index.js";

var SOURCE_RE = /^(Key[A-Z0-9]+|Digit[0-9]|Numpad[0-9]+|Space|Enter|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|Tab|Backspace|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Backslash|Comma|Period|Slash|IntlBackslash)$/;
var MOUSE_RE = /^Mouse([0-9]+)$/;
var PAD_RE = /^Pad([0-9]+):B([0-9]+)$/;
var AXIS_RE = /^Pad([0-9]+):A([0-9]+)([+-])?$/;

function parseSource(source) {
    if (!source || typeof source !== "string") return null;
    if (MOUSE_RE.test(source)) return { kind: "mouse", button: parseInt(source.match(MOUSE_RE)[1], 10) };
    if (PAD_RE.test(source)) { var m = source.match(PAD_RE); return { kind: "padButton", pad: parseInt(m[1], 10), button: parseInt(m[2], 10) }; }
    if (AXIS_RE.test(source)) { var a = source.match(AXIS_RE); return { kind: "padAxis", pad: parseInt(a[1], 10), axis: parseInt(a[2], 10), sign: a[3] === "-" ? -1 : 1 }; }
    if (SOURCE_RE.test(source)) return { kind: "key", code: source };
    return null;
}

function deadzoneAxis(value, deadzone) {
    var magnitude = Math.abs(value);
    if (magnitude <= deadzone) return 0;
    return Math.sign(value) * ((magnitude - deadzone) / (1 - deadzone));
}

class GameInput {
    constructor(options) {
        options = options || {};
        if (typeof window === "undefined" || typeof document === "undefined") throw new Error("GameInput requires a browser environment");
        this.target = options.target || document.body || document.documentElement;
        this.deadzone = faoxomclamp(faoxomvalue(options.gamepadDeadzone, 0.12), 0, 0.95);
        this.axisThreshold = faoxomclamp(faoxomvalue(options.axisThreshold, 0.5), 0.05, 0.95);
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
        this._pointer = { x: 0, y: 0 };
        this._mouseDelta = { x: 0, y: 0 };
        this._wheelDelta = 0;
        this._wheelEdges = { up: false, down: false };
        this._prevActionState = {};
        this._padStates = {};
        this._prevPads = [];
        this._rebind = null;
        this.stats = { updates: 0, actionsFired: 0, padsConnected: 0, rebinds: 0 };

        var defaults = options.bindings || {};
        for (var action in defaults) {
            var sources = Array.isArray(defaults[action]) ? defaults[action] : [defaults[action]];
            for (var i = 0; i < sources.length; i++) this.setBinding(action, sources[i], true);
        }

        var self = this;
        this._handlers = {
            keydown: function (event) { self._onKeyDown(event); },
            keyup: function (event) { self._onKeyUp(event); },
            mousedown: function (event) { self._mouseButtons[event.button] = { down: true, edge: true }; },
            mouseup: function (event) { self._mouseButtons[event.button] = { down: false, edge: true }; },
            mousemove: function (event) {
                self._pointer.x = event.clientX; self._pointer.y = event.clientY;
                if (document.pointerLockElement === self.target) {
                    self._mouseDelta.x += event.movementX || 0;
                    self._mouseDelta.y += event.movementY || 0;
                }
            },
            wheel: function (event) {
                self._wheelDelta += event.deltaY;
                if (event.deltaY < 0) self._wheelEdges.up = true;
                else if (event.deltaY > 0) self._wheelEdges.down = true;
            },
            pointerlockchange: function () { self._fireLockChange(document.pointerLockElement === self.target); },
            gamepadconnected: function (event) { self._onPadConnected(event && event.gamepad); },
            gamepaddisconnected: function (event) { self._onPadDisconnected(event && event.gamepad); },
            contextmenu: function (event) { event.preventDefault(); }
        };
        window.addEventListener("keydown", this._handlers.keydown);
        window.addEventListener("keyup", this._handlers.keyup);
        this.target.addEventListener("mousedown", this._handlers.mousedown);
        window.addEventListener("mouseup", this._handlers.mouseup);
        window.addEventListener("mousemove", this._handlers.mousemove);
        window.addEventListener("wheel", this._handlers.wheel, { passive: true });
        document.addEventListener("pointerlockchange", this._handlers.pointerlockchange);
        window.addEventListener("gamepadconnected", this._handlers.gamepadconnected);
        window.addEventListener("gamepaddisconnected", this._handlers.gamepaddisconnected);
        this.target.addEventListener("contextmenu", this._handlers.contextmenu);
    }

    _onKeyDown(event) {
        var code = event.code;
        if (this._rebind) {
            if (code === (this._rebind.cancelKey || "Escape")) this.cancelRebind();
            else this._finishRebind({ kind: "key", code: code, label: code });
            if (event.preventDefault) event.preventDefault();
            return;
        }
        if (!this._keys[code]) this._keys[code] = { down: true, edge: true };
        else { this._keys[code].down = true; }
        if (event.preventDefault && this._bindingsForSource("key:" + code).length) event.preventDefault();
    }

    _onKeyUp(event) {
        var code = event.code;
        if (this._keys[code]) { this._keys[code].down = false; this._keys[code].edge = true; }
    }

    _bindingsForSource(key) {
        var matches = [];
        for (var action in this.bindings) {
            var sources = this.bindings[action];
            for (var i = 0; i < sources.length; i++) if (sources[i]._sourceKey === key) matches.push(action);
        }
        return matches;
    }

    setBinding(action, source, isDefault) {
        if (this.disposed) throw new Error("GameInput is disposed");
        if (!action || typeof action !== "string") throw new Error("setBinding requires an action name");
        var parsed = parseSource(source);
        if (!parsed) throw new Error("invalid input source '" + source + "'");
        if (!this.bindings[action]) this.bindings[action] = [];
        var exists = false;
        for (var i = 0; i < this.bindings[action].length; i++) if (this.bindings[action][i].source === source) exists = true;
        if (exists) return this;
        this.bindings[action].push({ source: source, parsed: parsed, _sourceKey: this._sourceKey(parsed) });
        if (isDefault) {
            if (!this.defaultBindings[action]) this.defaultBindings[action] = [];
            this.defaultBindings[action].push(source);
        }
        return this;
    }

    _sourceKey(parsed) {
        if (parsed.kind === "key") return "key:" + parsed.code;
        if (parsed.kind === "mouse") return "mouse:" + parsed.button;
        if (parsed.kind === "padButton") return "padButton:" + parsed.pad + ":" + parsed.button;
        return "padAxis:" + parsed.pad + ":" + parsed.axis + ":" + (parsed.sign > 0 ? "+" : "-");
    }

    getBindings(action) {
        var sources = this.bindings[action] || [];
        var out = [];
        for (var i = 0; i < sources.length; i++) out.push(sources[i].source);
        return out;
    }

    clearBindings(action) {
        if (this.bindings[action]) this.bindings[action].length = 0;
        return this;
    }

    resetBindings() {
        this.bindings = {};
        for (var action in this.defaultBindings) {
            var sources = this.defaultBindings[action];
            for (var i = 0; i < sources.length; i++) this.setBinding(action, sources[i], true);
        }
        return this;
    }

    bindAxis(action, options) {
        options = options || {};
        this.axes[action] = {
            up: options.up || null, down: options.down || null, left: options.left || null, right: options.right || null,
            pad: options.pad === undefined ? null : options.pad, padXAxis: options.padXAxis === undefined ? 0 : options.padXAxis,
            padYAxis: options.padYAxis === undefined ? 1 : options.padYAxis, invertY: options.invertY === true
        };
        return this;
    }

    startRebind(action, options) {
        if (this.disposed) throw new Error("GameInput is disposed");
        options = options || {};
        if (!action || !this.bindings[action]) throw new Error("rebind requires an existing action");
        if (this._rebind) return this;
        this._rebind = {
            action: action,
            mode: options.add === true ? "add" : "replace",
            cancelKey: options.cancelKey || "Escape",
            timeout: faoxomvalue(options.timeout, 0),
            onDone: options.onDone || null,
            onCancel: options.onCancel || null,
            startedAt: Date.now()
        };
        return this;
    }

    cancelRebind() {
        if (!this._rebind) return this;
        var cancelled = this._rebind;
        this._rebind = null;
        if (cancelled.onCancel) cancelled.onCancel(cancelled.action);
        return this;
    }

    get isRebinding() { return !!this._rebind; }

    _finishRebind(source) {
        var rebind = this._rebind;
        if (!rebind) return;
        this._rebind = null;
        var sourceString = source.kind === "key" ? source.code : source.kind === "mouse" ? "Mouse" + source.button : source.kind === "padButton" ? "Pad" + source.pad + ":B" + source.button : "Pad" + source.pad + ":A" + source.axis + (source.sign < 0 ? "-" : "+");
        if (rebind.mode === "replace") this.clearBindings(rebind.action);
        this.setBinding(rebind.action, sourceString);
        this.stats.rebinds++;
        if (rebind.onDone) rebind.onDone(rebind.action, sourceString);
    }

    onAction(action, callback) {
        if (!this.callbacks[action]) this.callbacks[action] = [];
        this.callbacks[action].push(callback);
        return this;
    }

    offAction(action, callback) {
        var list = this.callbacks[action];
        if (!list) return this;
        var index = callback === undefined ? -1 : list.indexOf(callback);
        if (index === -1) list.length = 0;
        else list.splice(index, 1);
        return this;
    }

    onLockChange(callback) { this.lockCallbacks.push(callback); return this; }

    _fireLockChange(locked) {
        for (var i = 0; i < this.lockCallbacks.length; i++) this.lockCallbacks[i](locked);
    }

    onGamepadConnected(callback) { this.padConnectCallbacks.push(callback); return this; }
    onGamepadDisconnected(callback) { this.padDisconnectCallbacks.push(callback); return this; }

    _onPadConnected(pad) {
        if (!pad || this._prevPads.indexOf(pad.index) >= 0) return;
        this._prevPads.push(pad.index);
        this.stats.padsConnected++;
        for (var i = 0; i < this.padConnectCallbacks.length; i++) this.padConnectCallbacks[i](pad);
    }

    _onPadDisconnected(pad) {
        if (!pad) return;
        var index = this._prevPads.indexOf(pad.index);
        if (index < 0) return;
        this._prevPads.splice(index, 1);
        delete this._padStates[pad.index];
        for (var i = 0; i < this.padDisconnectCallbacks.length; i++) this.padDisconnectCallbacks[i](pad);
    }

    lock() {
        if (this.disposed) throw new Error("GameInput is disposed");
        if (this.target && this.target.requestPointerLock) {
            var result = this.target.requestPointerLock();
            if (result && result.catch) result.catch(function () { });
            return true;
        }
        return false;
    }

    unlock() {
        if (this.disposed) throw new Error("GameInput is disposed");
        if (document.exitPointerLock) { document.exitPointerLock(); return true; }
        return false;
    }

    get isLocked() { return typeof document !== "undefined" && document.pointerLockElement === this.target; }

    _padList() {
        if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
        var pads = navigator.getGamepads() || [];
        var out = [];
        for (var i = 0; i < pads.length; i++) if (pads && pads[i]) out.push(pads[i]);
        return out;
    }

    gamepads() {
        var pads = this._padList();
        var out = [];
        for (var i = 0; i < pads.length; i++) {
            var pad = pads[i], state = this._padStates[pad.index];
            out.push({
                index: pad.index, id: pad.id, mapping: pad.mapping,
                buttons: state ? state.buttons.map(function (button) { return { pressed: button.pressed, justPressed: button.justPressed, justReleased: button.justReleased, value: button.value }; }) : [],
                rawAxes: pad.axes ? Array.prototype.slice.call(pad.axes) : [],
                axes: state ? state.axes.slice() : []
            });
        }
        return out;
    }

    setDeadzone(value, padIndex, axisIndex) {
        var dz = faoxomclamp(value, 0, 0.95);
        if (padIndex === undefined) { this.deadzone = dz; return this; }
        var state = this._padStates[padIndex];
        if (!state) return this;
        if (axisIndex === undefined) for (var i = 0; i < state.axesDeadzone.length; i++) state.axesDeadzone[i] = dz;
        else if (state.axesDeadzone[axisIndex] !== undefined) state.axesDeadzone[axisIndex] = dz;
        return this;
    }

    _pollGamepads() {
        var pads = this._padList();
        var seen = {};
        for (var i = 0; i < pads.length; i++) {
            var pad = pads[i];
            seen[pad.index] = true;
            if (this._prevPads.indexOf(pad.index) < 0) {
                this._prevPads.push(pad.index);
                this.stats.padsConnected++;
                for (var c = 0; c < this.padConnectCallbacks.length; c++) this.padConnectCallbacks[c](pad);
            }
            var state = this._padStates[pad.index];
            if (!state) {
                state = this._padStates[pad.index] = { buttons: [], axes: [], axesDeadzone: [] };
                for (var b = 0; b < (pad.buttons ? pad.buttons.length : 0); b++) state.buttons.push({ pressed: false, justPressed: false, justReleased: false, value: 0 });
                for (var a = 0; a < (pad.axes ? pad.axes.length : 0); a++) { state.axes.push(0); state.axesDeadzone.push(this.deadzone); }
            }
            while (state.buttons.length < (pad.buttons ? pad.buttons.length : 0)) state.buttons.push({ pressed: false, justPressed: false, justReleased: false, value: 0 });
            while (state.axes.length < (pad.axes ? pad.axes.length : 0)) { state.axes.push(0); state.axesDeadzone.push(this.deadzone); }
            for (var bi = 0; bi < (pad.buttons ? pad.buttons.length : 0); bi++) {
                var raw = pad.buttons[bi];
                var target = state.buttons[bi];
                var pressedNow = !!(raw && (raw.pressed || (raw.value || 0) > this.axisThreshold));
                target.justPressed = pressedNow && !target.pressed;
                target.justReleased = !pressedNow && target.pressed;
                target.pressed = pressedNow;
                target.value = raw ? +raw.value || 0 : 0;
                if (this._rebind && target.justPressed && this._rebind.padIndex === undefined) {
                    this._rebind.padIndex = pad.index;
                    this._finishRebind({ kind: "padButton", pad: pad.index, button: bi, sign: 1 });
                }
            }
            for (var ai = 0; ai < (pad.axes ? pad.axes.length : 0); ai++) {
                state.axes[ai] = deadzoneAxis(+pad.axes[ai] || 0, state.axesDeadzone[ai] || this.deadzone);
            }
        }
        var missing = this._prevPads.slice();
        for (var m = 0; m < missing.length; m++) {
            if (!seen[missing[m]]) {
                var index = this._prevPads.indexOf(missing[m]);
                this._prevPads.splice(index, 1);
                delete this._padStates[missing[m]];
                for (var d = 0; d < this.padDisconnectCallbacks.length; d++) this.padDisconnectCallbacks[d]({ index: missing[m], id: "" });
            }
        }
    }

    _bindingActive(binding) {
        var parsed = binding.parsed;
        if (parsed.kind === "key") { var key = this._keys[parsed.code]; return !!(key && key.down); }
        if (parsed.kind === "mouse") { var mouse = this._mouseButtons[parsed.button]; return !!(mouse && mouse.down); }
        if (parsed.kind === "padButton") {
            var padState = this._padStates[parsed.pad];
            if (!padState) return false;
            var button = padState.buttons[parsed.button];
            return !!(button && button.pressed);
        }
        if (parsed.kind === "padAxis") {
            var axisState = this._padStates[parsed.pad];
            if (!axisState) return false;
            var axis = axisState.axes[parsed.axis];
            if (axis === undefined) return false;
            return parsed.sign > 0 ? axis > this.axisThreshold : axis < -this.axisThreshold;
        }
        return false;
    }

    _bindingValue(binding) {
        var parsed = binding.parsed;
        if (parsed.kind === "key") { var key = this._keys[parsed.code]; return key && key.down ? 1 : 0; }
        if (parsed.kind === "mouse") { var mouse = this._mouseButtons[parsed.button]; return mouse && mouse.down ? 1 : 0; }
        if (parsed.kind === "padButton") {
            var padState = this._padStates[parsed.pad];
            if (!padState) return 0;
            var button = padState.buttons[parsed.button];
            return button ? faoxomclamp(button.value, 0, 1) : 0;
        }
        if (parsed.kind === "padAxis") {
            var axisState = this._padStates[parsed.pad];
            if (!axisState) return 0;
            var axis = axisState.axes[parsed.axis];
            if (axis === undefined) return 0;
            var magnitude = parsed.sign > 0 ? axis : -axis;
            return magnitude > this.axisThreshold ? magnitude : 0;
        }
        return 0;
    }

    update() {
        if (this.disposed) throw new Error("GameInput is disposed");
        this._actionEdges = {};
        this._pollGamepads();
        if (this._rebind && this._rebind.timeout > 0 && Date.now() - this._rebind.startedAt > this._rebind.timeout) this.cancelRebind();
        for (var action in this.bindings) {
            var sources = this.bindings[action];
            var down = false, bestValue = 0;
            for (var i = 0; i < sources.length; i++) {
                if (this._bindingActive(sources[i])) down = true;
                var value = this._bindingValue(sources[i]);
                if (value > bestValue) bestValue = value;
            }
            var previous = !!this._prevActionState[action];
            var pressed = down && !previous;
            var released = !down && previous;
            this._prevActionState[action] = down;
            if (!this._actionEdges) this._actionEdges = {};
            this._actionEdges[action] = { pressed: pressed, released: released };
            if (pressed) {
                this.stats.actionsFired++;
                var callbacks = this.callbacks[action];
                if (callbacks) for (var c = 0; c < callbacks.length; c++) callbacks[c](action, bestValue);
            }
        }
        for (var code in this._keys) this._keys[code].edge = false;
        for (var button in this._mouseButtons) this._mouseButtons[button].edge = false;
        for (var padIndex in this._padStates) {
            var state = this._padStates[padIndex];
            for (var b = 0; b < state.buttons.length; b++) { state.buttons[b].justPressed = false; state.buttons[b].justReleased = false; }
        }
        this._mouseDelta.x = 0; this._mouseDelta.y = 0;
        this._wheelDelta = 0;
        this._wheelEdges.up = false; this._wheelEdges.down = false;
        this.stats.updates++;
        return this;
    }

    isDown(action) {
        var sources = this.bindings[action];
        if (!sources) return false;
        for (var i = 0; i < sources.length; i++) if (this._bindingActive(sources[i])) return true;
        return false;
    }

    getValue(action) {
        var sources = this.bindings[action];
        if (!sources) return 0;
        var best = 0;
        for (var i = 0; i < sources.length; i++) { var value = this._bindingValue(sources[i]); if (value > best) best = value; }
        return best;
    }

    wasPressed(action) {
        if (this._actionEdges && this._actionEdges[action]) return this._actionEdges[action].pressed;
        return this.isDown(action) && !this._prevActionState[action];
    }

    wasReleased(action) {
        if (this._actionEdges && this._actionEdges[action]) return this._actionEdges[action].released;
        return !this.isDown(action) && !!this._prevActionState[action];
    }

    getVector2(action) {
        var axis = this.axes[action];
        if (!axis) return { x: 0, y: 0 };
        var x = 0, y = 0;
        if (axis.right && this._directionDown(axis.right)) x += 1;
        if (axis.left && this._directionDown(axis.left)) x -= 1;
        if (axis.up && this._directionDown(axis.up)) y += 1;
        if (axis.down && this._directionDown(axis.down)) y -= 1;
        if (axis.pad !== null) {
            var state = this._padStates[axis.pad];
            if (state) {
                var padX = state.axes[axis.padXAxis] || 0;
                var padY = state.axes[axis.padYAxis] || 0;
                if (Math.abs(padX) > Math.abs(x)) x = padX;
                if (Math.abs(padY) > Math.abs(y)) y = padY;
            }
        }
        if (x !== 0 && y !== 0) { var length = Math.sqrt(x * x + y * y); x /= length; y /= length; }
        if (axis.invertY) y = -y;
        return { x: x, y: y };
    }

    _directionDown(name) {
        var key = this._keys[name];
        if (key && key.down) return true;
        return this.isDown(name);
    }

    get pointer() { return { x: this._pointer.x, y: this._pointer.y }; }
    get mouseDelta() { return { x: this._mouseDelta.x, y: this._mouseDelta.y }; }
    get wheelDelta() { return this._wheelDelta; }
    get wheelScrolledUp() { return this._wheelEdges.up; }
    get wheelScrolledDown() { return this._wheelEdges.down; }

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

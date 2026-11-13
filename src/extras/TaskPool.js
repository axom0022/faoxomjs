// TaskPool - worker-first task graph (roadmap item 43). A pool of workers
// running registered task handlers with a dependency-ordered graph scheduler,
// transferable-friendly payloads, optional SharedArrayBuffer sharing (when
// the platform exposes it) and engine-backed tasks (BVH builds) when an
// engineUrl (UMD script) is provided for importScripts.

function fnv1a(u8) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < u8.length; i++) {
        hash ^= u8[i];
        hash = (hash * 0x01000193) >>> 0;
    }
    return ("00000000" + hash.toString(16)).slice(-8);
}

function defaultWorkerSource(engineUrl) {
    return 'var __engineUrl = ' + JSON.stringify(engineUrl || null) + ';\n' +
        'if (__engineUrl) { try { importScripts(__engineUrl); } catch (engineError) { }\n' +
        '  if (typeof FaoxomJs === "undefined" && __engineUrl) postMessage({ id: "__engine__", ok: false, error: "importScripts failed for " + __engineUrl }); }\n' +
        'function fnv1a(u8) { var h = 0x811c9dc5; for (var i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; } return ("00000000" + h.toString(16)).slice(-8); }\n' +
        'var handlers = {\n' +
        '    ping: function (payload) { return { value: { pong: payload && payload.value !== undefined ? payload.value : true, engine: typeof FaoxomJs !== "undefined" } }; },\n' +
        '    "process-floats": function (payload) {\n' +
        '        var data = payload.data, op = payload.op || "square", factor = payload.factor || 2, i;\n' +
        '        if (!data) throw new Error("process-floats requires data");\n' +
        '        if (payload.shared) { for (i = 0; i < data.length; i++) { if (op === "square") data[i] = data[i] * data[i]; else if (op === "scale") data[i] = data[i] * factor; else if (op === "sqrt") data[i] = Math.sqrt(Math.abs(data[i])); } return { value: { inPlace: true, length: data.length } }; }\n' +
        '        for (i = 0; i < data.length; i++) { if (op === "square") data[i] = data[i] * data[i]; else if (op === "scale") data[i] = data[i] * factor; else if (op === "sqrt") data[i] = Math.sqrt(Math.abs(data[i])); }\n' +
        '        return { value: { data: data }, transfer: [data.buffer] };\n' +
        '    },\n' +
        '    "hash-buffer": function (payload) {\n' +
        '        var view = payload.bytes instanceof Uint8Array ? payload.bytes : new Uint8Array(payload.bytes || new ArrayBuffer(0));\n' +
        '        return { value: { hash: fnv1a(view), bytes: view.length } };\n' +
        '    },\n' +
        '    "build-bvh": function (payload) {\n' +
        '        if (typeof FaoxomJs === "undefined") throw new Error("build-bvh requires TaskPool({ engineUrl: ... })");\n' +
        '        var bvh = new FaoxomJs.BVH({ attributes: { position: { array: payload.positions, itemSize: 3 } }, index: payload.indices }, payload.options || {});\n' +
        '        return { value: { prebuilt: { nodeBounds: bvh.nodeBounds, nodeLeft: bvh.nodeLeft, nodeRight: bvh.nodeRight, nodeStart: bvh.nodeStart, nodeCount: bvh.nodeCountArr, triRefs: bvh.triRefs, spatialSplits: bvh.statsSpatialSplits, maxDepth: bvh.statsMaxDepth, leaves: bvh.statsLeaves, nodes: bvh.statsNodes, splitFallbacks: bvh.statsFallbacks }, buildMs: bvh.buildMs }, transfer: [bvh.nodeBounds.buffer, bvh.nodeLeft.buffer, bvh.nodeRight.buffer, bvh.nodeStart.buffer, bvh.nodeCountArr.buffer, bvh.triRefs.buffer, payload.positions.buffer, payload.indices.buffer] };\n' +
        '    }\n' +
        '};\n' +
        'self.onmessage = function (event) {\n' +
        '    var message = event.data;\n' +
        '    if (!message || message.id === undefined) return;\n' +
        '    var handler = handlers[message.task];\n' +
        '    if (!handler) { postMessage({ id: message.id, ok: false, error: "unknown task: " + message.task }); return; }\n' +
        '    try {\n' +
        '        var outcome = handler(message.payload || {});\n' +
        '        if (outcome && outcome.transfer) postMessage({ id: message.id, ok: true, result: outcome.value }, outcome.transfer);\n' +
        '        else postMessage({ id: message.id, ok: true, result: outcome ? outcome.value : outcome });\n' +
        '    } catch (taskError) { postMessage({ id: message.id, ok: false, error: String(taskError && taskError.message || taskError) }); }\n' +
        '};\n';
}

class TaskPool {
    constructor(options) {
        options = options || {};
        var hardware = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2;
        this.size = Math.max(1, Math.min(options.workers || Math.min(4, hardware), 16));
        this.engineUrl = options.engineUrl || null;
        this.workerUrl = options.workerUrl || null;
        this._workers = [];
        this._idle = [];
        this._queue = [];
        this._pending = {};
        this._nextId = 1;
        this._blobUrl = null;
        this._terminated = false;
        this.stats = { workers: 0, dispatched: 0, completed: 0, failed: 0, queued: 0 };
        this._spawn();
    }

    static get supportsSharedArrayBuffer() {
        return typeof SharedArrayBuffer !== "undefined";
    }

    get supportsSharedArrayBuffer() {
        return TaskPool.supportsSharedArrayBuffer;
    }

    _makeBlobUrl() {
        if (this._blobUrl) return this._blobUrl;
        var source = defaultWorkerSource(this.engineUrl);
        var blob = new Blob([source], { type: "text/javascript" });
        this._blobUrl = URL.createObjectURL(blob);
        return this._blobUrl;
    }

    _spawn() {
        for (var i = 0; i < this.size; i++) {
            var worker = null;
            try {
                worker = new Worker(this.workerUrl || this._makeBlobUrl());
            } catch (workerError) {
                break;
            }
            this._attach(worker);
            this._workers.push(worker);
            this._idle.push(worker);
        }
        this.stats.workers = this._workers.length;
    }

    _attach(worker) {
        var self = this;
        worker.onmessage = function (event) {
            var message = event.data;
            if (!message || message.id === undefined) return;
            var entry = self._pending[message.id];
            if (!entry) return;
            delete self._pending[message.id];
            self._idle.push(worker);
            if (message.ok) {
                self.stats.completed++;
                entry.resolve(message.result);
            } else {
                self.stats.failed++;
                entry.reject(new Error(message.error || "task failed"));
            }
            self._drain();
        };
        worker.onerror = function (errorEvent) {
            var ids = Object.keys(self._pending);
            for (var i = 0; i < ids.length; i++) {
                var entry = self._pending[ids[i]];
                if (entry && entry.worker === worker) {
                    delete self._pending[ids[i]];
                    self.stats.failed++;
                    entry.reject(new Error(errorEvent && errorEvent.message ? errorEvent.message : "worker error"));
                }
            }
            self._drain();
        };
    }

    _drain() {
        while (this._queue.length && this._idle.length) {
            var job = this._queue.shift();
            this.stats.queued--;
            this._dispatch(job);
        }
    }

    _dispatch(job) {
        var worker = this._idle.shift();
        if (!worker) {
            this._queue.push(job);
            this.stats.queued++;
            return;
        }
        this._pending[job.id] = { resolve: job.resolve, reject: job.reject, worker: worker };
        this.stats.dispatched++;
        worker.postMessage({ id: job.id, task: job.task, payload: job.payload }, job.transfer || []);
    }

    run(task, payload, transfer) {
        var self = this;
        if (this._terminated) return Promise.reject(new Error("TaskPool terminated"));
        return new Promise(function (resolve, reject) {
            var job = { id: self._nextId++, task: task, payload: payload, transfer: transfer, resolve: resolve, reject: reject };
            if (self._idle.length) self._dispatch(job);
            else { self._queue.push(job); self.stats.queued++; }
        });
    }

    // Dependency-ordered graph execution. nodes: [{ id, task, payload,
    // transfer, deps: [ids] }]. Resolves with { id: result } once every node
    // has completed; rejects as soon as any node fails.
    submit(graph) {
        var self = this;
        var nodes = graph.nodes || [];
        var results = {};
        var remaining = {};
        var dependents = {};
        var ready = [];
        var nodeById = {};
        var total = nodes.length;
        if (!total) return Promise.resolve({});
        for (var i = 0; i < total; i++) {
            var node = nodes[i];
            if (!node.id) return Promise.reject(new Error("graph node missing id"));
            if (nodeById[node.id]) return Promise.reject(new Error("duplicate graph node id: " + node.id));
            nodeById[node.id] = node;
            remaining[node.id] = (node.deps || []).length;
            dependents[node.id] = dependents[node.id] || [];
            var deps = node.deps || [];
            for (var d = 0; d < deps.length; d++) {
                dependents[deps[d]] = dependents[deps[d]] || [];
                dependents[deps[d]].push(node.id);
            }
            if (!deps.length) ready.push(node);
        }
        for (var i = 0; i < total; i++) {
            var nodeDeps = nodes[i].deps || [];
            for (var d = 0; d < nodeDeps.length; d++) {
                if (!nodeById[nodeDeps[d]]) return Promise.reject(new Error("unknown dependency: " + nodeDeps[d]));
            }
        }
        return new Promise(function (resolve, reject) {
            var completedCount = 0;
            var launch = function (node) {
                self.run(node.task, node.payload, node.transfer).then(function (result) {
                    results[node.id] = result;
                    completedCount++;
                    if (typeof graph.onNode === "function") {
                        try { graph.onNode(node.id, result, completedCount / total); } catch (nodeError) { /* user callback */ }
                    }
                    var children = dependents[node.id] || [];
                    for (var c = 0; c < children.length; c++) {
                        remaining[children[c]]--;
                        if (remaining[children[c]] === 0) launch(nodeById[children[c]]);
                    }
                    if (completedCount === total) resolve(results);
                }).catch(reject);
            };
            for (var r = 0; r < ready.length; r++) launch(ready[r]);
        });
    }

    terminate() {
        this._terminated = true;
        for (var i = 0; i < this._workers.length; i++) this._workers[i].terminate();
        this._workers = [];
        this._idle = [];
        this.stats.workers = 0;
        if (this._blobUrl) {
            try { URL.revokeObjectURL(this._blobUrl); } catch (revokeError) { /* gone */ }
            this._blobUrl = null;
        }
        return this;
    }
}

export { TaskPool };

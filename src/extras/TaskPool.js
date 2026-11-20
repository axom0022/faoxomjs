function zajda(zajda) {
    var zajdb = 2166136261;
    for (var zajdc = 0; zajdc < zajda.length; zajdc++) {
        zajdb ^= zajda[zajdc];
        zajdb = zajdb * 16777619 >>> 0;
    }
    return ("00000000" + zajdb.toString(16)).slice(-8);
}

function zajdb(zajda) {
    return "var __engineUrl = " + JSON.stringify(zajda || null) + ";\n" + "if (__engineUrl) { try { importScripts(__engineUrl); } catch (engineError) { }\n" + '  if (typeof FaoxomJs === "undefined" && __engineUrl) postMessage({ id: "__engine__", ok: false, error: "importScripts failed for " + __engineUrl }); }\n' + 'function fnv1a(u8) { var h = 0x811c9dc5; for (var i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; } return ("00000000" + h.toString(16)).slice(-8); }\n' + "var handlers = {\n" + '    ping: function (payload) { return { value: { pong: payload && payload.value !== undefined ? payload.value : true, engine: typeof FaoxomJs !== "undefined" } }; },\n' + '    "process-floats": function (payload) {\n' + '        var data = payload.data, op = payload.op || "square", factor = payload.factor || 2, i;\n' + '        if (!data) throw new Error("process-floats requires data");\n' + '        if (payload.shared) { for (i = 0; i < data.length; i++) { if (op === "square") data[i] = data[i] * data[i]; else if (op === "scale") data[i] = data[i] * factor; else if (op === "sqrt") data[i] = Math.sqrt(Math.abs(data[i])); } return { value: { inPlace: true, length: data.length } }; }\n' + '        for (i = 0; i < data.length; i++) { if (op === "square") data[i] = data[i] * data[i]; else if (op === "scale") data[i] = data[i] * factor; else if (op === "sqrt") data[i] = Math.sqrt(Math.abs(data[i])); }\n' + "        return { value: { data: data }, transfer: [data.buffer] };\n" + "    },\n" + '    "hash-buffer": function (payload) {\n' + "        var view = payload.bytes instanceof Uint8Array ? payload.bytes : new Uint8Array(payload.bytes || new ArrayBuffer(0));\n" + "        return { value: { hash: fnv1a(view), bytes: view.length } };\n" + "    },\n" + '    "build-bvh": function (payload) {\n' + '        if (typeof FaoxomJs === "undefined") throw new Error("build-bvh requires TaskPool({ engineUrl: ... })");\n' + "        var bvh = new FaoxomJs.BVH({ attributes: { position: { array: payload.positions, itemSize: 3 } }, index: payload.indices }, payload.options || {});\n" + "        return { value: { prebuilt: { nodeBounds: bvh.nodeBounds, nodeLeft: bvh.nodeLeft, nodeRight: bvh.nodeRight, nodeStart: bvh.nodeStart, nodeCount: bvh.nodeCountArr, triRefs: bvh.triRefs, spatialSplits: bvh.statsSpatialSplits, maxDepth: bvh.statsMaxDepth, leaves: bvh.statsLeaves, nodes: bvh.statsNodes, splitFallbacks: bvh.statsFallbacks }, buildMs: bvh.buildMs }, transfer: [bvh.nodeBounds.buffer, bvh.nodeLeft.buffer, bvh.nodeRight.buffer, bvh.nodeStart.buffer, bvh.nodeCountArr.buffer, bvh.triRefs.buffer, payload.positions.buffer, payload.indices.buffer] };\n" + "    }\n" + "};\n" + "self.onmessage = function (event) {\n" + "    var message = event.data;\n" + "    if (!message || message.id === undefined) return;\n" + "    var handler = handlers[message.task];\n" + '    if (!handler) { postMessage({ id: message.id, ok: false, error: "unknown task: " + message.task }); return; }\n' + "    try {\n" + "        var outcome = handler(message.payload || {});\n" + "        if (outcome && outcome.transfer) postMessage({ id: message.id, ok: true, result: outcome.value }, outcome.transfer);\n" + "        else postMessage({ id: message.id, ok: true, result: outcome ? outcome.value : outcome });\n" + "    } catch (taskError) { postMessage({ id: message.id, ok: false, error: String(taskError && taskError.message || taskError) }); }\n" + "};\n";
}

class TaskPool {
    constructor(zajda) {
        zajda = zajda || {};
        var zajdb = typeof navigator !== "undefined" && navigator.hardwareConcurrency || 2;
        this.size = Math.max(1, Math.min(zajda.workers || Math.min(4, zajdb), 16));
        this.engineUrl = zajda.engineUrl || null;
        this.workerUrl = zajda.workerUrl || null;
        this._workers = [];
        this._idle = [];
        this._queue = [];
        this._pending = {};
        this._nextId = 1;
        this._blobUrl = null;
        this._terminated = false;
        this.stats = {
            workers: 0,
            dispatched: 0,
            completed: 0,
            failed: 0,
            queued: 0
        };
        this._spawn();
        TaskPool.instances.push(this);
    }
    static get supportsSharedArrayBuffer() {
        return typeof SharedArrayBuffer !== "undefined";
    }
    static get instances() {
        if (!TaskPool._instances) TaskPool._instances = [];
        return TaskPool._instances;
    }
    static isolationStatus() {
        var zajda = false;
        try {
            zajda = typeof crossOriginIsolated !== "undefined" ? !!crossOriginIsolated : false;
        } catch (zajdb) {
            zajda = false;
        }
        return {
            sharedArrayBuffer: TaskPool.supportsSharedArrayBuffer,
            crossOriginIsolated: zajda
        };
    }
    get supportsSharedArrayBuffer() {
        return TaskPool.supportsSharedArrayBuffer;
    }
    _makeBlobUrl() {
        if (this._blobUrl) return this._blobUrl;
        var zajda = zajdb(this.engineUrl);
        var zajdc = new Blob([ zajda ], {
            type: "text/javascript"
        });
        this._blobUrl = URL.createObjectURL(zajdc);
        return this._blobUrl;
    }
    _spawn() {
        for (var zajda = 0; zajda < this.size; zajda++) {
            var zajdb = null;
            try {
                zajdb = new Worker(this.workerUrl || this._makeBlobUrl());
            } catch (zajda) {
                break;
            }
            this._attach(zajdb);
            this._workers.push(zajdb);
            this._idle.push(zajdb);
        }
        this.stats.workers = this._workers.length;
    }
    _attach(zajda) {
        var zajdb = this;
        zajda.onmessage = function(zajdc) {
            var zajdd = zajdc.data;
            if (!zajdd || zajdd.id === undefined) return;
            var zajde = zajdb._pending[zajdd.id];
            if (!zajde) return;
            delete zajdb._pending[zajdd.id];
            zajdb._idle.push(zajda);
            if (zajdd.ok) {
                zajdb.stats.completed++;
                zajde.resolve(zajdd.result);
            } else {
                zajdb.stats.failed++;
                zajde.reject(new Error(zajdd.error || "task failed"));
            }
            zajdb._drain();
        };
        zajda.onerror = function(zajdc) {
            var zajdd = Object.keys(zajdb._pending);
            for (var zajde = 0; zajde < zajdd.length; zajde++) {
                var zajdf = zajdb._pending[zajdd[zajde]];
                if (zajdf && zajdf.worker === zajda) {
                    delete zajdb._pending[zajdd[zajde]];
                    zajdb.stats.failed++;
                    zajdf.reject(new Error(zajdc && zajdc.message ? zajdc.message : "worker error"));
                }
            }
            zajdb._drain();
        };
    }
    _drain() {
        while (this._queue.length && this._idle.length) {
            var zajda = this._queue.shift();
            this.stats.queued--;
            this._dispatch(zajda);
        }
    }
    _dispatch(zajda) {
        var zajdb = this._idle.shift();
        if (!zajdb) {
            this._queue.push(zajda);
            this.stats.queued++;
            return;
        }
        this._pending[zajda.id] = {
            resolve: zajda.resolve,
            reject: zajda.reject,
            worker: zajdb
        };
        this.stats.dispatched++;
        zajdb.postMessage({
            id: zajda.id,
            task: zajda.task,
            payload: zajda.payload
        }, zajda.transfer || []);
    }
    run(zajda, zajdb, zajdc) {
        var zajdd = this;
        if (this._terminated) return Promise.reject(new Error("TaskPool terminated"));
        return new Promise(function(zajde, zajdf) {
            var zajdg = {
                id: zajdd._nextId++,
                task: zajda,
                payload: zajdb,
                transfer: zajdc,
                resolve: zajde,
                reject: zajdf
            };
            if (zajdd._idle.length) zajdd._dispatch(zajdg); else {
                zajdd._queue.push(zajdg);
                zajdd.stats.queued++;
            }
        });
    }
    submit(zajda) {
        var zajdb = this;
        var zajdc = zajda.nodes || [];
        var zajdd = {};
        var zajde = {};
        var zajdf = {};
        var zajdg = [];
        var zajdh = {};
        var zajdi = zajdc.length;
        if (!zajdi) return Promise.resolve({});
        for (var zajdj = 0; zajdj < zajdi; zajdj++) {
            var zajdk = zajdc[zajdj];
            if (!zajdk.id) return Promise.reject(new Error("graph node missing id"));
            if (zajdh[zajdk.id]) return Promise.reject(new Error("duplicate graph node id: " + zajdk.id));
            zajdh[zajdk.id] = zajdk;
            zajde[zajdk.id] = (zajdk.deps || []).length;
            zajdf[zajdk.id] = zajdf[zajdk.id] || [];
            var zajdl = zajdk.deps || [];
            for (var zajdm = 0; zajdm < zajdl.length; zajdm++) {
                zajdf[zajdl[zajdm]] = zajdf[zajdl[zajdm]] || [];
                zajdf[zajdl[zajdm]].push(zajdk.id);
            }
            if (!zajdl.length) zajdg.push(zajdk);
        }
        for (var zajdj = 0; zajdj < zajdi; zajdj++) {
            var zajdn = zajdc[zajdj].deps || [];
            for (var zajdm = 0; zajdm < zajdn.length; zajdm++) {
                if (!zajdh[zajdn[zajdm]]) return Promise.reject(new Error("unknown dependency: " + zajdn[zajdm]));
            }
        }
        return new Promise(function(zajdc, zajdj) {
            var zajdk = 0;
            var zajdl = function(zajdg) {
                zajdb.run(zajdg.task, zajdg.payload, zajdg.transfer).then(function(zajdb) {
                    zajdd[zajdg.id] = zajdb;
                    zajdk++;
                    if (typeof zajda.onNode === "function") {
                        try {
                            zajda.onNode(zajdg.id, zajdb, zajdk / zajdi);
                        } catch (zajda) {}
                    }
                    var zajdj = zajdf[zajdg.id] || [];
                    for (var zajdm = 0; zajdm < zajdj.length; zajdm++) {
                        zajde[zajdj[zajdm]]--;
                        if (zajde[zajdj[zajdm]] === 0) zajdl(zajdh[zajdj[zajdm]]);
                    }
                    if (zajdk === zajdi) zajdc(zajdd);
                }).catch(zajdj);
            };
            for (var zajdm = 0; zajdm < zajdg.length; zajdm++) zajdl(zajdg[zajdm]);
        });
    }
    terminate() {
        this._terminated = true;
        var zajda = TaskPool.instances;
        var zajdb = zajda.indexOf(this);
        if (zajdb !== -1) zajda.splice(zajdb, 1);
        for (var zajdc = 0; zajdc < this._workers.length; zajdc++) this._workers[zajdc].terminate();
        this._workers = [];
        this._idle = [];
        this.stats.workers = 0;
        if (this._blobUrl) {
            try {
                URL.revokeObjectURL(this._blobUrl);
            } catch (zajda) {}
            this._blobUrl = null;
        }
        return this;
    }
}

export { TaskPool };

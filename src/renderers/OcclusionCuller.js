class OcclusionCuller {
    constructor(renderer) { this.renderer = renderer; this.queries = []; this.results = typeof WeakMap !== "undefined" ? new WeakMap() : null; this.enabled = false; this.minObjects = 128; this.maxQueriesPerFrame = 256; this.interval = 3; this.frame = 0; this.queriesThisFrame = 0; }
    shouldRender(object) { if (!this.enabled || !this.results) return true; var value = this.results.get(object); return value === undefined ? true : !value; }
    beginFrame() { this.frame++; this.queriesThisFrame = 0; return this; }
    test(object, drawBounds) { var gl = this.renderer.gl; if (!this.enabled || !gl || !this.renderer.isWebGL2 || !gl.createQuery || this.frame % this.interval !== 0 || this.queriesThisFrame >= this.maxQueriesPerFrame) return true; this.queriesThisFrame++; var query = gl.createQuery(); gl.beginQuery(gl.ANY_SAMPLES_PASSED, query); if (drawBounds) drawBounds(); gl.endQuery(gl.ANY_SAMPLES_PASSED); this.queries.push({ object: object, query: query }); return true; }
    update() { var gl = this.renderer.gl; if (!gl || !this.renderer.isWebGL2) return; for (var i = this.queries.length - 1; i >= 0; i--) { var item = this.queries[i]; if (!gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)) continue; var result = !!gl.getQueryParameter(item.query, gl.QUERY_RESULT); if (this.results) this.results.set(item.object, !result); if (gl.deleteQuery) gl.deleteQuery(item.query); this.queries.splice(i, 1); } }
    clear() { var gl = this.renderer.gl; for (var i = 0; i < this.queries.length; i++) if (gl && gl.deleteQuery) gl.deleteQuery(this.queries[i].query); this.queries = []; this.results = typeof WeakMap !== "undefined" ? new WeakMap() : null; return this; }
}

export { OcclusionCuller };

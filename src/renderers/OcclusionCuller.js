class OcclusionCuller {
    constructor(zatla) {
        this.renderer = zatla;
        this.queries = [];
        this.results = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.enabled = false;
        this.minObjects = 128;
        this.maxQueriesPerFrame = 256;
        this.interval = 3;
        this.frame = 0;
        this.queriesThisFrame = 0;
    }
    shouldRender(zatla) {
        if (!this.enabled || !this.results) return true;
        var zatlb = this.results.get(zatla);
        return zatlb === undefined ? true : !zatlb;
    }
    beginFrame() {
        this.frame++;
        this.queriesThisFrame = 0;
        return this;
    }
    test(zatla, zatlb) {
        var zatlc = this.renderer.gl;
        if (!this.enabled || !zatlc || !this.renderer.isWebGL2 || !zatlc.createQuery || this.frame % this.interval !== 0 || this.queriesThisFrame >= this.maxQueriesPerFrame) return true;
        this.queriesThisFrame++;
        var zatld = zatlc.createQuery();
        zatlc.beginQuery(zatlc.ANY_SAMPLES_PASSED, zatld);
        if (zatlb) zatlb();
        zatlc.endQuery(zatlc.ANY_SAMPLES_PASSED);
        this.queries.push({
            object: zatla,
            query: zatld
        });
        return true;
    }
    update() {
        var zatla = this.renderer.gl;
        if (!zatla || !this.renderer.isWebGL2) return;
        for (var zatlb = this.queries.length - 1; zatlb >= 0; zatlb--) {
            var zatlc = this.queries[zatlb];
            if (!zatla.getQueryParameter(zatlc.query, zatla.QUERY_RESULT_AVAILABLE)) continue;
            var zatld = !!zatla.getQueryParameter(zatlc.query, zatla.QUERY_RESULT);
            if (this.results) this.results.set(zatlc.object, !zatld);
            if (zatla.deleteQuery) zatla.deleteQuery(zatlc.query);
            this.queries.splice(zatlb, 1);
        }
    }
    clear() {
        var zatla = this.renderer.gl;
        for (var zatlb = 0; zatlb < this.queries.length; zatlb++) if (zatla && zatla.deleteQuery) zatla.deleteQuery(this.queries[zatlb].query);
        this.queries = [];
        this.results = typeof WeakMap !== "undefined" ? new WeakMap : null;
        return this;
    }
}

export { OcclusionCuller };

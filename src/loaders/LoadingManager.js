class LoadingManager {
    constructor(zamja, zamjb, zamjc) {
        this.onStart = null;
        this.onLoad = zamja || function() {};
        this.onProgress = zamjb || function() {};
        this.onError = zamjc || function() {};
        this.isLoading = false;
        this.itemsTotal = 0;
        this.itemsLoaded = 0;
    }
    itemStart(zamja) {
        this.itemsTotal++;
        this.isLoading = true;
        if (this.onStart) this.onStart(zamja, this.itemsLoaded, this.itemsTotal);
        return this;
    }
    itemEnd(zamja) {
        this.itemsLoaded++;
        this.onProgress(zamja, this.itemsLoaded, this.itemsTotal);
        if (this.itemsLoaded >= this.itemsTotal) {
            this.isLoading = false;
            this.onLoad();
        }
        return this;
    }
    itemError(zamja) {
        this.onError(zamja);
        return this;
    }
    resolveURL(zamja) {
        return zamja;
    }
}

export { LoadingManager };

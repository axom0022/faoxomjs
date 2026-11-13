class LoadingManager {
    constructor(onLoad, onProgress, onError) { this.onStart = null; this.onLoad = onLoad || function() {}; this.onProgress = onProgress || function() {}; this.onError = onError || function() {}; this.isLoading = false; this.itemsTotal = 0; this.itemsLoaded = 0; }
    itemStart(url) { this.itemsTotal++; this.isLoading = true; if (this.onStart) this.onStart(url, this.itemsLoaded, this.itemsTotal); return this; }
    itemEnd(url) { this.itemsLoaded++; this.onProgress(url, this.itemsLoaded, this.itemsTotal); if (this.itemsLoaded >= this.itemsTotal) { this.isLoading = false; this.onLoad(); } return this; }
    itemError(url) { this.onError(url); return this; }
    resolveURL(url) { return url; }
}

export { LoadingManager };

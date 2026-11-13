import { faoxomreadresponse } from "../core/index.js";
import { LoadingManager } from "./LoadingManager.js";

class FileLoader {
    constructor(manager) { this.manager = manager || new LoadingManager(); this.path = ""; this.responseType = "text"; this.withCredentials = false; this.requestHeader = {}; }
    setPath(path) { this.path = path || ""; return this; }
    setResponseType(type) { this.responseType = type; return this; }
    setRequestHeader(header) { this.requestHeader = Object.assign({}, header || {}); return this; }
    load(url, onLoad, onProgress, onError) { var manager = this.manager, full = this.path + this.manager.resolveURL(url); manager.itemStart(full); var promise = fetch(full, { headers: this.requestHeader }).then(function(response) { return faoxomreadresponse(response, this.responseType, onProgress ? function(loaded, total) { onProgress({ loaded: loaded, total: total, ratio: total ? loaded / total : 0, url: full }); } : null); }.bind(this)).then(function(data) { manager.itemEnd(full); if (onLoad) onLoad(data); return data; }).catch(function(error) { manager.itemError(full); if (onError) onError(error); throw error; }); return promise; }
}

export { FileLoader };

import { faoxomreadresponse } from "../core/index.js";

import { LoadingManager } from "./LoadingManager.js";

class FileLoader {
    constructor(zamba) {
        this.manager = zamba || new LoadingManager;
        this.path = "";
        this.responseType = "text";
        this.withCredentials = false;
        this.requestHeader = {};
    }
    setPath(zamba) {
        this.path = zamba || "";
        return this;
    }
    setResponseType(zamba) {
        this.responseType = zamba;
        return this;
    }
    setRequestHeader(zamba) {
        this.requestHeader = Object.assign({}, zamba || {});
        return this;
    }
    load(zamba, zambb, zambc, zambd) {
        var zambe = this.manager, zambf = this.path + this.manager.resolveURL(zamba);
        zambe.itemStart(zambf);
        var zambg = fetch(zambf, {
            headers: this.requestHeader
        }).then(function(zamba) {
            return faoxomreadresponse(zamba, this.responseType, zambc ? function(zamba, zambb) {
                zambc({
                    loaded: zamba,
                    total: zambb,
                    ratio: zambb ? zamba / zambb : 0,
                    url: zambf
                });
            } : null);
        }.bind(this)).then(function(zamba) {
            zambe.itemEnd(zambf);
            if (zambb) zambb(zamba);
            return zamba;
        }).catch(function(zamba) {
            zambe.itemError(zambf);
            if (zambd) zambd(zamba);
            throw zamba;
        });
        return zambg;
    }
}

export { FileLoader };

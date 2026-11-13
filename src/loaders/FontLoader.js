import { Font } from "./Font.js";

class FontLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        fetch(url).then(function(response) {
            if (!response.ok) throw new Error("fetch failed: " + url);
            return response.text();
        }).then(function(text) {
            try {
                var font = self.parse(JSON.parse(text));
                if (onLoad) onLoad(font);
            } catch (e) {
                if (onError) onError(e);
            }
        }, function(error) {
            if (onError) onError(error);
        });
        return this;
    }
    parse(json) {
        if (typeof json === "string") json = JSON.parse(json);
        return new Font(json);
    }
}

export { FontLoader };

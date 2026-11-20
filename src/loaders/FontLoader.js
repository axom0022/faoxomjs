import { Font } from "./Font.js";

class FontLoader {
    constructor(zamda) {
        this.manager = zamda;
    }
    load(zamda, zamdb, zamdc, zamdd) {
        var zamde = this;
        fetch(zamda).then(function(zamdb) {
            if (!zamdb.ok) throw new Error("fetch failed: " + zamda);
            return zamdb.text();
        }).then(function(zamda) {
            try {
                var zamdc = zamde.parse(JSON.parse(zamda));
                if (zamdb) zamdb(zamdc);
            } catch (zamda) {
                if (zamdd) zamdd(zamda);
            }
        }, function(zamda) {
            if (zamdd) zamdd(zamda);
        });
        return this;
    }
    parse(zamda) {
        if (typeof zamda === "string") zamda = JSON.parse(zamda);
        return new Font(zamda);
    }
}

export { FontLoader };

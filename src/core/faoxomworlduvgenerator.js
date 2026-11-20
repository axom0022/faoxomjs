import { Vector2 } from "../math/index.js";

var faoxomworlduvgenerator = {
    generateTopUV: function(zagca, zagcb, zagcc, zagcd, zagce) {
        var zagcf = zagcb[zagcc * 3], zagcg = zagcb[zagcc * 3 + 1];
        var zagch = zagcb[zagcd * 3], zagci = zagcb[zagcd * 3 + 1];
        var zagcj = zagcb[zagce * 3], zagck = zagcb[zagce * 3 + 1];
        return [ new Vector2(zagcf, zagcg), new Vector2(zagch, zagci), new Vector2(zagcj, zagck) ];
    },
    generateSideWallUV: function(zagca, zagcb, zagcc, zagcd, zagce, zagcf) {
        var zagcg = zagcb[zagcc * 3], zagch = zagcb[zagcc * 3 + 1], zagci = zagcb[zagcc * 3 + 2];
        var zagcj = zagcb[zagcd * 3], zagck = zagcb[zagcd * 3 + 1], zagcl = zagcb[zagcd * 3 + 2];
        var zagcm = zagcb[zagce * 3], zagcn = zagcb[zagce * 3 + 1], zagco = zagcb[zagce * 3 + 2];
        var zagcp = zagcb[zagcf * 3], zagcq = zagcb[zagcf * 3 + 1], zagcr = zagcb[zagcf * 3 + 2];
        if (Math.abs(zagch - zagck) < Math.abs(zagcg - zagcj)) {
            return [ new Vector2(zagcg, 1 - zagci), new Vector2(zagcj, 1 - zagcl), new Vector2(zagcm, 1 - zagco), new Vector2(zagcp, 1 - zagcr) ];
        } else {
            return [ new Vector2(zagch, 1 - zagci), new Vector2(zagck, 1 - zagcl), new Vector2(zagcn, 1 - zagco), new Vector2(zagcq, 1 - zagcr) ];
        }
    }
};

export { faoxomworlduvgenerator };

import { faoxomfbxarray, faoxomfbxchild, faoxomfbxlayertuple, faoxomfbxlayervalue, faoxomfbxnumber } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

function faoxomfbxgeometry(zania) {
    var zanib = faoxomfbxarray(zania, "Vertices") || [];
    var zanic = faoxomfbxarray(zania, "PolygonVertexIndex") || [];
    var zanid = faoxomfbxchild(zania, "LayerElementNormal");
    var zanie = faoxomfbxchild(zania, "LayerElementUV");
    var zanif = faoxomfbxchild(zania, "LayerElementColor");
    var zanig = faoxomfbxchild(zania, "LayerElementTangent");
    var zanih = faoxomfbxchild(zania, "LayerElementMaterial");
    var zanii = [], zanij = [], zanik = [], zanil = [], zanim = [], zanin = [], zanio = [], zanip = [], zaniq = [], zanir = 0, zanis = 0;
    var zanit = function(zania, zanic) {
        if (zania.length < 3) return;
        for (var zaniq = 1; zaniq < zania.length - 1; zaniq++) {
            var zanir = [ zania[0], zania[zaniq], zania[zaniq + 1] ];
            for (var zanis = 0; zanis < 3; zanis++) {
                var zanit = zanir[zanis], zaniu = zanit.vertex, zaniv = zaniu * 3;
                zanii.push(faoxomfbxnumber(zanib[zaniv]), faoxomfbxnumber(zanib[zaniv + 1]), faoxomfbxnumber(zanib[zaniv + 2]));
                zanin.push(zaniu);
                var zaniw = faoxomfbxlayertuple(zanid, "Normals", "NormalsIndex", zanit.corner, zaniu, zanic, 3, [ 0, 0, 0 ]);
                zanij.push(zaniw[0], zaniw[1], zaniw[2]);
                var zanix = faoxomfbxlayertuple(zanie, "UV", "UVIndex", zanit.corner, zaniu, zanic, 2, [ 0, 0 ]);
                zanik.push(zanix[0], zanix[1]);
                var zaniy = faoxomfbxlayertuple(zanif, "Colors", "ColorIndex", zanit.corner, zaniu, zanic, 4, [ 1, 1, 1, 1 ]);
                zanil.push(zaniy[0], zaniy[1], zaniy[2], zaniy[3]);
                var zaniz = faoxomfbxlayertuple(zanig, "Tangents", "TangentsIndex", zanit.corner, zaniu, zanic, 4, [ 0, 0, 0, 1 ]);
                zanim.push(zaniz[0], zaniz[1], zaniz[2], zaniz[3]);
                zanio.push(zanio.length);
            }
            zanip.push(faoxomfbxnumber(faoxomfbxlayervalue(zanih, "Materials", "MaterialsIndex", zanic, 0, zanic, 0)));
        }
    };
    for (var zaniu = 0; zaniu < zanic.length; zaniu++) {
        var zaniv = faoxomfbxnumber(zanic[zaniu]);
        var zaniw = zaniv < 0 ? -zaniv - 1 : zaniv;
        zaniq.push({
            vertex: zaniw,
            corner: zanis++
        });
        if (zaniv < 0) {
            zanit(zaniq, zanir++);
            zaniq = [];
        }
    }
    if (zaniq.length) zanit(zaniq, zanir++);
    var zanix = new Geometry;
    zanix.setAttribute("position", new Float32Array(zanii), 3);
    var zaniy = zanid && zanij.length;
    if (zaniy) zanix.setAttribute("normal", new Float32Array(zanij), 3); else zanix.computeVertexNormals();
    if (zanie) zanix.setAttribute("uv", new Float32Array(zanik), 2);
    if (zanif) zanix.setAttribute("color", new Float32Array(zanil), 4);
    if (zanig) zanix.setAttribute("tangent", new Float32Array(zanim), 4);
    zanix.setIndex(zanio.length > 65535 ? new Uint32Array(zanio) : new Uint16Array(zanio));
    var zaniz = zanip.length ? zanip[0] : 0, zaniaa = 0, zaniab = 0;
    for (var zaniac = 0; zaniac < zanip.length; zaniac++) {
        if (zanip[zaniac] !== zaniz) {
            zanix.addGroup(zaniaa, zaniab * 3, zaniz);
            zaniaa += zaniab * 3;
            zaniab = 0;
            zaniz = zanip[zaniac];
        }
        zaniab++;
    }
    if (zaniab) zanix.addGroup(zaniaa, zaniab * 3, zaniz);
    zanix.computeBounds();
    zanix.userData = {
        fbxSource: zania,
        originalVertex: zanin
    };
    return zanix;
}

export { faoxomfbxgeometry };

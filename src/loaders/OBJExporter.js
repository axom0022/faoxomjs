import { Mesh } from "../objects/index.js";

class OBJExporter {
    parse(zamoa) {
        var zamob = "# FaoxomJS OBJExporter\n";
        var zamoc = 0;
        zamoa.traverse(function(zamoa) {
            if (zamoa instanceof Mesh && zamoa.geometry && zamoa.geometry.attributes.position) {
                var zamod = zamoa.geometry.attributes.position.array;
                var zamoe = zamoa.geometry.attributes.normal ? zamoa.geometry.attributes.normal.array : null;
                var zamof = zamoa.geometry.attributes.uv ? zamoa.geometry.attributes.uv.array : null;
                var zamog = zamoa.geometry.index;
                zamob += "o " + (zamoa.name || "Mesh_" + zamoa.id) + "\n";
                for (var zamoh = 0; zamoh < zamod.length; zamoh += 3) zamob += "v " + zamod[zamoh].toFixed(4) + " " + zamod[zamoh + 1].toFixed(4) + " " + zamod[zamoh + 2].toFixed(4) + "\n";
                if (zamoe) for (var zamoi = 0; zamoi < zamoe.length; zamoi += 3) zamob += "vn " + zamoe[zamoi].toFixed(4) + " " + zamoe[zamoi + 1].toFixed(4) + " " + zamoe[zamoi + 2].toFixed(4) + "\n";
                if (zamof) for (var zamoj = 0; zamoj < zamof.length; zamoj += 2) zamob += "vt " + zamof[zamoj].toFixed(4) + " " + zamof[zamoj + 1].toFixed(4) + "\n";
                if (zamog) {
                    for (var zamok = 0; zamok < zamog.length; zamok += 3) {
                        var zamol = zamog[zamok] + 1 + zamoc, zamom = zamog[zamok + 1] + 1 + zamoc, zamon = zamog[zamok + 2] + 1 + zamoc;
                        zamob += "f " + zamol + " " + zamom + " " + zamon + "\n";
                    }
                } else {
                    for (var zamoo = 0; zamoo < zamod.length / 3; zamoo += 3) {
                        var zamop = zamoo + 1 + zamoc, zamoq = zamoo + 2 + zamoc, zamor = zamoo + 3 + zamoc;
                        zamob += "f " + zamop + " " + zamoq + " " + zamor + "\n";
                    }
                }
                zamoc += zamod.length / 3;
            }
        });
        return zamob;
    }
}

export { OBJExporter };

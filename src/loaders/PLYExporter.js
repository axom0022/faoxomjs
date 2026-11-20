import { Mesh } from "../objects/index.js";

class PLYExporter {
    parse(zamqa, zamqb) {
        var zamqc = [], zamqd = [];
        var zamqe = 0;
        zamqa.traverse(function(zamqa) {
            if (zamqa instanceof Mesh && zamqa.geometry && zamqa.geometry.attributes.position) {
                var zamqb = zamqa.geometry.attributes.position.array;
                var zamqf = zamqa.geometry.index;
                for (var zamqg = 0; zamqg < zamqb.length; zamqg += 3) zamqc.push(zamqb[zamqg], zamqb[zamqg + 1], zamqb[zamqg + 2]);
                if (zamqf) for (var zamqh = 0; zamqh < zamqf.length; zamqh++) zamqd.push(zamqf[zamqh] + zamqe);
                zamqe += zamqb.length / 3;
            }
        });
        var zamqf = "ply\nformat ascii 1.0\n";
        zamqf += "element vertex " + zamqc.length / 3 + "\n";
        zamqf += "property float x\nproperty float y\nproperty float z\n";
        zamqf += "element face " + zamqd.length / 3 + "\n";
        zamqf += "property list uchar int vertex_indices\nend_header\n";
        for (var zamqg = 0; zamqg < zamqc.length; zamqg += 3) zamqf += zamqc[zamqg].toFixed(4) + " " + zamqc[zamqg + 1].toFixed(4) + " " + zamqc[zamqg + 2].toFixed(4) + "\n";
        for (var zamqh = 0; zamqh < zamqd.length; zamqh += 3) zamqf += "3 " + zamqd[zamqh] + " " + zamqd[zamqh + 1] + " " + zamqd[zamqh + 2] + "\n";
        return zamqf;
    }
}

export { PLYExporter };

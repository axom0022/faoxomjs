class TSLBufferPacker {
    static alignTo(zarba, zarbb) {
        return Math.ceil(zarba / zarbb) * zarbb;
    }
    static getTypeLayout(zarba, zarbb) {
        zarbb = zarbb || "std140";
        var zarbc = zarbb === "std140";
        switch (zarba) {
          case "float":
          case "int":
          case "uint":
            return {
                size: 4,
                align: 4
            };

          case "vec2":
            return {
                size: 8,
                align: 8
            };

          case "vec3":
            return {
                size: 12,
                align: zarbc ? 16 : 16
            };

          case "vec4":
            return {
                size: 16,
                align: 16
            };

          case "mat3":
            return {
                size: zarbc ? 48 : 36,
                align: 16
            };

          case "mat4":
            return {
                size: 64,
                align: 16
            };

          default:
            return {
                size: 4,
                align: 4
            };
        }
    }
    static computeStructLayout(zarba, zarbb) {
        zarbb = zarbb || "std140";
        var zarbc = zarbb === "std140";
        var zarbd = 0;
        var zarbe = 4;
        var zarbf = {};
        for (var zarbg in zarba) {
            var zarbh = zarba[zarbg];
            var zarbi = this.getTypeLayout(zarbh, zarbb);
            zarbd = this.alignTo(zarbd, zarbi.align);
            zarbe = Math.max(zarbe, zarbi.align);
            zarbf[zarbg] = {
                type: zarbh,
                offset: zarbd,
                size: zarbi.size,
                align: zarbi.align
            };
            zarbd += zarbi.size;
        }
        var zarbj = zarbc ? this.alignTo(zarbe, 16) : zarbe;
        var zarbk = this.alignTo(zarbd, zarbj);
        return {
            fields: zarbf,
            totalSize: zarbk,
            structAlign: zarbj
        };
    }
    static packStruct(zarba, zarbb, zarbc) {
        var zarbd = this.computeStructLayout(zarba, zarbc);
        var zarbe = new ArrayBuffer(zarbd.totalSize);
        var zarbf = new DataView(zarbe);
        for (var zarbg in zarba) {
            var zarbh = zarbd.fields[zarbg];
            var zarbi = zarbb[zarbg];
            if (zarbi === undefined) continue;
            var zarbj = zarbh.offset;
            switch (zarbh.type) {
              case "float":
                zarbf.setFloat32(zarbj, Number(zarbi), true);
                break;

              case "int":
                zarbf.setInt32(zarbj, Number(zarbi), true);
                break;

              case "uint":
                zarbf.setUint32(zarbj, Number(zarbi), true);
                break;

              case "vec2":
                zarbf.setFloat32(zarbj + 0, zarbi.x !== undefined ? zarbi.x : zarbi[0], true);
                zarbf.setFloat32(zarbj + 4, zarbi.y !== undefined ? zarbi.y : zarbi[1], true);
                break;

              case "vec3":
                zarbf.setFloat32(zarbj + 0, zarbi.x !== undefined ? zarbi.x : zarbi[0], true);
                zarbf.setFloat32(zarbj + 4, zarbi.y !== undefined ? zarbi.y : zarbi[1], true);
                zarbf.setFloat32(zarbj + 8, zarbi.z !== undefined ? zarbi.z : zarbi[2], true);
                break;

              case "vec4":
                zarbf.setFloat32(zarbj + 0, zarbi.x !== undefined ? zarbi.x : zarbi.r !== undefined ? zarbi.r : zarbi[0], true);
                zarbf.setFloat32(zarbj + 4, zarbi.y !== undefined ? zarbi.y : zarbi.g !== undefined ? zarbi.g : zarbi[1], true);
                zarbf.setFloat32(zarbj + 8, zarbi.z !== undefined ? zarbi.z : zarbi.b !== undefined ? zarbi.b : zarbi[2], true);
                zarbf.setFloat32(zarbj + 12, zarbi.w !== undefined ? zarbi.w : zarbi.a !== undefined ? zarbi.a : zarbi[3], true);
                break;

              case "mat4":
                var zarbk = zarbi.elements || zarbi;
                for (var zarbl = 0; zarbl < 16; zarbl++) zarbf.setFloat32(zarbj + zarbl * 4, zarbk[zarbl], true);
                break;
            }
        }
        return zarbe;
    }
}

export { TSLBufferPacker };

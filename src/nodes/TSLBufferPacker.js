class TSLBufferPacker {
    static alignTo(offset, alignment) {
        return Math.ceil(offset / alignment) * alignment;
    }
    static getTypeLayout(type, standard) {
        standard = standard || "std140";
        var isStd140 = standard === "std140";
        switch (type) {
            case "float": case "int": case "uint": return { size: 4, align: 4 };
            case "vec2": return { size: 8, align: 8 };
            case "vec3": return { size: 12, align: isStd140 ? 16 : 16 };
            case "vec4": return { size: 16, align: 16 };
            case "mat3": return { size: isStd140 ? 48 : 36, align: 16 };
            case "mat4": return { size: 64, align: 16 };
            default: return { size: 4, align: 4 };
        }
    }
    static computeStructLayout(fields, standard) {
        standard = standard || "std140";
        var isStd140 = standard === "std140";
        var offset = 0;
        var maxAlign = 4;
        var layout = {};
        for (var name in fields) {
            var fieldType = fields[name];
            var typeInfo = this.getTypeLayout(fieldType, standard);
            offset = this.alignTo(offset, typeInfo.align);
            maxAlign = Math.max(maxAlign, typeInfo.align);
            layout[name] = { type: fieldType, offset: offset, size: typeInfo.size, align: typeInfo.align };
            offset += typeInfo.size;
        }
        var structAlign = isStd140 ? this.alignTo(maxAlign, 16) : maxAlign;
        var totalSize = this.alignTo(offset, structAlign);
        return { fields: layout, totalSize: totalSize, structAlign: structAlign };
    }
    static packStruct(fields, values, standard) {
        var layout = this.computeStructLayout(fields, standard);
        var buffer = new ArrayBuffer(layout.totalSize);
        var view = new DataView(buffer);
        for (var name in fields) {
            var info = layout.fields[name];
            var val = values[name];
            if (val === undefined) continue;
            var off = info.offset;
            switch (info.type) {
                case "float": view.setFloat32(off, Number(val), true); break;
                case "int": view.setInt32(off, Number(val), true); break;
                case "uint": view.setUint32(off, Number(val), true); break;
                case "vec2":
                    view.setFloat32(off + 0, val.x !== undefined ? val.x : val[0], true);
                    view.setFloat32(off + 4, val.y !== undefined ? val.y : val[1], true);
                    break;
                case "vec3":
                    view.setFloat32(off + 0, val.x !== undefined ? val.x : val[0], true);
                    view.setFloat32(off + 4, val.y !== undefined ? val.y : val[1], true);
                    view.setFloat32(off + 8, val.z !== undefined ? val.z : val[2], true);
                    break;
                case "vec4":
                    view.setFloat32(off + 0, val.x !== undefined ? val.x : (val.r !== undefined ? val.r : val[0]), true);
                    view.setFloat32(off + 4, val.y !== undefined ? val.y : (val.g !== undefined ? val.g : val[1]), true);
                    view.setFloat32(off + 8, val.z !== undefined ? val.z : (val.b !== undefined ? val.b : val[2]), true);
                    view.setFloat32(off + 12, val.w !== undefined ? val.w : (val.a !== undefined ? val.a : val[3]), true);
                    break;
                case "mat4":
                    var elements = val.elements || val;
                    for (var m = 0; m < 16; m++) view.setFloat32(off + m * 4, elements[m], true);
                    break;
            }
        }
        return buffer;
    }
}

export { TSLBufferPacker };

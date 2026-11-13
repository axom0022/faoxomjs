function faoxomplytypesize(type) { return type === "char" || type === "uchar" || type === "int8" || type === "uint8" ? 1 : type === "short" || type === "ushort" || type === "int16" || type === "uint16" ? 2 : type === "int" || type === "uint" || type === "float" || type === "int32" || type === "uint32" || type === "float32" ? 4 : type === "double" || type === "float64" ? 8 : 0; }

export { faoxomplytypesize };

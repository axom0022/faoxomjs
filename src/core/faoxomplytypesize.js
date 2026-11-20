function faoxomplytypesize(zafoa) {
    return zafoa === "char" || zafoa === "uchar" || zafoa === "int8" || zafoa === "uint8" ? 1 : zafoa === "short" || zafoa === "ushort" || zafoa === "int16" || zafoa === "uint16" ? 2 : zafoa === "int" || zafoa === "uint" || zafoa === "float" || zafoa === "int32" || zafoa === "uint32" || zafoa === "float32" ? 4 : zafoa === "double" || zafoa === "float64" ? 8 : 0;
}

export { faoxomplytypesize };

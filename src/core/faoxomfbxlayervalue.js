import { faoxomfbxarray } from "./faoxomfbxarray.js";
import { faoxomfbxchild } from "./faoxomfbxchild.js";
import { faoxomfbxnumber } from "./faoxomfbxnumber.js";

function faoxomfbxlayervalue(layer, arrayName, indexName, mappingIndex, vertexIndex, polygonIndex, defaultValue) { if (!layer) return defaultValue; var mapping = String(faoxomfbxchild(layer, "MappingInformationType") ? faoxomfbxchild(layer, "MappingInformationType").properties[0] : "ByPolygonVertex"); var reference = String(faoxomfbxchild(layer, "ReferenceInformationType") ? faoxomfbxchild(layer, "ReferenceInformationType").properties[0] : "Direct"); var direct = faoxomfbxarray(layer, arrayName) || []; var indices = faoxomfbxarray(layer, indexName) || []; var sourceIndex = mapping === "ByVertice" || mapping === "ByVertex" ? vertexIndex : mapping === "ByPolygon" ? polygonIndex : mapping === "AllSame" ? 0 : mappingIndex; if (reference === "IndexToDirect") sourceIndex = faoxomfbxnumber(indices[sourceIndex]); return direct.length ? sourceIndex : defaultValue; }

export { faoxomfbxlayervalue };

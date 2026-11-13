import { faoxomfbxchild } from "./faoxomfbxchild.js";

function faoxomfbxarray(node, name) { var child = faoxomfbxchild(node, name); if (!child || !child.properties.length) return []; var value = child.properties[0]; return value && value.type && value.value !== null ? value.value : value; }

export { faoxomfbxarray };

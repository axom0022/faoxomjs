import { faoxomfbxdecodearray } from "./faoxomfbxdecodearray.js";

async function faoxomfbxresolvenode(node, view, buffer) { for (var i = 0; i < node.properties.length; i++) if (node.properties[i] && node.properties[i].type && node.properties[i].value === null) node.properties[i].value = await faoxomfbxdecodearray(node.properties[i], view, buffer); for (var childIndex = 0; childIndex < node.children.length; childIndex++) await faoxomfbxresolvenode(node.children[childIndex], view, buffer); return node; }

export { faoxomfbxresolvenode };

import { faoxomfbxdecodearray } from "./faoxomfbxdecodearray.js";

async function faoxomfbxresolvenode(zaeua, zaeub, zaeuc) {
    for (var zaeud = 0; zaeud < zaeua.properties.length; zaeud++) if (zaeua.properties[zaeud] && zaeua.properties[zaeud].type && zaeua.properties[zaeud].value === null) zaeua.properties[zaeud].value = await faoxomfbxdecodearray(zaeua.properties[zaeud], zaeub, zaeuc);
    for (var zaeue = 0; zaeue < zaeua.children.length; zaeue++) await faoxomfbxresolvenode(zaeua.children[zaeue], zaeub, zaeuc);
    return zaeua;
}

export { faoxomfbxresolvenode };

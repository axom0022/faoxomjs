function faoxomresolve(target, path) { var parts = path.split("."); var object = target; for (var i = 0; i < parts.length - 1; i++) { if (!object) break; if (object[parts[i]] !== undefined) object = object[parts[i]]; else if (object.getObjectByName) object = object.getObjectByName(parts[i]); else object = null; } return { object: object, key: parts[parts.length - 1] }; }

export { faoxomresolve };

function faoxomfbxchildren(node, name) { var output = []; if (!node) return output; for (var i = 0; i < node.children.length; i++) if (!name || node.children[i].name === name) output.push(node.children[i]); return output; }

export { faoxomfbxchildren };

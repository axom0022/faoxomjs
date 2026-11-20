const installed = {};

function normalizePlugin(plugin) {
    if (!plugin) return null;
    if (typeof plugin === "function") return { name: plugin.name || "plugin", install: plugin };
    if (typeof plugin.install !== "function") return null;
    return { name: plugin.name || plugin.id || plugin.install.name || "plugin", install: plugin.install, version: plugin.version || null };
}

function registerPlugin(plugin) {
    var entry = normalizePlugin(plugin);
    if (!entry) throw new Error("faoxomplugin: a plugin needs a name and an install function");
    if (installed[entry.name]) return installed[entry.name];
    installed[entry.name] = entry;
    return entry;
}

function unregisterPlugin(name) {
    if (!installed[name]) return false;
    delete installed[name];
    return true;
}

function pluginNames() {
    return Object.keys(installed);
}

function pluginCount() {
    return Object.keys(installed).length;
}

function getPlugin(name) {
    return installed[name] || null;
}

function applyPlugins(target) {
    var names = pluginNames();
    var applied = [];
    for (var index = 0; index < names.length; index++) {
        var plugin = installed[names[index]];
        plugin.install(target);
        applied.push(plugin.name);
    }
    return applied;
}

function resetPlugins() {
    var names = pluginNames();
    for (var index = 0; index < names.length; index++) delete installed[names[index]];
    return names;
}

export { applyPlugins, getPlugin, pluginCount, pluginNames, registerPlugin, resetPlugins, unregisterPlugin };

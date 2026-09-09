// plugins/_loader.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../lib/myfunc'); // adjust if your logger is elsewhere

function loadPlugins() {
    const pluginDir = __dirname;
    const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js') && f !== '_loader.js');

    if (!global.pluginCommands) global.pluginCommands = [];

    for (const file of files) {
        try {
            const plugin = require(path.join(pluginDir, file));
            if (plugin.name && typeof plugin.run === 'function') {
                global.pluginCommands = global.pluginCommands.filter(cmd => cmd.name !== plugin.name);
                global.pluginCommands.push(plugin);
                logger.info(`[Plugin] Loaded: ${plugin.name}`);
            } else {
                logger.warn(`[Plugin] Skipped ${file}: missing "name" or "run"`);
            }
        } catch (e) {
            logger.error(`[Plugin] Error loading ${file}:`, e);
        }
    }
    return global.pluginCommands;
}

loadPlugins();
module.exports = { loadPlugins };

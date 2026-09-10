const fs = require('fs');
const path = require('path');

let commandCache = null;
let lastCacheTime = 0;

function getAllCommands() {
    // Cache for 5 seconds to optimize performance
    const now = Date.now();
    if (commandCache && (now - lastCacheTime < 5000)) {
        return commandCache;
    }

    const commandsDir = path.join(__dirname, '../commands');
    const commandMap = new Map();

    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const name = path.basename(file, '.js');
            try {
                const mod = require(path.join(commandsDir, file));
                const fn = typeof mod === 'function' ? mod : (mod.run || mod[name + 'Command'] || Object.values(mod).find(v => typeof v === 'function'));
                if (fn) {
                    commandMap.set(name, { name, fn, category: mod.category || 'general' });
                }
            } catch (e) {
                // Ignore individual file load errors
            }
        }
    }

    // Explicit command aliases
    const aliases = {
        'menu': 'help',
        'bot': 'help',
        'list': 'help',
        's': 'sticker',
        'del': 'delete'
    };

    for (const [alias, target] of Object.entries(aliases)) {
        if (commandMap.has(target) && !commandMap.has(alias)) {
            const targetCmd = commandMap.get(target);
            commandMap.set(alias, { name: alias, fn: targetCmd.fn, category: targetCmd.category });
        }
    }

    const all = Array.from(commandMap.values());

    // Merge with plugin commands
    const pluginCommands = global.pluginCommands || [];
    for (const p of pluginCommands) {
        if (!all.find(c => c.name === p.name)) {
            all.push({ name: p.name, fn: p.run, isPlugin: true, category: p.category || 'plugin' });
        }
    }

    commandCache = all;
    lastCacheTime = now;
    return all;
}

function findCommand(name) {
    const all = getAllCommands();
    return all.find(c => c.name === name);
}

module.exports = {
    getAllCommands,
    findCommand
};

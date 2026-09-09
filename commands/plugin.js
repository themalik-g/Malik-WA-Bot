// commands/plugin.js
const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const { ownerNumber } = require('../settings'); // use your owner check
const { loadPlugins } = require('../plugins/_loader');

module.exports = {
    name: 'plugin',
    category: 'owner',
    desc: 'Install a plugin from a raw GitHub/Gist URL (owner only)',
    ownerOnly: true,   // add this if your handler respects ownerOnly
    async run(m, sock, args) {
        if (!args.length) {
            return await sock.sendMessage(m.chat, { text: '📎 Usage: .Plugin <raw_url>' });
        }
        const url = args[0];
        // Security: only raw GitHub/Gist
        const allowed = /^https?:\/\/raw\.(githubusercontent\.com|github\.com\/[^\/]+\/[^\/]+\/raw)\//;
        const gist = /^https?:\/\/gist\.github\.com\/[^\/]+\/[a-f0-9]+\/raw\//;
        if (!allowed.test(url) && !gist.test(url)) {
            return await sock.sendMessage(m.chat, { text: '⚠️ Only raw GitHub or Gist URLs are allowed.' });
        }

        const filename = url.split('/').pop().replace(/[^a-zA-Z0-9_.-]/g, '');
        if (!filename.endsWith('.js')) {
            return await sock.sendMessage(m.chat, { text: '❌ File must be .js' });
        }

        const pluginPath = path.join(__dirname, '../plugins', filename);
        if (fs.existsSync(pluginPath)) {
            return await sock.sendMessage(m.chat, { text: `⚠️ Plugin "${filename}" already exists.` });
        }

        await sock.sendMessage(m.chat, { text: `⏳ Downloading ...` });
        try {
            const content = await downloadFile(url);
            fs.writeFileSync(pluginPath, content, 'utf-8');
            loadPlugins(); // reload plugin list
            await sock.sendMessage(m.chat, { text: `✅ Plugin **${filename}** installed and active.` });
        } catch (err) {
            await sock.sendMessage(m.chat, { text: `❌ Error: ${err.message}` });
        }
    }
};

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

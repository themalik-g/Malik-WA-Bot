const settings = require('../settings');
const fs = require('fs');
const path = require('path');

// Category order and display names
const categoryMap = {
    'general': { emoji: '🌐', title: 'ɢᴇɴᴇʀᴀʟ' },
    'admin':   { emoji: '👮‍♂️', title: 'ᴀᴅᴍɪɴ' },
    'owner':   { emoji: '🔒', title: 'ᴏᴡɴᴇʀ' },
    'image':   { emoji: '🎨', title: 'ɪᴍᴀɢᴇ / ꜱᴛɪᴄᴋᴇʀ' },
    'pies':    { emoji: '🖼️', title: 'ᴘɪᴇꜱ' },
    'game':    { emoji: '🎮', title: 'ɢᴀᴍᴇ' },
    'ai':      { emoji: '🤖', title: 'ᴀɪ' },
    'fun':     { emoji: '🎯', title: 'ꜰᴜɴ' },
    'textmaker': { emoji: '🔤', title: 'ᴛᴇXᴛᴍᴀᴋᴇʀ 🔢' },
    'downloader': { emoji: '📥', title: 'ᴅᴏᴡɴʟᴏᴀᴅᴇʀ' },
    'misc':    { emoji: '🧩', title: 'ᴍɪꜱᴄ' },
    'anime':   { emoji: '🖼️', title: 'ᴀɴɪᴍᴇ' },
    'github':  { emoji: '💻', title: 'ɢɪᴛʜᴜʙ' },
    'plugin':  { emoji: '📦', title: 'ᴘʟᴜɢɪɴꜱ' },  // for plugins
    'uncategorized': { emoji: '📎', title: 'ᴜɴᴄᴀᴛᴇɢᴏʀɪᴢᴇᴅ' }
};

async function helpCommand(sock, chatId, message) {
    let allCommands = [];
    try {
        const { getAllCommands } = require('../lib/commandLoader');
        allCommands = getAllCommands();
    } catch (e) {
        const builtIn = global.commands || [];
        const plugins = global.pluginCommands || [];
        allCommands = [...builtIn, ...plugins];
    }

    const plugins = global.pluginCommands || [];

    // Group by category
    const groups = {};
    for (const cmd of allCommands) {
        let cat = cmd.category || 'general';
        cat = cat.toLowerCase();
        if (!groups[cat]) groups[cat] = [];
        const isPlugin = cmd.isPlugin || plugins.some(p => p.name === cmd.name) ? ' 📦' : '';
        const ownerOnly = cmd.ownerOnly ? ' 🔒' : '';
        const desc = cmd.desc ? ` - ${cmd.desc}` : '';
        groups[cat].push(`◈ .${cmd.name}${isPlugin}${ownerOnly}${desc}`);
    }

    // Build the help text
    let helpMessage = `┌──────────────────┈⚝
   *🤖 ${settings.botName || 'MEHTAB-MD'}*
   Version: *${settings.version || '3.0.7'}*
   by ${settings.botOwner || 'MALIK MEHTAB'}
   YT : ${settings.botOwner || 'MALIK MEHTAB'}
└──────────────────┈⚝\n\n`;

    // Iterate in a defined order + any remaining categories
    const orderedCategories = ['general', 'admin', 'owner', 'image', 'pies', 'game', 'ai', 'fun', 'textmaker', 'downloader', 'misc', 'anime', 'github', 'plugin', 'uncategorized'];
    const allCategories = Array.from(new Set([...orderedCategories, ...Object.keys(groups)]));
    for (const cat of allCategories) {
        if (!groups[cat] || groups[cat].length === 0) continue;
        const info = categoryMap[cat] || { emoji: '📌', title: cat.toUpperCase() };
        helpMessage += `┌──❮ ${info.emoji} ${info.title} ❯\n│\n`;
        helpMessage += groups[cat].join('\n') + '\n│\n└───────────────┈⚝\n\n';
    }

    // Add plugin count footer
    helpMessage += `📦 *Plugins loaded:* ${plugins.length}\n`;
    helpMessage += `💡 *Use .plugin <raw_url> to install new plugins* (owner only)\n`;

    // Send with image if exists
    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409689492071@newsletter',
                        newsletterName: '𝙈𝘼𝙇𝙄𝙆 𝙈𝘿',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409689492071@newsletter',
                        newsletterName: '𝙈𝘼𝙇𝙄𝙆 𝙈𝘿 by @problem solved',
                        serverMessageId: -1
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;

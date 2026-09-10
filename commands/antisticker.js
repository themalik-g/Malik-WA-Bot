const { setAntiSticker, removeAntiSticker } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function antistickerCommand(sock, chatId, message, ...args) {
    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: '❌ This command is only for groups.' }, { quoted: message });
    const senderId = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) return sock.sendMessage(chatId, { text: '❌ Please make me an admin first.' }, { quoted: message });
    if (!isSenderAdmin) return sock.sendMessage(chatId, { text: '❌ Only group admins can use this.' }, { quoted: message });
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
        await setAntiSticker(chatId, true);
        await sock.sendMessage(chatId, { text: '✅ Anti‑sticker enabled. I will delete all stickers sent in this group.' }, { quoted: message });
    } else if (action === 'off') {
        await removeAntiSticker(chatId);
        await sock.sendMessage(chatId, { text: '✅ Anti‑sticker disabled.' }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: 'Usage: .antisticker on|off' }, { quoted: message });
    }
}

module.exports = antistickerCommand;

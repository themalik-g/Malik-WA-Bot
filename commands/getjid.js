async function getjidCommand(sock, chatId, message, ...args) {
    let number = args[0];
    if (!number) {
        return sock.sendMessage(chatId, { text: 'Usage: .getjid 923257853673' }, { quoted: message });
    }
    number = number.replace(/[^0-9]/g, '');
    if (number.length < 8) {
        return sock.sendMessage(chatId, { text: 'Invalid number. Use international format without + or spaces.' }, { quoted: message });
    }
    const jid = number + '@s.whatsapp.net';
    try {
        const [result] = await sock.onWhatsApp(jid);
        if (result?.exists) {
            await sock.sendMessage(chatId, { text: `📱 JID: ${result.jid}\n✅ Registered on WhatsApp` }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: `📱 JID: ${jid}\n⚠️ Not registered on WhatsApp (or number invalid)` }, { quoted: message });
        }
    } catch {
        await sock.sendMessage(chatId, { text: `📱 JID: ${jid}\n⚠️ Could not verify registration.` }, { quoted: message });
    }
}

module.exports = getjidCommand;

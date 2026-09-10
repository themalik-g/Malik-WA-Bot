const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, chatId, message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
        return sock.sendMessage(chatId, { text: '❌ Reply to a view‑once message with .vv' }, { quoted: message });
    }

    let mediaMsg = null;
    let msgType = null;
    if (quoted.viewOnceMessageV2) {
        mediaMsg = quoted.viewOnceMessageV2.message;
        msgType = 'viewOnceMessageV2';
    } else if (quoted.viewOnceMessageV3) {
        mediaMsg = quoted.viewOnceMessageV3.message;
        msgType = 'viewOnceMessageV3';
    } else if (quoted.viewOnceMessage) {
        mediaMsg = quoted.viewOnceMessage.message;
        msgType = 'viewOnceMessage';
    } else if (quoted.viewOnceMessageV2Extension) {
        mediaMsg = quoted.viewOnceMessageV2Extension.message;
        msgType = 'viewOnceMessageV2Extension';
    } else if (quoted.imageMessage?.viewOnce) {
        mediaMsg = quoted.imageMessage;
        msgType = 'imageMessage';
    } else if (quoted.videoMessage?.viewOnce) {
        mediaMsg = quoted.videoMessage;
        msgType = 'videoMessage';
    }

    if (!mediaMsg) {
        return sock.sendMessage(chatId, { text: '❌ Not a view‑once media.' }, { quoted: message });
    }

    try {
        const fakeMsg = {
            key: {
                remoteJid: chatId,
                id: message.key.id,
                participant: message.key.participant
            },
            message: msgType.startsWith('viewOnce')
                ? { [msgType]: { message: mediaMsg } }
                : { [msgType]: mediaMsg }
        };

        const buffer = await downloadMediaMessage(
            fakeMsg,
            'buffer',
            {}
        );

        if (!buffer) throw new Error('Download failed');

        let mimeType = 'document';
        let caption = '📸 View‑once media saved!';

        if (mediaMsg.imageMessage || msgType === 'imageMessage') {
            mimeType = 'image';
            const imgCap = (mediaMsg.imageMessage || mediaMsg).caption;
            if (imgCap) caption += `\n\n📝 Caption: ${imgCap}`;
        } else if (mediaMsg.videoMessage || msgType === 'videoMessage') {
            mimeType = 'video';
            const vidCap = (mediaMsg.videoMessage || mediaMsg).caption;
            if (vidCap) caption += `\n\n📝 Caption: ${vidCap}`;
        } else if (mediaMsg.audioMessage) {
            mimeType = 'audio';
        }

        if (mimeType === 'image') {
            await sock.sendMessage(chatId, { image: buffer, caption }, { quoted: message });
        } else if (mimeType === 'video') {
            await sock.sendMessage(chatId, { video: buffer, caption }, { quoted: message });
        } else if (mimeType === 'audio') {
            await sock.sendMessage(chatId, { audio: buffer, mimetype: mediaMsg.audioMessage?.mimetype || 'audio/mp4', ptt: false }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { document: buffer, mimetype: 'application/octet-stream', fileName: 'viewonce.bin', caption }, { quoted: message });
        }

    } catch (error) {
        console.error('ViewOnce error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to download view‑once media.'
        }, { quoted: message });
    }
}

module.exports = viewonceCommand;

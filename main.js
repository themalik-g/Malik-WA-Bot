// Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');

// Redirect temp storage
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');

const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { getAntiSticker } = require('./lib/index');

// ─── Import anti‑delete handlers ────────────────────────────
const { handleAntideleteCommand, handleMessageRevocation, storeMessage, handleMessageEdit } = require('./commands/antidelete');

// ─── Import all commands ────────────────────────────────────
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand } = require('./commands/mention');
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const simageCommand = require('./commands/simage');
const attpCommand = require('./commands/attp');
const { startHangman, guessLetter } = require('./commands/hangman');
const { startTrivia, answerTrivia } = require('./commands/trivia');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const { eightBallCommand } = require('./commands/eightball');
const { lyricsCommand } = require('./commands/lyrics');
const { dareCommand } = require('./commands/dare');
const { truthCommand } = require('./commands/truth');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const unbanCommand = require('./commands/unban');
const { handleBadwordDetection } = require('./commands/badword');
const { chatbotResponse, handleChatbotResponse } = require('./commands/chatbot');
const { readPmBlockerState } = require('./commands/pmblocker');

// ─── PLUGIN SYSTEM: Load plugin commands ────────────────────
// Plugin commands are loaded by plugins/_loader.js into global.pluginCommands
// This is the dynamic command registry that includes both built-in and plugin commands

// ─── Import Command Loader ──────────────────────────────────
const { getAllCommands, findCommand } = require('./lib/commandLoader');

// ─── Message Handler ────────────────────────────────────────
async function handleMessages(sock, chatUpdate) {
    try {
        const messages = chatUpdate.messages;
        if (!messages || messages.length === 0) return;

        const message = messages[0];
        if (!message.message) return;

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsOwnerOrSudo = isOwnerOrSudo(senderId);
        const senderIsSudo = isSudo(senderId);

        // Store message for anti-delete
        if (message.key.id) {
            storeMessage(message.key.id, message.message);
        }

        // Channel info for newsletters
        const channelInfo = {};
        if (chatId && chatId.endsWith('@newsletter')) {
            channelInfo.recipient = chatId;
        }

        // Get message text
        let userMessage = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() || '';

        if (userMessage.startsWith('.')) {
            console.log(` Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
        }

        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:', error);
        }

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // Banned check
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, { text: '❌ You are banned from using the bot. Contact an admin to get unbanned.', ...channelInfo });
            }
            return;
        }

        // Game moves
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // ─── ANTI-STICKER ────────────────────────────────────
        if (isGroup && message.message?.stickerMessage) {
            const isEnabled = await getAntiSticker(chatId);
            if (isEnabled) {
                try {
                    await sock.sendMessage(chatId, { delete: message.key });
                    await sock.sendMessage(chatId, { text: ` @${senderId.split('@')[0]} stickers are not allowed here!`, mentions: [senderId] });
                } catch (e) {
                    console.error('Anti-sticker delete failed:', e);
                }
                return;
            }
        }

        // Badwords & Antilink
        if (isGroup) {
            if (userMessage) await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        // PM blocker
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) {}
                    return;
                }
            } catch (e) {}
        }

        // ─── Non‑command handling ────────────────────────────
        if (!userMessage.startsWith('.')) {
            await handleAutotypingForMessage(sock, chatId, userMessage);
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
                if (isPublic || isOwnerOrSudoCheck) {
                    await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                }
            }
            return;
        }

        if (!isPublic && !isOwnerOrSudoCheck) return;

        // ─── Admin/Owner checks ──────────────────────────────
        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker', '.plugin'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false, isBotAdmin = false;
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.', ...channelInfo }, { quoted: message });
                return;
            }
            if (userMessage.startsWith('.mute') || userMessage === '.unmute' || userMessage.startsWith('.ban') || userMessage.startsWith('.unban') || userMessage.startsWith('.promote') || userMessage.startsWith('.demote')) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.', ...channelInfo }, { quoted: message });
                    return;
                }
            }
        }

        if (isOwnerCommand && !message.key.fromMe && !senderIsOwnerOrSudo) {
            await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
            return;
        }

        // ─── PARSE COMMAND NAME ──────────────────────────────
        const cmdName = userMessage.slice(1).split(/\s+/)[0].toLowerCase();
        const args = userMessage.slice(1).split(/\s+/).slice(1);

        // ─── DYNAMIC COMMAND EXECUTION (Built-in + Plugins) ──
        const command = findCommand(cmdName);

        if (command) {
            // Handle autotyping for commands
            await handleAutotypingForCommand(sock, chatId, cmdName);

            try {
                // Check if it's a plugin command (needs different signature)
                if (command.isPlugin) {
                    // Plugin commands expect (m, sock, args)
                    const m = { sender: senderId, chat: chatId, message: message, args: args };
                    await command.fn(m, sock, args);
                } else {
                    // Built-in commands expect (sock, chatId, message, ...)
                    await command.fn(sock, chatId, message, ...args);
                }

                // Show typing after command
                await showTypingAfterCommand(sock, chatId);

            } catch (err) {
                console.error(`Error executing command ${cmdName}:`, err);
                await sock.sendMessage(chatId, { text: `⚠️ Error: ${err.message || 'Unknown error'}`, ...channelInfo }, { quoted: message });
            }
            return;
        }

        // ─── FALLBACK: Check if it's a plugin command directly ──
        // (This handles cases where the command wasn't in the built-in list)
        const pluginCmd = (global.pluginCommands || []).find(p => p.name === cmdName);
        if (pluginCmd) {
            await handleAutotypingForCommand(sock, chatId, cmdName);
            try {
                const m = { sender: senderId, chat: chatId, message: message, args: args };
                await pluginCmd.run(m, sock, args);
                await showTypingAfterCommand(sock, chatId);
            } catch (err) {
                console.error(`Error executing plugin command ${cmdName}:`, err);
                await sock.sendMessage(chatId, { text: `⚠️ Error: ${err.message || 'Unknown error'}`, ...channelInfo }, { quoted: message });
            }
            return;
        }

        // ─── COMMAND NOT FOUND ──────────────────────────────
        // Only show "command not found" for valid-looking commands
        if (userMessage.length > 1 && userMessage.slice(1).length > 0) {
            await sock.sendMessage(chatId, { text: `❌ Command "${cmdName}" not found. Type .help for available commands.`, ...channelInfo }, { quoted: message });
        }

    } catch (error) {
        console.error('Message handler error:', error);
    }
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate: require('./events/group-participants'),
    handleStatus: require('./events/status'),
    handleMessageRevocation,
    handleMessageEdit,
    storeMessage,
    handleAntideleteCommand,
    handleAntilinkCommand,
    handleAntitagCommand,
    handleMentionDetection,
    handleTagDetection,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand,
    isAutotypingEnabled,
    handleAutoread,
    isAutoreadEnabled,
    getAllCommands,
    findCommand
};

require('./settings');
require('./plugins/_loader');   // <-- add this line
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { handleMessages, handleGroupParticipantUpdate, handleStatus, handleMessageRevocation, handleMessageEdit, storeMessage } = require('./main');
const PhoneNumber = require('awesome-phonenumber');
const { smsg } = require('./lib/myfunc');
const NodeCache = require('node-cache');
const pino = require('pino');
const readline = require('readline');
const { rmSync } = require('fs');
const store = require('./lib/lightweight_store');
const { startScheduler } = require('./lib/scheduler');

// ─── CONFIG ──────────────────────────────────────────────
const STABILITY_CONFIG = {
    maxReconnectDelay: 30000,
    initialReconnectDelay: 3000,
    reconnectBackoffMultiplier: 1.5,
    maxConsecutiveCrashes: 15,
    crashResetInterval: 600000,
    ramWarningThreshold: 180,
    ramCriticalThreshold: 220,
    gcInterval: 30000,
    healthCheckInterval: 20000,
    storeWriteInterval: 15000,
    keepAliveInterval: 20000,
    connectionTimeout: 60000,
    defaultQueryTimeout: 60000,
};

let crashCount = 0,
    lastCrashTime = Date.now(),
    reconnectDelay = STABILITY_CONFIG.initialReconnectDelay,
    isConnecting = false,
    gcTimer = null,
    storeTimer = null,
    memoryTimer = null,
    sessionCleanTimer = null;
store.readFromFile();
const settings = require('./settings');

function autoCleanSession() {
    try {
        const sessionDir = path.join(__dirname, 'session');
        if (!fs.existsSync(sessionDir)) return;
        const files = fs.readdirSync(sessionDir);
        let count = 0;
        const now = Date.now();
        // Only clean app-state-sync files older than 24 hours to preserve active session keys
        const maxAge = 24 * 60 * 60 * 1000;
        for (const file of files) {
            if (file === 'creds.json' || file.startsWith('pre-key-') || file.startsWith('sender-key-') || file.startsWith('session-')) {
                continue; // Do NOT delete active encryption keys!
            }
            if (file.startsWith('app-state-sync-')) {
                try {
                    const filePath = path.join(sessionDir, file);
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                        count++;
                    }
                } catch (e) {}
            }
        }
        if (count > 0) {
            console.log(`🧹 Auto-cleaned ${count} stale app-state file(s).`);
        }
    } catch (e) {
        console.error('Session auto-clean error:', e.message);
    }
}

storeTimer = setInterval(() => {
    try { store.writeToFile(); } catch (e) { console.error('Store write error:', e.message); }
}, settings.storeWriteInterval || STABILITY_CONFIG.storeWriteInterval);

sessionCleanTimer = setInterval(() => {
    autoCleanSession();
}, 3600000); // Auto-clean every hour

gcTimer = setInterval(() => {
    try { if (global.gc) { global.gc(); const used = process.memoryUsage().rss / 1024 / 1024; if (used > 150) console.log(`🧹 GC | RAM: ${used.toFixed(1)}MB`); } } catch (e) {}
}, STABILITY_CONFIG.gcInterval);

memoryTimer = setInterval(() => {
    try {
        const used = process.memoryUsage().rss / 1024 / 1024;
        if (used > STABILITY_CONFIG.ramCriticalThreshold) {
            console.log(`🚨 CRITICAL RAM (${used.toFixed(1)}MB)`);
            if (global.gc) global.gc();
            setTimeout(() => { const stillUsed = process.memoryUsage().rss / 1024 / 1024; if (stillUsed > STABILITY_CONFIG.ramCriticalThreshold) process.exit(1); }, 5000);
        } else if (used > STABILITY_CONFIG.ramWarningThreshold) {
            console.log(`⚠️ RAM high: ${used.toFixed(1)}MB`);
            if (global.gc) global.gc();
        }
    } catch (e) {}
}, STABILITY_CONFIG.healthCheckInterval);

let phoneNumber = "923257853673";
global.botname = "MEHTAB-MD";
global.themeemoji = "•";
const pairingCode = true;
const useMobile = process.argv.includes("--mobile");

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
const question = (text) => {
    if (rl) return new Promise((resolve) => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || phoneNumber);
};

function getReconnectDelay() {
    const now = Date.now();
    if (now - lastCrashTime > STABILITY_CONFIG.crashResetInterval) { crashCount = 0; reconnectDelay = STABILITY_CONFIG.initialReconnectDelay; }
    crashCount++;
    lastCrashTime = now;
    if (crashCount > STABILITY_CONFIG.maxConsecutiveCrashes) {
        console.log(`❌ Too many crashes (${crashCount}). Waiting ${(STABILITY_CONFIG.crashResetInterval/1000/60).toFixed(0)} min...`);
        return STABILITY_CONFIG.crashResetInterval;
    }
    const delay = Math.min(reconnectDelay, STABILITY_CONFIG.maxReconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * STABILITY_CONFIG.reconnectBackoffMultiplier, STABILITY_CONFIG.maxReconnectDelay);
    return delay;
}
function resetReconnectDelay() { crashCount = 0; reconnectDelay = STABILITY_CONFIG.initialReconnectDelay; }

async function startXeonBotInc() {
    if (isConnecting) { console.log('⏳ Connection already in progress, skipping...'); return; }
    isConnecting = true;

    try {
        const baileys = require('@whiskeysockets/baileys');
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidDecode, jidNormalizedUser, makeCacheableSignalKeyStore, delay } = baileys;
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
        const logger = pino({ level: 'silent' });
        const sock = makeWASocket({
            version,
            logger,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: "silent" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid);
                let msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: STABILITY_CONFIG.defaultQueryTimeout,
            connectTimeoutMs: STABILITY_CONFIG.connectionTimeout,
            keepAliveIntervalMs: STABILITY_CONFIG.keepAliveInterval,
            retryRequestDelayMs: 500,
            maxMsgRetryCount: 1,
            fireInitQueries: true,
            shouldSyncHistoryMessage: () => false,
            shouldIgnoreJid: (jid) => jid === 'status@broadcast',
        });
        sock.ev.on('creds.update', saveCreds);
        store.bind(sock.ev);
        sock.baileys = baileys;
        global.baileys = baileys;

        sock.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            } else return jid;
        };
        sock.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = sock.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });
        sock.getName = (jid, withoutContact = false) => {
            const id = sock.decodeJid(jid);
            withoutContact = sock.withoutContact || withoutContact;
            let v;
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = sock.groupMetadata(id) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
            });
            else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === sock.decodeJid(sock.user.id) ?
                sock.user : (store.contacts[id] || {});
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
        };
        sock.public = true;
        sock.serializeM = (m) => smsg(sock, m, store);

        // ─── PAIRING ─────────────────────────────────────
        if (pairingCode && !sock.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api');
            let phoneNumber;
            if (!!global.phoneNumber) {
                phoneNumber = global.phoneNumber;
            } else {
                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFormat: 6281376552730 (without + or spaces) : `)));
            }
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            const pn = require('awesome-phonenumber');
            if (!pn('+' + phoneNumber).isValid()) {
                console.log(chalk.red('Invalid phone number.'));
                process.exit(1);
            }
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)));
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                }
            }, 3000);
        }

        // ─── EVENTS ──────────────────────────────────────
        sock.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                await storeMessage(sock, mek);
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(sock, chatUpdate);
                    return;
                }
                if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us');
                    if (!isGroup) return;
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
                try {
                    await handleMessages(sock, chatUpdate, true);
                } catch (err) {
                    if (!err?.message?.includes('Bad MAC') && !err?.message?.includes('MAC mismatch')) {
                        console.error("Error in handleMessages:", err);
                    }
                }
            } catch (err) {
                if (!err?.message?.includes('Bad MAC') && !err?.message?.includes('MAC mismatch')) {
                    console.error("Error in messages.upsert:", err);
                }
            }
        });

        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                try {
                    if (update.update?.edited) await handleMessageEdit(sock, update);
                    if (update.update?.revoke) {
                        const fakeMsg = {
                            message: { protocolMessage: { key: update.key, type: 0 } },
                            participant: update.key.participant || update.key.remoteJid,
                            key: update.key
                        };
                        await handleMessageRevocation(sock, fakeMsg);
                    }
                } catch (err) { console.error("Error in messages.update:", err); }
            }
        });

        sock.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(sock, update);
        });

        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting...'));
            if (connection === 'open') {
                resetReconnectDelay();
                console.log(chalk.magenta(` `));
                console.log(chalk.yellow(`🌿Connected to => ` + JSON.stringify(sock.user, null, 2)));
                startScheduler(sock);
                autoCleanSession();
                try {
                    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    await sock.sendMessage(botNumber, {
                        text: `🤖 MEHTAB-MD Connected Successfully!\n\n⏰ ${new Date().toLocaleString()}\n✅ Online and Ready!`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363409689492071@newsletter',
                                newsletterName: 'MEHTAB-MD',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (error) { console.error('Error sending connection message:', error.message); }
                await delay(1999);
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || 'MEHTAB-MD'} ]`)}\n\n`));
                console.log(chalk.cyan(`< ================================================== >`));
                console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: @problem_solved`));
                console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: themalik-g`));
                console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: 923257853673`));
                console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: Malik Mehtab`));
                console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot Connected Successfully! ✅`));
                console.log(chalk.blue(`Bot Version: ${settings.version}`));
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || "Unknown";
                console.log(chalk.red(`Connection closed. Status: ${statusCode}, Reason: ${reason}`));
                isConnecting = false;
                const isRestartRequired = statusCode === 515 || statusCode === DisconnectReason.restartRequired;
                const needsReauth = [DisconnectReason.loggedOut, DisconnectReason.badSession, DisconnectReason.multideviceMismatch].includes(statusCode);
                if (needsReauth) {
                    console.log(chalk.yellow('🔄 Session invalid. Clearing auth and restarting...'));
                    try { rmSync('./session', { recursive: true, force: true }); } catch (error) { console.error('Error deleting session:', error); }
                    const delayMs = getReconnectDelay();
                    setTimeout(() => { startXeonBotInc().catch(err => { console.error('Reconnection failed:', err); }); }, delayMs);
                    return;
                }
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect || isRestartRequired) {
                    const delayMs = getReconnectDelay();
                    setTimeout(() => { startXeonBotInc().catch(err => { console.error('Reconnection failed:', err); }); }, delayMs);
                } else {
                    console.log(chalk.red('Logged out. Exiting.'));
                    process.exit(0);
                }
            }
        });

        // ─── ANTI-CALL ────────────────────────────────────
        let anticallModule = null;
        try { anticallModule = require('./commands/anticall'); } catch (e) {}
        const antiCallNotified = new Set();
        sock.ev.on('call', async (calls) => {
            try {
                if (!anticallModule) return;
                const state = anticallModule.readState ? anticallModule.readState() : { enabled: false };
                if (!state.enabled) return;
                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;
                    try {
                        if (typeof sock.rejectCall === 'function' && call.id) await sock.rejectCall(call.id, callerJid);
                    } catch {}
                    if (!antiCallNotified.has(callerJid)) {
                        antiCallNotified.add(callerJid);
                        setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                        await sock.sendMessage(callerJid, { text: '📵 Anticall is enabled. Your call was rejected.' });
                    }
                    setTimeout(async () => {
                        try { await sock.updateBlockStatus(callerJid, 'block'); } catch {}
                    }, 800);
                }
            } catch (e) {}
        });

        isConnecting = false;
        return sock;
    } catch (error) {
        console.error('Error in startXeonBotInc:', error);
        isConnecting = false;
        const delayMs = getReconnectDelay();
        setTimeout(() => { startXeonBotInc().catch(err => { console.error('Fatal restart error:', err); }); }, delayMs);
    }
}

// ─── PROCESS HANDLERS ────────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (err) => {
    console.error('⚠️ Unhandled Rejection:', err?.message || err);
});
process.on('SIGTERM', () => { console.log('SIGTERM received. Cleaning up...'); if (storeTimer) clearInterval(storeTimer); if (gcTimer) clearInterval(gcTimer); if (memoryTimer) clearInterval(memoryTimer); if (sessionCleanTimer) clearInterval(sessionCleanTimer); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT received. Cleaning up...'); if (storeTimer) clearInterval(storeTimer); if (gcTimer) clearInterval(gcTimer); if (memoryTimer) clearInterval(memoryTimer); if (sessionCleanTimer) clearInterval(sessionCleanTimer); process.exit(0); });

startXeonBotInc().catch(error => {
    console.error('Fatal startup error:', error);
    const delayMs = getReconnectDelay();
    setTimeout(() => { startXeonBotInc().catch(err => { console.error('Second startup attempt failed:', err); process.exit(1); }); }, delayMs);
});

/**
 * Baileys wrapper for MEHTAB-MD
 * Provides loadBaileys function for connection management
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const pino = require('pino');

async function loadBaileys(phoneNumber, pairingCode, useMobile) {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const msgRetryCounterCache = new NodeCache();
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        auth: state,
        msgRetryCounterCache,
        browser: ['MEHTAB-MD', 'Chrome', '120.0.0'],
        markOnlineOnConnect: true,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 20000,
        getMessage: async (key) => {
            return {
                conversation: 'Hello'
            };
        }
    });

    if (pairingCode && phoneNumber) {
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`📱 Pairing Code: ${code}`);
        } catch (error) {
            console.error('❌ Failed to get pairing code:', error);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Connection closed. Reconnecting...');
            } else {
                console.log('❌ Logged out. Please restart.');
            }
        } else if (connection === 'open') {
            console.log('✅ Connected successfully!');
        }
    });

    return sock;
}

module.exports = { loadBaileys };

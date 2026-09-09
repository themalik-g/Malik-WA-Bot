const fs = require('fs');
const path = require('path');

function loadUserGroupData() {
    try {
        const dataPath = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(dataPath)) {
            const defaultData = {
                antibadword: {},
                antilink: {},
                antitag: {},
                welcome: {},
                goodbye: {},
                chatbot: {},
                warnings: {},
                sudo: [],
                antisticker: {}
            };
            const dir = path.dirname(dataPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        console.error('Error loading user group data:', error);
        return { antibadword: {}, antilink: {}, antitag: {}, welcome: {}, goodbye: {}, chatbot: {}, warnings: {}, sudo: [], antisticker: {} };
    }
}

function saveUserGroupData(data) {
    try {
        const dataPath = path.join(__dirname, '../data/userGroupData.json');
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving user group data:', error);
        return false;
    }
}

// ========== ANTILINK HELPERS ==========
async function setAntilink(groupId, status, action = 'delete') {
    const data = loadUserGroupData();
    if (!data.antilink) data.antilink = {};
    data.antilink[groupId] = { enabled: status === 'on', action };
    saveUserGroupData(data);
    return true;
}

async function getAntilink(groupId) {
    const data = loadUserGroupData();
    return data.antilink?.[groupId] || null;
}

async function removeAntilink(groupId) {
    const data = loadUserGroupData();
    if (data.antilink) delete data.antilink[groupId];
    saveUserGroupData(data);
    return true;
}

// ========== ANTITAG HELPERS ==========
async function setAntitag(groupId, status, action = 'delete') {
    const data = loadUserGroupData();
    if (!data.antitag) data.antitag = {};
    data.antitag[groupId] = { enabled: status === 'on', action };
    saveUserGroupData(data);
    return true;
}

async function getAntitag(groupId) {
    const data = loadUserGroupData();
    return data.antitag?.[groupId] || null;
}

async function removeAntitag(groupId) {
    const data = loadUserGroupData();
    if (data.antitag) delete data.antitag[groupId];
    saveUserGroupData(data);
    return true;
}

// ========== WARNING HELPERS ==========
async function incrementWarningCount(groupId, userId) {
    const data = loadUserGroupData();
    if (!data.warnings) data.warnings = {};
    if (!data.warnings[groupId]) data.warnings[groupId] = {};
    const count = (data.warnings[groupId][userId] || 0) + 1;
    data.warnings[groupId][userId] = count;
    saveUserGroupData(data);
    return count;
}

async function resetWarningCount(groupId, userId) {
    const data = loadUserGroupData();
    if (data.warnings?.[groupId]?.[userId]) {
        delete data.warnings[groupId][userId];
        saveUserGroupData(data);
    }
    return true;
}

// ========== SUDO HELPERS ==========
async function isSudo(userId) {
    const data = loadUserGroupData();
    const sudoList = data.sudo || [];
    const cleanId = userId ? userId.split('@')[0].split(':')[0] : '';
    return sudoList.some(s => typeof s === 'string' && s.includes(cleanId));
}

async function addSudo(userId) {
    const data = loadUserGroupData();
    if (!data.sudo) data.sudo = [];
    if (!data.sudo.includes(userId)) {
        data.sudo.push(userId);
        saveUserGroupData(data);
    }
    return true;
}

async function removeSudo(userId) {
    const data = loadUserGroupData();
    if (data.sudo) {
        data.sudo = data.sudo.filter(id => id !== userId);
        saveUserGroupData(data);
    }
    return true;
}

async function getSudoList() {
    const data = loadUserGroupData();
    return data.sudo || [];
}

// ========== WELCOME HELPERS ==========
async function addWelcome(groupId, text) {
    const data = loadUserGroupData();
    if (!data.welcome) data.welcome = {};
    data.welcome[groupId] = { enabled: true, message: text };
    saveUserGroupData(data);
    return true;
}

async function delWelcome(groupId) {
    const data = loadUserGroupData();
    if (data.welcome) delete data.welcome[groupId];
    saveUserGroupData(data);
    return true;
}

async function isWelcomeOn(groupId) {
    const data = loadUserGroupData();
    return data.welcome?.[groupId]?.enabled || false;
}

async function getWelcome(groupId) {
    const data = loadUserGroupData();
    return data.welcome?.[groupId]?.message || null;
}

// ========== GOODBYE HELPERS ==========
async function addGoodbye(groupId, text) {
    const data = loadUserGroupData();
    if (!data.goodbye) data.goodbye = {};
    data.goodbye[groupId] = { enabled: true, message: text };
    saveUserGroupData(data);
    return true;
}

async function delGoodBye(groupId) {
    const data = loadUserGroupData();
    if (data.goodbye) delete data.goodbye[groupId];
    saveUserGroupData(data);
    return true;
}

async function isGoodByeOn(groupId) {
    const data = loadUserGroupData();
    return data.goodbye?.[groupId]?.enabled || false;
}

async function getGoodbye(groupId) {
    const data = loadUserGroupData();
    return data.goodbye?.[groupId]?.message || null;
}

// ========== ANTIBADWORD HELPERS ==========
async function setAntiBadword(groupId, status, action = 'delete') {
    const data = loadUserGroupData();
    if (!data.antibadword) data.antibadword = {};
    data.antibadword[groupId] = { enabled: status === 'on', action };
    saveUserGroupData(data);
    return true;
}

async function getAntiBadword(groupId) {
    const data = loadUserGroupData();
    return data.antibadword?.[groupId] || null;
}

async function removeAntiBadword(groupId) {
    const data = loadUserGroupData();
    if (data.antibadword) delete data.antibadword[groupId];
    saveUserGroupData(data);
    return true;
}

// ========== CHATBOT HELPERS ==========
async function setChatbot(groupId, status) {
    const data = loadUserGroupData();
    if (!data.chatbot) data.chatbot = {};
    data.chatbot[groupId] = { enabled: status === 'on' };
    saveUserGroupData(data);
    return true;
}

async function getChatbot(groupId) {
    const data = loadUserGroupData();
    return data.chatbot?.[groupId]?.enabled || false;
}

async function removeChatbot(groupId) {
    const data = loadUserGroupData();
    if (data.chatbot) delete data.chatbot[groupId];
    saveUserGroupData(data);
    return true;
}

// ========== ANTI-STICKER HELPERS ==========
async function setAntiSticker(groupId, enabled) {
    const data = loadUserGroupData();
    if (!data.antisticker) data.antisticker = {};
    data.antisticker[groupId] = { enabled: !!enabled };
    saveUserGroupData(data);
    return true;
}

async function getAntiSticker(groupId) {
    const data = loadUserGroupData();
    return data.antisticker?.[groupId]?.enabled || false;
}

async function removeAntiSticker(groupId) {
    const data = loadUserGroupData();
    if (data.antisticker) delete data.antisticker[groupId];
    saveUserGroupData(data);
    return true;
}

module.exports = {
    setAntilink, getAntilink, removeAntilink,
    setAntitag, getAntitag, removeAntitag,
    incrementWarningCount, resetWarningCount,
    isSudo, addSudo, removeSudo, getSudoList,
    addWelcome, delWelcome, isWelcomeOn, getWelcome,
    addGoodbye, delGoodBye, isGoodByeOn, getGoodbye,
    setAntiBadword, getAntiBadword, removeAntiBadword,
    setChatbot, getChatbot, removeChatbot,
    setAntiSticker, getAntiSticker, removeAntiSticker
};

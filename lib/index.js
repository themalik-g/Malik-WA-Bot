const fs = require('fs');
const path = require('path');

function loadUserGroupData() {
    try {
        const p = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(p)) {
            const d = {
                antibadword: {},
                antilink: {},
                welcome: {},
                goodbye: {},
                chatbot: {},
                warnings: {},
                sudo: [],
                antisticker: {}
            };
            fs.writeFileSync(p, JSON.stringify(d, null, 2));
            return d;
        }
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
        return {
            antibadword: {},
            antilink: {},
            welcome: {},
            goodbye: {},
            chatbot: {},
            warnings: {},
            antisticker: {}
        };
    }
}

function saveUserGroupData(d) {
    try {
        const p = path.join(__dirname, '../data/userGroupData.json');
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, JSON.stringify(d, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving user group data:', e);
        return false;
    }
}

// ---------- ANTILINK ----------
async function setAntilink(g, t, a) {
    const d = loadUserGroupData();
    if (!d.antilink) d.antilink = {};
    d.antilink[g] = { enabled: t === 'on', action: a || 'delete' };
    saveUserGroupData(d);
    return true;
}

async function getAntilink(g, t) {
    const d = loadUserGroupData();
    if (!d.antilink || !d.antilink[g]) return null;
    return t === 'on' ? d.antilink[g] : null;
}

async function removeAntilink(g) {
    const d = loadUserGroupData();
    if (d.antilink && d.antilink[g]) {
        delete d.antilink[g];
        saveUserGroupData(d);
    }
    return true;
}

// ---------- ANTITAG ----------
async function setAntitag(g, t, a) {
    const d = loadUserGroupData();
    if (!d.antitag) d.antitag = {};
    d.antitag[g] = { enabled: t === 'on', action: a || 'delete' };
    saveUserGroupData(d);
    return true;
}

async function getAntitag(g, t) {
    const d = loadUserGroupData();
    if (!d.antitag || !d.antitag[g]) return null;
    return t === 'on' ? d.antitag[g] : null;
}

async function removeAntitag(g) {
    const d = loadUserGroupData();
    if (d.antitag && d.antitag[g]) {
        delete d.antitag[g];
        saveUserGroupData(d);
    }
    return true;
}

// ---------- WARNINGS ----------
async function incrementWarningCount(g, u) {
    const d = loadUserGroupData();
    if (!d.warnings) d.warnings = {};
    if (!d.warnings[g]) d.warnings[g] = {};
    if (!d.warnings[g][u]) d.warnings[g][u] = 0;
    d.warnings[g][u]++;
    saveUserGroupData(d);
    return d.warnings[g][u];
}

async function resetWarningCount(g, u) {
    const d = loadUserGroupData();
    if (d.warnings && d.warnings[g] && d.warnings[g][u]) {
        d.warnings[g][u] = 0;
        saveUserGroupData(d);
    }
    return true;
}

// ---------- SUDO ----------
async function isSudo(u) {
    const d = loadUserGroupData();
    return d.sudo && d.sudo.includes(u);
}

async function addSudo(u) {
    const d = loadUserGroupData();
    if (!d.sudo) d.sudo = [];
    if (!d.sudo.includes(u)) {
        d.sudo.push(u);
        saveUserGroupData(d);
    }
    return true;
}

async function removeSudo(u) {
    const d = loadUserGroupData();
    if (!d.sudo) d.sudo = [];
    const i = d.sudo.indexOf(u);
    if (i !== -1) {
        d.sudo.splice(i, 1);
        saveUserGroupData(d);
    }
    return true;
}

async function getSudoList() {
    const d = loadUserGroupData();
    return Array.isArray(d.sudo) ? d.sudo : [];
}

// ---------- WELCOME ----------
async function addWelcome(j, e, m) {
    const d = loadUserGroupData();
    if (!d.welcome) d.welcome = {};
    d.welcome[j] = {
        enabled: e,
        message: m || 'Welcome {user} to {group}!',
        channelId: '120363409689492071@newsletter'
    };
    saveUserGroupData(d);
    return true;
}

async function delWelcome(j) {
    const d = loadUserGroupData();
    if (d.welcome && d.welcome[j]) {
        delete d.welcome[j];
        saveUserGroupData(d);
    }
    return true;
}

async function isWelcomeOn(j) {
    const d = loadUserGroupData();
    return d.welcome && d.welcome[j] && d.welcome[j].enabled;
}

async function getWelcome(j) {
    const d = loadUserGroupData();
    return d.welcome && d.welcome[j] ? d.welcome[j].message : null;
}

// ---------- GOODBYE ----------
async function addGoodbye(j, e, m) {
    const d = loadUserGroupData();
    if (!d.goodbye) d.goodbye = {};
    d.goodbye[j] = {
        enabled: e,
        message: m || 'Goodbye {user}!',
        channelId: '120363409689492071@newsletter'
    };
    saveUserGroupData(d);
    return true;
}

async function delGoodBye(j) {
    const d = loadUserGroupData();
    if (d.goodbye && d.goodbye[j]) {
        delete d.goodbye[j];
        saveUserGroupData(d);
    }
    return true;
}

async function isGoodByeOn(j) {
    const d = loadUserGroupData();
    return d.goodbye && d.goodbye[j] && d.goodbye[j].enabled;
}

async function getGoodbye(j) {
    const d = loadUserGroupData();
    return d.goodbye && d.goodbye[j] ? d.goodbye[j].message : null;
}

// ---------- ANTIBADWORD ----------
async function setAntiBadword(g, t, a) {
    const d = loadUserGroupData();
    if (!d.antibadword) d.antibadword = {};
    d.antibadword[g] = { enabled: t === 'on', action: a || 'delete' };
    saveUserGroupData(d);
    return true;
}

async function getAntiBadword(g, t) {
    const d = loadUserGroupData();
    if (!d.antibadword || !d.antibadword[g]) return null;
    return t === 'on' ? d.antibadword[g] : null;
}

async function removeAntiBadword(g) {
    const d = loadUserGroupData();
    if (d.antibadword && d.antibadword[g]) {
        delete d.antibadword[g];
        saveUserGroupData(d);
    }
    return true;
}

// ---------- CHATBOT ----------
async function setChatbot(g, e) {
    const d = loadUserGroupData();
    if (!d.chatbot) d.chatbot = {};
    d.chatbot[g] = { enabled: e };
    saveUserGroupData(d);
    return true;
}

async function getChatbot(g) {
    const d = loadUserGroupData();
    return d.chatbot?.[g] || null;
}

async function removeChatbot(g) {
    const d = loadUserGroupData();
    if (d.chatbot && d.chatbot[g]) {
        delete d.chatbot[g];
        saveUserGroupData(d);
    }
    return true;
}

// ---------- ANTI-STICKER ----------
async function setAntiSticker(g, e) {
    const d = loadUserGroupData();
    if (!d.antisticker) d.antisticker = {};
    d.antisticker[g] = { enabled: !!e };
    saveUserGroupData(d);
    return true;
}

async function getAntiSticker(g) {
    const d = loadUserGroupData();
    return d.antisticker?.[g]?.enabled || false;
}

async function removeAntiSticker(g) {
    const d = loadUserGroupData();
    if (d.antisticker) delete d.antisticker[g];
    saveUserGroupData(d);
    return true;
}

// ---------- EXPORTS ----------
module.exports = {
    setAntilink,
    getAntilink,
    removeAntilink,
    setAntitag,
    getAntitag,
    removeAntitag,
    incrementWarningCount,
    resetWarningCount,
    isSudo,
    addSudo,
    removeSudo,
    getSudoList,
    addWelcome,
    delWelcome,
    isWelcomeOn,
    getWelcome,
    addGoodbye,
    delGoodBye,
    isGoodByeOn,
    getGoodbye,
    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,
    setChatbot,
    getChatbot,
    removeChatbot,
    setAntiSticker,
    getAntiSticker,
    removeAntiSticker
};

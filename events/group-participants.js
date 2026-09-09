const { handleJoinEvent } = require('../commands/welcome');
const { handleLeaveEvent } = require('../commands/goodbye');

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action } = update;
        if (!id || !participants || !action) return;

        if (action === 'add') {
            await handleJoinEvent(sock, id, participants);
        } else if (action === 'remove') {
            await handleLeaveEvent(sock, id, participants);
        }
    } catch (error) {
        console.error('Error handling group participants update:', error);
    }
}

module.exports = handleGroupParticipantUpdate;

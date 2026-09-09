const { handleStatusUpdate } = require('../commands/autostatus');

async function handleStatus(sock, status) {
    try {
        await handleStatusUpdate(sock, status);
    } catch (error) {
        console.error('Error handling status update:', error);
    }
}

module.exports = handleStatus;

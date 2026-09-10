const { addTask, removeTask, listTasks } = require('../lib/scheduler');

async function scheduleCommand(sock, chatId, message, ...args) {
    const action = args[0]?.toLowerCase();
    const restArgs = args.slice(1).join(' ');

    if (action === 'add') {
        const [date, time, ...textParts] = restArgs.split(/\s+/);
        const content = textParts.join(' ');
        if (!date || !time || !content) {
            return sock.sendMessage(chatId, { text: 'Usage: .schedule add YYYY-MM-DD HH:MM "Your message"' }, { quoted: message });
        }
        const timestamp = new Date(`${date}T${time}:00`).getTime();
        if (isNaN(timestamp) || timestamp < Date.now()) {
            return sock.sendMessage(chatId, { text: '❌ Invalid date or time in the past.' }, { quoted: message });
        }
        const task = {
            chatId,
            type: 'message',
            content,
            time: timestamp
        };
        const id = addTask(task);
        await sock.sendMessage(chatId, { text: `✅ Scheduled message for ${date} ${time}. Task ID: ${id}` }, { quoted: message });
    } else if (action === 'list') {
        const tasks = listTasks();
        if (tasks.length === 0) return sock.sendMessage(chatId, { text: 'No scheduled tasks.' }, { quoted: message });
        const text = tasks.map((t, i) => `${i+1}. ID: ${t.id} | ${new Date(t.time).toLocaleString()} | ${t.content}`).join('\n');
        await sock.sendMessage(chatId, { text: `📋 Scheduled tasks:\n${text}` }, { quoted: message });
    } else if (action === 'remove') {
        if (!restArgs) return sock.sendMessage(chatId, { text: 'Usage: .schedule remove <task_id>' }, { quoted: message });
        removeTask(restArgs);
        await sock.sendMessage(chatId, { text: `✅ Task ${restArgs} removed.` }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: 'Usage: .schedule add|list|remove' }, { quoted: message });
    }
}

module.exports = scheduleCommand;

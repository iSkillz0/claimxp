const { Client } = require('discord.js-selfbot-v13');
const dotenv = require('dotenv');
const schedule = require('node-schedule');
const axios = require('axios');
const fs = require('fs');

// Load initial .env
dotenv.config();

const channelId = '1320253218403516467';
const webhookUrl = 'https://discord.com/api/webhooks/1377891976959098911/JLo3xZsGkEu72_7En5zknK5jlXtEpAK3DSC7Ddgz0ZA1jwy49Q3xRCmfOtty2MaWqHoq';

const activeBots = new Map(); // token -> { client, scheduledJobs, messageCount }

axios.post(webhookUrl, { content: '**Scripted Start!**' });

async function logToWebhook(botName, nextRunDate = null, delaySeconds = null, count = 0) {
    let relativeTime = '';
    let delayInfo = '';
    let countInfo = `(Total: ${count})`;

    if (nextRunDate) {
        const unixTimestamp = Math.floor(nextRunDate.getTime() / 1000);
        relativeTime = `**Next:** <t:${unixTimestamp}:R>`;
    }

    if (delaySeconds !== null) {
        const mins = Math.floor(delaySeconds / 60);
        const secs = delaySeconds % 60;
        const delayText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        delayInfo = `with **${delayText}**`;
    }

    const content = `**[${botName}]** **Sent!**  ${relativeTime} ${delayInfo} ${countInfo}`;

    console.log(content.replace(/\*\*/g, ''));

    try {
        await axios.post(webhookUrl, { content });
    } catch (err) {
        console.error(`❌ [${botName}] Failed to send log to webhook:`, err.message);
    }
}

function startBot(token, index) {
    const client = new Client();
    let messageCount = 0;
    const scheduledJobs = [];

    async function sendClaimXpWithDelay() {
        const delaySeconds = Math.floor(Math.random() * 1200) + 1;
        const delayMs = delaySeconds * 1000;

        setTimeout(async () => {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    await channel.send("$claimxp");
                    messageCount++;

                    const now = new Date();
                    const nextRun = new Date(now.getTime() + (60 - now.getMinutes() % 60) * 60 * 1000);
                    await logToWebhook(client.user.username, nextRun, delaySeconds, messageCount);
                } else {
                    console.error(`[${client.user.username}] ❌ Could not fetch the channel.`);
                }
            } catch (err) {
                console.error(`[${client.user?.username || `Client ${index + 1}`}] ❌ Error while sending message: ${err.message}`);
            }
        }, delayMs);
    }

    client.on('ready', async () => {
        const botName = client.user.username;
        const minuteOffset = (index * 5) % 60;
        const cronTime = `${minuteOffset} * * * *`;

        console.log(`[${botName}] Scheduled at minute ${minuteOffset} of every hour.`);
        const job = schedule.scheduleJob(cronTime, sendClaimXpWithDelay);
        scheduledJobs.push(job);

        await sendClaimXpWithDelay();
    });

    client.login(token);
    activeBots.set(token, { client, scheduledJobs, messageCount });
}

function stopBot(token) {
    const botData = activeBots.get(token);
    if (!botData) return;

    const { client, scheduledJobs } = botData;

    scheduledJobs.forEach(job => job.cancel());

    try {
        client.destroy();
        console.log(`[${client.user?.username || 'Bot'}] Stopped and cleaned up.`);
    } catch (err) {
        console.error(`[Bot] ❌ Error during cleanup: ${err.message}`);
    }

    activeBots.delete(token);
}

function syncTokens() {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    const tokens = envConfig.TOKENS?.split(',').map(t => t.trim()).filter(Boolean) || [];

    const currentSet = new Set(tokens);
    const existingSet = new Set(activeBots.keys());

    // Start new tokens
    tokens.forEach((token, index) => {
        if (!activeBots.has(token)) {
            startBot(token, activeBots.size);
        }
    });

    // Stop removed tokens
    [...existingSet].forEach(token => {
        if (!currentSet.has(token)) {
            console.log(`[Bot] Token removed from .env — stopping bot.`);
            stopBot(token);
        }
    });

    if (tokens.length === 0) {
        console.error("❌ ERROR: No tokens found in .env.");
    }
}

// Initial sync
syncTokens();

// Repeat sync every hour
setInterval(syncTokens, 60 * 60 * 1000);

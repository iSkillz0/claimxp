const { Client } = require('discord.js-selfbot-v13');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const CHANNEL_ID = '1320253218403516467';    
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1377891976959098911/JLo3xZsGkEu72_7En5zknK5jlXtEpAK3DSC7Ddgz0ZA1jwy49Q3xRCmfOtty2MaWqHoq';     // 

const tokens = process.env.TOKENS?.split(',').map(t => t.trim()).filter(Boolean);

if (!tokens || tokens.length === 0) {
    console.error("❌ ERROR: No tokens found in environment variable TOKENS.");
    process.exit(1);
}

axios.post(WEBHOOK_URL, { content: '**✅ Script Started!**' }).catch(() => {});

function sendLog(botName, nextRun, count) {
    const unixTimestamp = Math.floor(nextRun.getTime() / 1000);
    const content = `**[${botName}] Sent $claimxp!** Next run: <t:${unixTimestamp}:R> (Total: ${count})`;
    console.log(content.replace(/\*\*/g, '')); 
    axios.post(WEBHOOK_URL, { content }).catch(() => {});
}

function startBot(token, botIndex) {
    const client = new Client();
    let messageCount = 0;

    async function sendClaimXp() {
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) {
                console.error(`[Bot ${botIndex}] ❌ Channel not found`);
                return;
            }

            await channel.send('$claimxp');
            messageCount++;

            const randomDelaySec = Math.floor(Math.random() * 1200) + 1;
            const nextRun = new Date(Date.now() + 3600 * 1000 + randomDelaySec * 1000);

            sendLog(client.user.username, nextRun, messageCount);

            setTimeout(sendClaimXp, 3600 * 1000 + randomDelaySec * 1000);
        } catch (err) {
            console.error(`[Bot ${botIndex}] ❌ Error: ${err.message}`);
        }
    }

    client.on('ready', () => {
        console.log(`[${client.user.username}] ✅ Logged in.`);
        sendClaimXp(); 
    });

    client.login(token);
}

tokens.forEach((token, i) => startBot(token, i + 1));
const { Client } = require('discord.js-selfbot-v13');
const dotenv = require('dotenv');
const axios = require('axios');
const schedule = require('node-schedule');

dotenv.config();

const applicationId = '1377731759625470053';
const guildId = '1299797029962383441';
const channelId = '1363338883508736160';
const commandId = '1381037772093132830';
const version = '1381037772093132831';

const webhookUrl = process.env.WEBHOOK;
if (!webhookUrl) {
  console.error("❌ ERROR: WEBHOOK env var missing");
  process.exit(1);
}

const tokens = process.env.TOKENS
  ?.split(',')
  .map(t => t.trim())
  .filter(Boolean);

if (!tokens || tokens.length === 0) {
  console.error("❌ ERROR: TOKENS env var missing or empty");
  process.exit(1);
}

// Webhook logger
async function logToWebhook(botName, nextRunDate, count) {
  const ts = Math.floor(nextRunDate.getTime() / 1000);
  const rel = `<t:${ts}:R>`;
  const content = `**[${botName}]** **Sent!**  **Next:** ${rel} (Total: ${count})`;

  console.log(content.replace(/\*\*/g, ''));
  try {
    await axios.post(webhookUrl, { content });
  } catch (err) {
    console.error(`❌ [${botName}] webhook log failed:`, err.message);
  }
}

// Slash command sender
async function sendSlash(token, session_id, botName) {
  const payload = {
    type: 2,
    application_id: applicationId,
    guild_id: guildId,
    channel_id: channelId,
    session_id,
    data: {
      version,
      id: commandId,
      guild_id: guildId,
      name: 'claimxp',
      type: 1,
      options: [],
      application_command: {
        id: commandId,
        type: 1,
        application_id: applicationId,
        guild_id: guildId,
        version,
        name: 'claimxp',
        description: 'Claim random XP (50120) once per hour',
        integration_types: [0],
        options: [],
        description_localized: 'Claim random XP (50120) once per hour',
        name_localized: 'claimxp',
      },
      attachments: [],
    },
    nonce: Date.now().toString(),
    analytics_location: 'slash_ui',
  };

  console.log(`[${botName}] Sending /claimxp with session_id: ${session_id}`);

  try {
    await axios.post(
      'https://discord.com/api/v9/interactions',
      payload,
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      }
    );
    return true;
  } catch (err) {
    if (err.response) {
      console.error(`❌ [${botName}] /claimxp failed:`, {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers,
      });
    } else {
      console.error(`❌ [${botName}] /claimxp failed:`, err.message);
    }
    return false;
  }
}

// Start the script
(async () => {
  await axios.post(webhookUrl, { content: '**Scripted Start!**' });

  tokens.forEach((token, idx) => {
    const client = new Client();
    let session_id = null;
    let messageCount = 0;

    client.on('ready', async () => {
      const botName = client.user?.username || `Bot${idx + 1}`;

      function updateSessionId() {
        session_id = client.ws.shards.first().sessionId;
        console.log(`[${botName}] Updated session_id: ${session_id}`);
      }

      updateSessionId();

      client.ws.on('SESSION_REPLACE', newSessionId => {
        session_id = newSessionId;
        console.log(`[${botName}] SESSION_REPLACE event: session_id updated to ${session_id}`);
      });

      client.ws.on('RESUME', () => {
        updateSessionId();
        console.log(`[${botName}] RESUME event: session_id updated to ${session_id}`);
      });

      client.ws.on('SHARD_RECONNECT', () => {
        updateSessionId();
        console.log(`[${botName}] SHARD_RECONNECT event: session_id updated to ${session_id}`);
      });

      const job = schedule.scheduleJob('0 * * * *', async () => {
        const delay = (Math.floor(Math.random() * 1200) + 1) * 1000;
        setTimeout(async () => {
          if (!session_id) {
            console.warn(`[${botName}] Skipping run - no session_id yet`);
            return;
          }

          const success = await sendSlash(token, session_id, botName);
          if (success) {
            messageCount++;
            const next = new Date(Date.now() + 60 * 60 * 1000);
            await logToWebhook(botName, next, messageCount);
          }
        }, delay);
      });

      job.invoke();
    });

    client.login(token).catch(err => {
      console.error(`❌ [Bot${idx + 1}] login failed:`, err.message);
    });
  });
})();

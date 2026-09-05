const express = require('express');
const axios = require('axios');

const ID = "710522729085";
const TOKEN = "3eb1d6c5a0984d54baa303ec1f723f173d80bffa0e064e66b0";
const API_URL = `https://api.green-api.com/waInstance${ID}`;

const app = express();
app.use(express.json());

let reminders = [];

function parseTime(text) {
  text = text.toLowerCase();
  let ms = 0;
  if (text.includes('4 hr') || text.includes('4hr') || text.includes('4 hour')) ms = 4 * 60 * 60 * 1000;
  else if (text.includes('1 day') || text.includes('tomorrow')) ms = 24 * 60 * 60 * 1000;
  else if (text.includes('2 days')) ms = 48 * 60 * 60 * 1000;
  else if (text.includes('3 days')) ms = 72 * 60 * 60 * 1000;
  else if (text.includes('next week') || text.includes('1 week')) ms = 7 * 24 * 60 * 60 * 1000;
  return ms;
}

async function sendMessage(chatId, message) {
  await axios.post(`${API_URL}/sendMessage/${TOKEN}`, {
    chatId: chatId,
    message: message
  });
}

async function checkNotifications() {
  try {
    const res = await axios.get(`${API_URL}/receiveNotification/${TOKEN}`);
    if (!res.data || !res.data.body) return;

    const notification = res.data;
    const body = notification.body;
    
    // Only handle incoming messages
    if (body.typeWebhook === 'incomingMessageReceived') {
      const messageData = body.messageData;
      const text = (messageData.textMessageData?.textMessage || messageData.extendedTextMessageData?.text || '').toLowerCase();
      const chatId = body.senderData.chatId;

      if (text.includes('follow up')) {
        const delay = parseTime(text);
        if (delay > 0) {
          const when = new Date(Date.now() + delay);
          await sendMessage(chatId, `⏰ Got it! I will remind you about "${text}" on ${when.toLocaleString()}`);
          setTimeout(async () => {
            await sendMessage(chatId, `🔔 REMINDER: ${text}`);
          }, delay);
        } else {
          await sendMessage(chatId, `Use like: "follow up in 4 hr" or "follow up in 1 day"`);
        }
      }
    }
    
    // Delete notification
    await axios.delete(`${API_URL}/deleteNotification/${TOKEN}/${notification.receiptId}`);

  } catch (e) {
    // ignore
  }
}

setInterval(checkNotifications, 3000);
app.get('/', (req, res) => res.send('Bot is running ✅'));
app.listen(process.env.PORT || 3000, () => console.log('Bot running'));

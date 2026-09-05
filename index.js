const express = require('express');
const axios = require('axios');

const ID = "710522729085";
const TOKEN = "3eb1d6c5a0984d54baa303ec1f723f173d80bffa0e064e66b0";
const API_URL = `https://api.green-api.com/waInstance${ID}`;

const app = express();

function parseTime(text) {
  text = text.toLowerCase();
  if (text.includes('1 hr') || text.includes('1hr')) return 60 * 1000; // 1 min for testing, change to 60*60*1000 later
  if (text.includes('4 hr') || text.includes('4hr') || text.includes('4 hour')) return 4 * 60 * 60 * 1000;
  if (text.includes('1 day') || text.includes('tomorrow')) return 24 * 60 * 60 * 1000;
  if (text.includes('2 days')) return 48 * 60 * 60 * 1000;
  if (text.includes('3 days')) return 72 * 60 * 60 * 1000;
  if (text.includes('next week') || text.includes('1 week') || text.includes('week')) return 7 * 24 * 60 * 60 * 1000;
  return 0;
}

async function sendMessage(chatId, message) {
  console.log(`>>> Sending to ${chatId}: ${message}`);
  await axios.post(`${API_URL}/sendMessage/${TOKEN}`, { chatId, message });
}

async function checkNotifications() {
  try {
    const res = await axios.get(`${API_URL}/receiveNotification/${TOKEN}`);
    if (!res.data?.body) return;
    
    const body = res.data.body;
    console.log(`<< Received: ${body.typeWebhook}`);

    if (body.typeWebhook === 'incomingMessageReceived' || body.typeWebhook === 'outgoingMessageReceived') {
      const msgData = body.messageData;
      const text = (msgData?.textMessageData?.textMessage || msgData?.extendedTextMessageData?.text || '').toLowerCase();
      const chatId = body.senderData.chatId;
      
      console.log(`Message: "${text}" | Chat: ${chatId}`);

      if (text.includes('follow up')) {
        const delay = parseTime(text);
        console.log(`Follow up found, delay=${delay}`);
        if (delay > 0) {
          await sendMessage(chatId, `⏰ Done! Reminder set for "${text}"`);
          setTimeout(async () => {
            await sendMessage(chatId, `🔔 REMINDER: ${text} - Time to follow up!`);
          }, delay);
        } else {
          await sendMessage(chatId, `Use: "follow up in 1 hr / 4 hr / 1 day / 2 days / next week"`);
        }
      }
    }
    await axios.delete(`${API_URL}/deleteNotification/${TOKEN}/${res.data.receiptId}`);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

console.log("Bot starting...");
setInterval(checkNotifications, 2000);
app.get('/', (req, res) => res.send('Bot running ✅'));
app.listen(process.env.PORT || 3000, () => console.log('Bot running'));

const axios = require('axios');

const BASE_URL = `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}`;

async function sendWhatsApp(toNumber, message, prospectId) {
  try {
    const normalized = normalizeNumber(toNumber);
    if (!normalized) throw new Error(`Invalid number: ${toNumber}`);

    const response = await axios.post(
      `${BASE_URL}/sendMessage/${process.env.GREEN_API_TOKEN}`,
      { chatId: `${normalized}@c.us`, message }
    );

    console.log(`[WhatsApp] Sent to ${normalized} | Prospect: ${prospectId}`);
    return { success: true, messageId: response.data.idMessage, channel: 'whatsapp' };
  } catch (err) {
    console.error(`[WhatsApp] Failed for ${toNumber}:`, err.message);
    return { success: false, error: err.message, channel: 'whatsapp' };
  }
}

async function checkWhatsAppExists(number) {
  try {
    const normalized = normalizeNumber(number);
    const response = await axios.post(
      `${BASE_URL}/checkWhatsapp/${process.env.GREEN_API_TOKEN}`,
      { phoneNumber: normalized }
    );
    return response.data.existsWhatsapp === true;
  } catch {
    return false;
  }
}

function normalizeNumber(number) {
  if (!number) return null;
  let clean = number.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (clean.length < 10) return null;
  return clean;
}

function isOptOut(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  const stopWords = [
    'stop', 'unsubscribe', 'remove', 'dont contact', "don't contact",
    'no thanks', 'not interested', 'leave me alone',
    'توقف', 'إلغاء', 'لا شكراً', 'مو مهتم', 'ما أبي', 'وقف'
  ];
  return stopWords.some(w => lower.includes(w));
}

module.exports = { sendWhatsApp, checkWhatsAppExists, normalizeNumber, isOptOut };

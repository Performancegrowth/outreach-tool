const Prospect = require('../models/Prospect');
const { sendWhatsApp, isOptOut } = require('./sender/whatsapp');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function tagSentiment(replyText, language) {
  const prompt = language === 'ar'
    ? `صنّف هذا الرد: interested / not_now / wrong_person / already_have_someone / unsubscribe / other. كلمة واحدة فقط.\nالرد: "${replyText}"`
    : `Classify this reply: interested / not_now / wrong_person / already_have_someone / unsubscribe / other. One word only.\nReply: "${replyText}"`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10, temperature: 0
    });
    const tag = completion.choices[0].message.content.trim().toLowerCase();
    const valid = ['interested', 'not_now', 'wrong_person', 'already_have_someone', 'unsubscribe', 'other'];
    return valid.includes(tag) ? tag : 'other';
  } catch {
    return 'other';
  }
}

async function suggestReply(prospect, replyText, sentiment, language) {
  const context = `Business: ${prospect.businessName}, Niche: ${prospect.niche}, Their reply: "${replyText}", Sentiment: ${sentiment}`;
  const prompt = language === 'ar'
    ? `اقترح رد قصير وطبيعي باللغة العربية.\n${context}`
    : `Suggest a short natural reply in English.\n${context}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150, temperature: 0.7
    });
    return completion.choices[0].message.content.trim();
  } catch {
    return null;
  }
}

async function alertYou(prospect, replyText, sentiment, suggestedReply) {
  const emoji = { interested: '🔥', not_now: '⏳', wrong_person: '❌', already_have_someone: '⚠️', unsubscribe: '🚫', other: '💬' }[sentiment] || '💬';

  const alert = [
    `${emoji} NEW REPLY`,
    `Business: ${prospect.businessName}`,
    `Niche: ${prospect.niche} | Region: ${prospect.region}`,
    `Their reply: "${replyText}"`,
    `Tag: ${sentiment}`,
    suggestedReply ? `\nSuggested reply:\n"${suggestedReply}"` : ''
  ].filter(Boolean).join('\n');

  await sendWhatsApp(process.env.YOUR_WHATSAPP_NUMBER, alert, 'alert');
}

async function handleReply(prospectId, replyText, channel) {
  const prospect = await Prospect.findById(prospectId);
  if (!prospect) return;

  if (isOptOut(replyText)) {
    prospect.status = 'unsubscribed';
    prospect.followUpsPaused = true;
    await prospect.save();
    return;
  }

  const sentiment = await tagSentiment(replyText, prospect.language);
  const suggested = await suggestReply(prospect, replyText, sentiment, prospect.language);

  const lastMessage = prospect.history[prospect.history.length - 1];
  if (lastMessage) {
    lastMessage.reply = replyText;
    lastMessage.repliedAt = new Date();
    lastMessage.replyTag = sentiment;
    lastMessage.suggestedReply = suggested;
  }

  prospect.status = sentiment === 'interested' ? 'interested' : 'replied';
  prospect.followUpsPaused = true;
  await prospect.save();

  await alertYou(prospect, replyText, sentiment, suggested);
  return { sentiment, suggestedReply: suggested };
}

module.exports = { handleReply, tagSentiment, suggestReply };

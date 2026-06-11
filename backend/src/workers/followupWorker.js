const { Queue, Worker, QueueScheduler } = require('bullmq');
const mongoose = require('mongoose');
const Prospect = require('../models/Prospect');
const { sendWhatsApp, checkWhatsAppExists } = require('../services/sender/whatsapp');
const { sendEmail, getSubject } = require('../services/sender/email');
const { generateMessages } = require('../services/personalization');

const connection = { url: process.env.UPSTASH_REDIS_URL };

const STEP_DELAYS_MS = {
  1: 0,
  2: 3 * 24 * 60 * 60 * 1000,
  3: 7 * 24 * 60 * 60 * 1000,
  4: 14 * 24 * 60 * 60 * 1000
};

const followupQueue = new Queue('followups', { connection });
new QueueScheduler('followups', { connection });

async function scheduleFollowups(prospectId) {
  for (const step of [1, 2, 3, 4]) {
    await followupQueue.add(
      'send-step',
      { prospectId, step },
      {
        delay: STEP_DELAYS_MS[step],
        jobId: `${prospectId}-step-${step}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      }
    );
  }
}

async function cancelFollowups(prospectId) {
  for (const step of [2, 3, 4]) {
    const job = await followupQueue.getJob(`${prospectId}-step-${step}`);
    if (job) await job.remove();
  }
}

new Worker('followups', async (job) => {
  const { prospectId, step } = job.data;
  await mongoose.connect(process.env.MONGODB_URI);
  const prospect = await Prospect.findById(prospectId);
  if (!prospect) return;

  if (['replied','interested','booked','closed','unsubscribed','rejected'].includes(prospect.status)) return;
  if (prospect.followUpsPaused) return;

  const { messages } = await generateMessages(prospect, prospect.scrapedData || {});
  const messageText = messages[`msg${step}`];
  if (!messageText) return;

  const lastChannel = prospect.lastChannelUsed;
  let result = null;
  let channel = null;

  if (prospect.whatsapp && lastChannel !== 'whatsapp') {
    const exists = await checkWhatsAppExists(prospect.whatsapp);
    if (exists) {
      result = await sendWhatsApp(prospect.whatsapp, messageText, prospectId);
      channel = 'whatsapp';
    }
  }

  if (!result?.success && prospect.emails?.length && lastChannel !== 'email') {
    const subject = getSubject(prospect.niche, prospect.language, step);
    result = await sendEmail({ to: prospect.emails[0], subject, body: messageText, senderEmail: prospect.senderEmail, prospectId });
    channel = 'email';
  }

  if (!result?.success) return;

  prospect.history.push({ channel, step, message: messageText, sentAt: new Date(), delivered: true });
  prospect.currentStep = step;
  prospect.lastContactedAt = new Date();
  prospect.lastChannelUsed = channel;
  if (prospect.status === 'cold') prospect.status = 'messaged';
  if (step < 4) prospect.nextFollowUpAt = new Date(Date.now() + STEP_DELAYS_MS[step + 1] - STEP_DELAYS_MS[step]);

  await prospect.save();
}, { connection });

module.exports = { scheduleFollowups, cancelFollowups, followupQueue };

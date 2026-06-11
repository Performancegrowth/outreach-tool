const axios = require('axios');

async function sendEmail({ to, subject, body, senderEmail, prospectId }) {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Mojtaba | Mahboob Growth', email: senderEmail },
        to: [{ email: to }],
        subject,
        textContent: body + getUnsubscribeFooter(senderEmail)
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[Email] Sent to ${to} | Prospect: ${prospectId}`);
    return { success: true, messageId: response.data.messageId, channel: 'email' };
  } catch (err) {
    console.error(`[Email] Failed for ${to}:`, err.response?.data?.message || err.message);
    return { success: false, error: err.message, channel: 'email' };
  }
}

function getUnsubscribeFooter(senderEmail) {
  return `\n\n---\nTo stop receiving messages, reply with "STOP" or email ${senderEmail} with subject "Unsubscribe".`;
}

function getSubject(niche, language, step) {
  const subjects = {
    clinic: {
      ar: { 1: 'ملاحظة سريعة عن عيادتك', 2: 'كيف العيادات الناجحة تستعيد مرضاها', 3: 'تجربة 7 أيام — أداء فقط', 4: 'آخر رسالة مني' },
      en: { 1: 'Quick note about your clinic', 2: 'How top clinics reactivate old patients', 3: '7-day pilot — performance only', 4: 'Last message from me' }
    },
    gym: {
      ar: { 1: 'ملاحظة عن نادي الجيم', 2: 'كيف الأندية تستعيد الأعضاء الصامتين', 3: 'تجربة قصيرة — أداء فقط', 4: 'آخر رسالة' },
      en: { 1: 'Quick note about your gym', 2: 'How top gyms recover silent members', 3: 'Short pilot — performance only', 4: 'Last message from me' }
    },
    real_estate: {
      ar: { 1: 'ملاحظة عن الليدات القديمة', 2: 'الاستفسارات القديمة — فرصة ضائعة', 3: 'تجربة إعادة تفعيل — أداء فقط', 4: 'آخر رسالة' },
      en: { 1: 'Quick note about your old leads', 2: 'Old inquiries — missed opportunity', 3: 'Reactivation pilot — performance only', 4: 'Last message from me' }
    }
  };
  return subjects[niche]?.[language]?.[step] || 'Quick note about your business';
}

function getDailyLimit(accountAgeDays) {
  if (accountAgeDays <= 7) return 10;
  if (accountAgeDays <= 14) return 30;
  if (accountAgeDays <= 21) return 60;
  return 100;
}

module.exports = { sendEmail, getSubject, getDailyLimit };

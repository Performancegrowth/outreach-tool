const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildObservation(scrapedData) {
  const { reviews, instagramPosts, linkedinPosts, competitors } = scrapedData || {};

  if (reviews?.previousYearCount && reviews?.currentYearCount) {
    const drop = Math.round(
      ((reviews.previousYearCount - reviews.currentYearCount) / reviews.previousYearCount) * 100
    );
    if (drop > 30) {
      return {
        type: 'review_drop',
        text: `${reviews.previousYearCount} reviews in ${reviews.previousYear}, only ${reviews.currentYearCount} in ${reviews.currentYear} — a ${drop}% drop`,
        source: 'google_maps'
      };
    }
  }

  if (instagramPosts?.lastPostDaysAgo > 60) {
    return {
      type: 'posting_slowdown',
      text: `last Instagram post was ${instagramPosts.lastPostDaysAgo} days ago`,
      source: 'instagram'
    };
  }

  if (competitors?.topCompetitorReviews && reviews?.currentYearCount) {
    const gap = competitors.topCompetitorReviews - reviews.currentYearCount;
    if (gap > 50) {
      return {
        type: 'competitor_gap',
        text: `your top local competitor has ${competitors.topCompetitorReviews} reviews this year vs your ${reviews.currentYearCount}`,
        source: 'google_maps'
      };
    }
  }

  return {
    type: 'general',
    text: 'customer engagement has slowed down recently',
    source: 'google_maps'
  };
}

const TEMPLATES = {
  clinic: {
    ar: {
      msg1: (name, obs) => `مرحبا ${name}، لاحظت أن ${obs.text}. هذا عادةً يعني أن المرضى القدامى توقفوا عن الرجوع.`,
      msg2: () => `معظم العيادات تخسر 40% من مرضاها بصمت — ما يلغون المواعيد، بس يوقفون الحجز. اللي يستعيدهم أسرع مو اللي عنده أحسن إعلان، اللي عنده نظام متابعة واضح.`,
      msg3: (name, email) => `أشتغل على تجارب 7-14 يوم لإعادة المرضى القدامى — أداء فقط، لا تدفع إلا إذا رجعوا فعلاً. هل نجرب؟\nواتساب: +639934916315\n${email}\nmahboobgrowth.netlify.app`,
      msg4: () => `آخر رسالة — هل الموضوع ما يناسبك الحين؟ لا مشكلة، أحتفظ بملاحظاتي إذا تغير رأيك.`
    },
    en: {
      msg1: (name, obs) => `Hi ${name}, I noticed your clinic had ${obs.text}. That usually means repeat patients stopped returning.`,
      msg2: () => `Most clinics lose 40% of patients silently — they don't cancel, they just stop booking. The ones who recover them fastest aren't the ones with the best ads, they're the ones with a structured reactivation sequence.`,
      msg3: (name, email) => `I run 7–14 day pilots that reactivate old patients — performance only, you pay nothing unless they actually come back. Want to test it?\nWhatsApp: +639934916315 | ${email}\nmahboobgrowth.netlify.app`,
      msg4: () => `Last follow-up — does this not make sense right now? No problem, I'll keep my notes if you change your mind.`
    }
  },
  gym: {
    ar: {
      msg1: (name, obs) => `مرحبا ${name}، لاحظت أن ${obs.text}. هذا غالباً يدل على أن الأعضاء القدامى توقفوا عن التجديد.`,
      msg2: () => `معظم الأندية تخسر 40% من أعضائها بهدوء — ما يلغون، بس يوقفون الحضور. النادي اللي يستعيدهم مو اللي عنده أحسن عروض، اللي عنده متابعة منظمة.`,
      msg3: (name, email) => `أشتغل على تجارب قصيرة لإعادة الأعضاء القدامى — أداء فقط، لا تدفع إلا إذا رجعوا. هل نجرب؟\nواتساب: +639934916315\n${email}\nmahboobgrowth.netlify.app`,
      msg4: () => `آخر رسالة — إذا ما كان الوقت مناسب، لا مشكلة. أحتفظ بملاحظاتي إذا احتجت لاحقاً.`
    },
    en: {
      msg1: (name, obs) => `Hi ${name}, I noticed your gym had ${obs.text}. That usually means retention dropped, not acquisition.`,
      msg2: () => `Most gyms lose 40% of members silently — they don't cancel, they just stop coming. The ones who recover them fastest aren't the ones with the best ads, they're the ones with a structured reactivation sequence.`,
      msg3: (name, email) => `I run short pilots that reactivate old members — performance only, you pay nothing unless they actually come back. Want to test it?\nWhatsApp: +639934916315 | ${email}\nmahboobgrowth.netlify.app`,
      msg4: () => `Last follow-up — does this not make sense right now? No problem, I'll keep my notes if you change your mind.`
    }
  },
  real_estate: {
    ar: {
      msg1: (name, obs) => `مرحبا ${name}، لاحظت أن ${obs.text}. هذا عادةً يعني أن الليدات القديمة ما اتتابعت كفاية.`,
      msg2: () => `معظم وكالات العقار عندها قائمة من الاستفسارات القديمة اللي ما وصلت لصفقة — مو لأن العميل ما كان مهتم، بس لأن المتابعة توقفت في وقت غلط.`,
      msg3: (name, email) => `أشتغل على إعادة تفعيل الليدات القديمة — أداء فقط، لا تدفع إلا على صفقة تتم فعلاً. هل نجرب على 50 ليد؟\nواتساب: +639934916315\n${email}\nmahboobgrowth.netlify.app`,
      msg4: () => `آخر رسالة — إذا ما كان الوقت مناسب، لا مشكلة. أحتفظ بملاحظاتي إذا احتجت.`
    },
    en: {
      msg1: (name, obs) => `Hi ${name}, I noticed your agency had ${obs.text}. That usually means old leads went cold without proper follow-up.`,
      msg2: () => `Most real estate agencies have a pile of old inquiries that never converted — not because the prospect wasn't interested, but because follow-up stopped at the wrong moment.`,
      msg3: (name, email) => `I run reactivation pilots on old lead lists — performance only, you pay nothing unless a deal closes. Want to test on 50 leads?\nWhatsApp: +639934916315 | ${email}\nmahboobgrowth.netlify.app`,
      msg4: () => `Last follow-up — does this not make sense right now? No problem, I'll keep my notes if you change your mind.`
    }
  }
};

async function generateMessages(prospect, scrapedData) {
  const { name, niche, language, senderEmail } = prospect;
  const observation = buildObservation(scrapedData);
  const templates = TEMPLATES[niche]?.[language] || TEMPLATES[niche]?.en;
  if (!templates) throw new Error(`No template for niche: ${niche}`);

  const raw = {
    msg1: templates.msg1(name, observation),
    msg2: templates.msg2(name),
    msg3: templates.msg3(name, senderEmail),
    msg4: templates.msg4(name)
  };

  try {
    const prompt = language === 'ar'
      ? `أنت كاتب رسائل تواصل محترف. اجعل هذه الرسائل أكثر طبيعية بدون تغيير المعنى أو حذف السطر الدليل: "${observation.text}". أرجع JSON فقط: {"msg1":"...","msg2":"...","msg3":"...","msg4":"..."}`
      : `You are a professional outreach writer. Make these messages feel more natural without changing the meaning or removing the evidence line: "${observation.text}". Return JSON only: {"msg1":"...","msg2":"...","msg3":"...","msg4":"..."}`;

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(raw) }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const text = completion.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    return { observation, messages: JSON.parse(clean) };
  } catch {
    return { observation, messages: raw };
  }
}

module.exports = { generateMessages, buildObservation };

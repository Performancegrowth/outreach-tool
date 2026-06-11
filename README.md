# Outreach Tool — Automated Prospect Finder & Personalized Outreach Engine

> Finds businesses that need lead reactivation, reads their real data, writes a unique personalized message about THEIR specific business, sends it safely across WhatsApp + Email + LinkedIn, follows up automatically, and alerts you the moment they reply.

---

## What This Tool Does

This is **not** a mass-blast tool. It finds businesses showing signs of dormant customer problems (review drops, posting slowdowns, engagement loss), writes one specific observation about their business, and sends a humanized sequence that warms them up before you ever speak to them manually.

**You only step in when they reply warm.**

---

## Three Repos — Three Jobs

| Repo | Job | Status |
|------|-----|--------|
| `mahboubgrowth-site` | Landing page — converts visitors into booked calls | Live |
| `outreach-tool` (this repo) | Finds prospects, sends personalized outreach, tracks replies | Building now |
| `client-campaign-manager` | Runs reactivation campaigns FOR clients who hire you | After this works |

---

## Target Niches

- Clinics (dental, medical, wellness)
- Gyms (fitness studios, personal trainers, coaches)
- Real Estate (agencies, brokers, developers)

---

## Target Regions

- UAE (Dubai, Abu Dhabi, Sharjah)
- Saudi Arabia (Riyadh, Jeddah, Dammam)
- USA (major cities)
- UK + Europe (London, Germany, Spain, France)

---

## Tech Stack (All Free Tier)

| Layer | Tool | Purpose |
|-------|------|---------|
| Prospect Finding | Apify | Scrapes Google Maps, LinkedIn, Instagram, Facebook |
| Personalization | Groq | Generates Arabic + English personalized messages |
| Email Sending | Brevo | 300 emails/day free, warm-up mode, bounce tracking |
| WhatsApp Sending | Green API | Free tier, connects real WhatsApp Business number |
| Queue + Scheduler | Upstash Redis | Follow-up scheduling, rate limiting |
| Database | MongoDB Atlas | Prospect storage, deduplication, campaign tracking |
| Dashboard | Vercel | Hosts the React dashboard |

---

## Email Routing

| Email | Region |
|-------|--------|
| `mahboubgrowth@gmail.com` | MENA — UAE, Saudi Arabia |
| `m0o.mahboob@gmail.com` | USA, UK, Europe |

---

## Contact Info Included in Messages (Message 3 only)

- WhatsApp: +639934916315
- Email: region-specific (see routing above)
- LinkedIn: linkedin.com/in/mojtaba-al-mahboob-33b826193
- Website: mahboobgrowth.netlify.app

---

## Message Sequence

### Message 1 — Warm Observation (Day 1)
- One specific, sourced observation about THEIR business
- No pitch. No links. No CTA.
- Arabic for MENA. English for USA/Europe.

**Example (Clinic — UAE):**
> مرحبا دكتور أحمد، لاحظت أن عيادتك كان عندها 220 تقييم على جوجل في 2022 وهذي السنة بس 18. هذا عادةً يعني أن المرضى القدامى توقفوا عن الرجوع.

**Example (Gym — USA):**
> Hi [Name], I noticed your gym had consistent reviews through 2022 but dropped significantly since. That usually means retention dropped, not acquisition. I specialize in exactly that.

---

### Message 2 — Educate + Value (Day 3, no reply)
- Give insight about the problem
- Still no pitch. Still no links.
- Show you understand their specific situation.

**Example (Gym — USA):**
> Most gyms lose 40% of members silently — they don't cancel, they just stop coming. The ones who recover them fastest aren't the ones with the best ads, they're the ones with a structured reactivation sequence.

---

### Message 3 — Soft CTA (Day 7, no reply)
- NOW mention what you do, briefly
- Include: WhatsApp, email (region-specific), LinkedIn, website
- Performance-only offer, 7-14 day pilot

**Example (Clinic — UAE):**
> أشتغل على تجارب 7-14 يوم لإعادة المرضى القدامى — أداء فقط، لا تدفع إلا إذا رجعوا. هل نجرب؟
> واتساب: +639934916315 | mahboubgrowth@gmail.com | mahboobgrowth.netlify.app

---

### Message 4 — Final Follow-up (Day 14, no reply)
- One line. Last touch.
- No pressure.

**Example:**
> آخر رسالة — هل الموضوع ما يناسبك الحين؟ لا مشكلة، أحتفظ بملاحظاتي عن عيادتك إذا تغير رأيك.

---

## Sending Rules (Spam Prevention)

- Max 10 emails/hour per account
- 5–15 minute random gaps between emails
- Warm-up: Week 1 (5–10/day) → Week 2 (20–30/day) → Week 3+ ramp
- WhatsApp: primary channel, sent at local morning time (9–11am per timezone)
- Email: fallback if no WhatsApp found
- LinkedIn: tertiary, only if no WhatsApp and no email
- Auto-pause if: bounce rate >5%, spam complaints >2/day, open rate drops below 10%
- STOP/unsubscribe detection: auto-remove prospect immediately on any opt-out signal

---

## Unfair Advantage Features

### Intelligence Layer (MVP)
- Review trend analysis — exact drop percentage, specific time period
- Owner name extraction — from Google Maps, LinkedIn, website About page
- Time zone sending — messages sent at 9–11am local time per region
- Instant WhatsApp reply alert — you get notified the moment anyone replies
- Channel memory — never repeats same channel twice in a row

### Intelligence Layer (Week 3–4)
- Competitor comparison — "your competitor down the street has 340 reviews this year, you have 12"
- Social media activity drop detection — last post date, engagement drop percentage
- Response time predictor — businesses that reply to Google reviews get flagged as high priority
- Auto-tag reply sentiment — "interested", "not now", "wrong person", "already have someone"
- Suggested reply — Groq generates suggested manual response for each reply type

### Intelligence Layer (Month 2)
- A/B testing — two versions of Message 1, auto-promotes winner after 50 sends
- Template library — every message you edit manually gets saved as a winning template
- Multi-number WhatsApp rotation — auto-switches if number gets flagged
- Seasonal pattern detection — "your gym reviews spike every January but dropped 80% this January"

---

## Prospect Scoring (0–100)

| Signal | Weight |
|--------|--------|
| Fit score (niche match, business type) | 30% |
| Engagement score (review/post drop) | 30% |
| Contactability (valid WhatsApp, verified email) | 20% |
| Value score (business size, estimated AOV) | 20% |

- Score ≥70 → Human review queue (top 10%, manual approve before send)
- Score 40–69 → Auto-send
- Score <40 → Discard

---

## Human Review Queue

Top 10% of prospects by score go to a review queue before any message is sent. You see:
- The scraped evidence line used in the message
- All 4 message variants
- Business contact info
- One-click: Approve / Edit / Reject

---

## Deduplication Rules

A prospect is considered a duplicate if any of these match an existing record:
- Same normalized phone number
- Same email address
- Same business name + city (fuzzy match)

Duplicates are merged into one record with all source tags kept.

---

## Dashboard (Vercel)

Shows:
- Prospects found today / total
- Messages sent / replied / interested / booked
- Follow-ups due today
- Account health alerts (bounce rate, block rate, open rate)
- Human review queue
- Full prospect pipeline: cold → messaged → replied → interested → booked → closed

---

## Compliance

- Unsubscribe link auto-appended to every email
- STOP keyword detection on WhatsApp — auto-remove on reply
- Consent note in every message sequence
- GDPR + CAN-SPAM compliant templates
- Audit log: every send, every reply, every opt-out — timestamped

---

## Environment Variables Needed

```
APIFY_API_TOKEN=
GROQ_API_KEY=
BREVO_API_KEY=
SENDER_EMAIL_MENA=mahboubgrowth@gmail.com
SENDER_EMAIL_GLOBAL=m0o.mahboob@gmail.com
GREEN_API_INSTANCE_ID=
GREEN_API_TOKEN=
UPSTASH_REDIS_URL=
MONGODB_URI=
```

---

## Build Timeline

### Week 1–2 (MVP)
- Prospect ingestion (Apify → Google Maps + LinkedIn)
- Deduplication + scoring
- Personalization engine (Groq, Arabic + English)
- Safe sender (Green API + Brevo, rate limiting, warm-up)
- Follow-up scheduler (Day 1/3/7/14)
- Instant reply alert (WhatsApp notification to +639934916315)
- Basic dashboard (prospects, status, health)

### Week 3–4
- Competitor comparison layer
- Social media drop detection
- Reply sentiment tagging + suggested replies
- Smart time zone scheduling
- CRM pipeline view

### Month 2
- A/B testing engine
- Template library
- Multi-number WhatsApp rotation
- Full analytics + conversion tracking

---

## After This Works → Repo 3

Once you have 2–3 paying clients, `client-campaign-manager` gets built. That tool handles:
- Client onboarding + consent capture
- Upload of client's dormant contact lists (5,000+ contacts)
- Per-client campaign builder
- Per-client reporting + revenue tracking
- 20% commission auto-calculation
- Client portal

---

*Built for: Mahboob Growth — mahboobgrowth.netlify.app*

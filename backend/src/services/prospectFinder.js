const axios = require('axios');
const Prospect = require('../models/Prospect');
const { buildObservation } = require('./personalization');
const { scheduleFollowups } = require('../workers/followupWorker');
const { checkWhatsAppExists, normalizeNumber } = require('./sender/whatsapp');

const APIFY_BASE = 'https://api.apify.com/v2';
const TOKEN = process.env.APIFY_API_TOKEN;

const NICHE_QUERIES = {
  clinic: ['dental clinic', 'medical clinic', 'wellness center'],
  gym: ['gym', 'fitness studio', 'personal trainer'],
  real_estate: ['real estate agency', 'property broker']
};

const REGION_CITIES = {
  UAE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  Saudi: ['Riyadh', 'Jeddah', 'Dammam'],
  USA: ['New York', 'Los Angeles', 'Chicago', 'Miami'],
  UK: ['London', 'Manchester', 'Birmingham'],
  Europe: ['Berlin', 'Madrid', 'Paris']
};

function getRegion(city) {
  for (const [region, cities] of Object.entries(REGION_CITIES)) {
    if (cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) return region;
  }
  return 'USA';
}

function analyzeReviews(reviews) {
  if (!reviews?.length) return null;
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  return {
    currentYearCount: reviews.filter(r => new Date(r.publishedAtDate || 0).getFullYear() === currentYear).length,
    previousYearCount: reviews.filter(r => new Date(r.publishedAtDate || 0).getFullYear() === previousYear).length,
    currentYear, previousYear, totalCount: reviews.length
  };
}

function scoreProspect(place, reviewAnalysis) {
  let fitScore = 70;
  let engagementScore = 0;
  let contactabilityScore = 0;
  let valueScore = 0;

  if (reviewAnalysis) {
    const { previousYearCount, currentYearCount } = reviewAnalysis;
    if (previousYearCount > 0 && currentYearCount < previousYearCount) {
      const drop = ((previousYearCount - currentYearCount) / previousYearCount) * 100;
      engagementScore = drop >= 70 ? 100 : drop >= 50 ? 80 : drop >= 30 ? 60 : 30;
    }
    if (previousYearCount >= 10 && currentYearCount <= 5) engagementScore = Math.max(engagementScore, 90);
  }

  if (place.phone) contactabilityScore += 50;
  if (place.website) contactabilityScore += 30;
  contactabilityScore = Math.min(contactabilityScore, 100);

  if (place.totalScore >= 4.0) valueScore += 40;
  if (place.reviewsCount >= 50) valueScore += 30;
  if (place.reviewsCount >= 100) valueScore += 30;
  valueScore = Math.min(valueScore, 100);

  return { fitScore, engagementScore, contactabilityScore, valueScore };
}

async function isDuplicate(phone, businessName, city) {
  const normalized = phone ? normalizeNumber(phone) : null;
  const query = { $or: [] };
  if (normalized) query.$or.push({ normalizedPhone: normalized });
  if (businessName && city) query.$or.push({
    businessName: new RegExp(businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    city: new RegExp(city, 'i')
  });
  if (!query.$or.length) return false;
  return !!(await Prospect.findOne(query));
}

async function waitForRun(runId) {
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await axios.get(`${APIFY_BASE}/actor-runs/${runId}?token=${TOKEN}`);
    const status = statusRes.data.data.status;
    if (status === 'SUCCEEDED') {
      const datasetId = statusRes.data.data.defaultDatasetId;
      const dataRes = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items?token=${TOKEN}&clean=true`);
      return dataRes.data;
    }
    if (['FAILED','ABORTED','TIMED-OUT'].includes(status)) return [];
  }
  return [];
}

async function scrapeGoogleMaps(query, city, maxResults = 20) {
  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/compass~crawler-google-places/runs?token=${TOKEN}`,
      { searchStringsArray: [`${query} in ${city}`], maxCrawledPlacesPerSearch: maxResults, includeReviews: true, maxReviews: 50, reviewsSort: 'newest' }
    );
    return await waitForRun(runRes.data.data.id);
  } catch (err) {
    console.error(`[Finder] Scrape failed: ${err.message}`);
    return [];
  }
}

async function findProspects({ niche, region, maxPerCity = 20 }) {
  const queries = NICHE_QUERIES[niche];
  const cities = REGION_CITIES[region];
  const found = [];
  const skipped = { duplicate: 0, noContact: 0, lowScore: 0 };

  for (const city of cities) {
    for (const query of queries.slice(0, 2)) {
      const places = await scrapeGoogleMaps(query, city, maxPerCity);

      for (const place of places) {
        try {
          if (!place.phone && !place.website) { skipped.noContact++; continue; }
          if (await isDuplicate(place.phone, place.title, city)) { skipped.duplicate++; continue; }

          const reviewAnalysis = analyzeReviews(place.reviews || []);
          const { fitScore, engagementScore, contactabilityScore, valueScore } = scoreProspect(place, reviewAnalysis);
          const totalScore = Math.round((fitScore * 0.30) + (engagementScore * 0.30) + (contactabilityScore * 0.20) + (valueScore * 0.20));

          if (totalScore < 40) { skipped.lowScore++; continue; }

          const observation = buildObservation({ reviews: reviewAnalysis });
          const hasWhatsApp = place.phone ? await checkWhatsAppExists(place.phone) : false;

          const prospect = new Prospect({
            name: place.ownerName || place.title,
            businessName: place.title,
            niche, region: getRegion(city), city,
            whatsapp: hasWhatsApp ? place.phone : null,
            emails: [],
            website: place.website || null,
            googlePlaceId: place.placeId || null,
            observations: [{ ...observation, scrapedAt: new Date() }],
            fitScore, engagementScore, contactabilityScore, valueScore,
            normalizedPhone: place.phone ? normalizeNumber(place.phone) : null,
            sources: ['google_maps'],
            scrapedData: { reviews: reviewAnalysis }
          });

          await prospect.save();
          if (!prospect.humanReviewRequired) await scheduleFollowups(prospect._id.toString());
          found.push(prospect);
          console.log(`[Finder] ✓ ${place.title} (${city}) score: ${totalScore}`);
        } catch (err) {
          console.error(`[Finder] Error: ${err.message}`);
        }
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`[Finder] Done. Found: ${found.length} | Skipped: ${JSON.stringify(skipped)}`);
  return { found: found.length, skipped };
}

module.exports = { findProspects };

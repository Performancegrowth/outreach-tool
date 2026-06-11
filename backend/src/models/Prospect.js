const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  channel: { type: String, enum: ['whatsapp', 'email', 'linkedin'] },
  step: { type: Number, enum: [1, 2, 3, 4] },
  message: String,
  sentAt: Date,
  delivered: Boolean,
  reply: String,
  repliedAt: Date,
  replyTag: {
    type: String,
    enum: ['interested', 'not_now', 'wrong_person', 'already_have_someone', 'unsubscribe', 'other'],
    default: null
  },
  suggestedReply: String
});

const ProspectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  businessName: { type: String, required: true },
  niche: { type: String, enum: ['clinic', 'gym', 'real_estate'], required: true },
  region: { type: String, enum: ['UAE', 'Saudi', 'USA', 'UK', 'Europe'], required: true },
  city: String,
  language: { type: String, enum: ['ar', 'en'], default: 'en' },
  whatsapp: String,
  emails: [String],
  linkedin: String,
  instagram: String,
  website: String,
  googlePlaceId: String,
  senderEmail: { type: String, enum: ['mahboubgrowth@gmail.com', 'm0o.mahboob@gmail.com'] },
  observations: [{
    type: { type: String },
    text: String,
    source: String,
    scrapedAt: Date
  }],
  scrapedData: { type: mongoose.Schema.Types.Mixed },
  generatedMessages: { type: mongoose.Schema.Types.Mixed },
  fitScore: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  contactabilityScore: { type: Number, default: 0 },
  valueScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['cold', 'review_queue', 'messaged', 'replied', 'interested', 'booked', 'closed', 'rejected', 'unsubscribed'],
    default: 'cold'
  },
  humanReviewRequired: { type: Boolean, default: false },
  humanReviewedAt: Date,
  humanReviewAction: { type: String, enum: ['approved', 'edited', 'rejected'], default: null },
  history: [MessageSchema],
  currentStep: { type: Number, default: 0 },
  lastContactedAt: Date,
  nextFollowUpAt: Date,
  followUpsPaused: { type: Boolean, default: false },
  lastChannelUsed: { type: String, enum: ['whatsapp', 'email', 'linkedin'], default: null },
  normalizedPhone: String,
  normalizedEmail: String,
  sources: [{ type: String, enum: ['google_maps', 'linkedin', 'instagram', 'facebook', 'website'] }],
  bounced: { type: Boolean, default: false },
  whatsappBlocked: { type: Boolean, default: false },
  spamComplaint: { type: Boolean, default: false }
}, { timestamps: true });

ProspectSchema.pre('save', function (next) {
  if (['UAE', 'Saudi'].includes(this.region)) {
    this.senderEmail = 'mahboubgrowth@gmail.com';
    this.language = 'ar';
  } else {
    this.senderEmail = 'm0o.mahboob@gmail.com';
    this.language = 'en';
  }
  next();
});

ProspectSchema.pre('save', function (next) {
  this.totalScore = Math.round(
    (this.fitScore * 0.30) +
    (this.engagementScore * 0.30) +
    (this.contactabilityScore * 0.20) +
    (this.valueScore * 0.20)
  );
  if (this.totalScore >= 70) this.humanReviewRequired = true;
  next();
});

module.exports = mongoose.model('Prospect', ProspectSchema);

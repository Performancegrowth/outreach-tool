const express = require('express');
const router = express.Router();
const Prospect = require('../models/Prospect');
const { scheduleFollowups } = require('../workers/followupWorker');
const { handleReply } = require('../services/replyHandler');

router.get('/', async (req, res) => {
  try {
    const { status, niche, region } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (niche) filter.niche = niche;
    if (region) filter.region = region;
    const prospects = await Prospect.find(filter).sort({ totalScore: -1, createdAt: -1 });
    res.json(prospects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const prospect = new Prospect(req.body);
    await prospect.save();
    await scheduleFollowups(prospect._id.toString());
    res.status(201).json(prospect);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/review', async (req, res) => {
  try {
    const { action } = req.body;
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Not found' });
    prospect.humanReviewedAt = new Date();
    prospect.humanReviewAction = action;
    if (action === 'rejected') { prospect.status = 'rejected'; prospect.followUpsPaused = true; }
    else prospect.status = 'cold';
    await prospect.save();
    res.json(prospect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reply', async (req, res) => {
  try {
    const { replyText, channel } = req.body;
    const result = await handleReply(req.params.id, replyText, channel);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/pipeline', async (req, res) => {
  try {
    const stats = await Prospect.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

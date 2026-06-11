const express = require('express');
const router = express.Router();
const { findProspects } = require('../services/prospectFinder');

router.post('/find', async (req, res) => {
  try {
    const { niche, region, maxPerCity = 20 } = req.body;
    if (!niche || !region) return res.status(400).json({ error: 'niche and region are required' });
    res.json({ message: `Prospecting started for ${niche} in ${region}` });
    findProspects({ niche, region, maxPerCity })
      .then(r => console.log(`[Campaign] Done: ${JSON.stringify(r)}`))
      .catch(err => console.error(`[Campaign] Error: ${err.message}`));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

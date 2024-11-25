// routes/search.js
const express = require('express');
const cors = require('cors'); // Add this line
const router = express.Router();
const searchService = require('../services/search');
const { blog, siteInfo } = require('../scripts/blog-setup');

router.get('/search', (req, res) => {
  console.log('envVars in /search route:', res.locals.envVars); // Debug log
 
  res.render('search', {
    title: 'Search',
    description: 'Search across all content',
    siteInfo,
    path: req.path,
    site: res.locals.site,
    envVars: res.locals.envVars || {
      ACTIVE_PROFILE: process.env.ACTIVE_PROFILE || 'entrepreneur',
    },
  });
});

// Search API endpoint 
router.get('/api/search', cors(), async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ 
        results: [], 
        suggestions: [],
        error: 'Query too short'
      });
    }

    // Initialize search if needed
    await searchService.initialize();

    const searchResults = searchService.search(query);
    res.json(searchResults);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message
    });
  }
});

module.exports = router;
// routes/search.js
const express = require('express');
const router = express.Router();
const searchService = require('../services/search');

router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ 
        results: [], 
        suggestions: [],
        error: 'Query too short'
      });
    }

    const { results, suggestions } = searchService.search(query);

    res.json({
      results,
      suggestions,
      originalQuery: query
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message
    });
  }
});

module.exports = router;
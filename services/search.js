// services/search.js
const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const removeMd = require('remove-markdown');
const { glob } = require('glob');
const Fuse = require('fuse.js');
const yaml = require('js-yaml');
const pug = require('pug');
const { JSDOM } = require('jsdom');

// Create a data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, '..', 'data');
fs.ensureDirSync(DATA_DIR);

class SearchService {
  constructor() {
    this.fuse = null;
    this.indexPath = path.join(__dirname, '..', 'data', 'search-index.json');
  }

  async initialize() {
    try {
      const { items } = await fs.readJson(this.indexPath);
      this.fuse = new Fuse(items, {
        includeScore: true,
        threshold: 0.3,
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'description', weight: 0.3 }, 
          { name: 'content', weight: 0.2 },
          { name: 'tags', weight: 0.1 }
        ]
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize search:', error);
      return false;
    }
  }

  search(query) {
    if (!this.fuse || !query) return { results: [], suggestions: [] };
    
    const results = this.fuse.search(query).map(result => ({
      ...result.item,
      score: 1 - result.score
    }));

    return {
      results,
      suggestions: this.getSuggestions(query, results)
    };
  }


  getSuggestions(query, results) {
    if (!query || query.length < 3) return [];

    const commonTerms = new Set([
      'digital', 'nomad', 'travel', 'remote', 'work', 'about',
      'contact', 'blog', 'article', 'page', 'entrepreneur', 'professional'
    ]);

    const suggestions = Array.from(commonTerms)
      .filter(term => {
        const distance = this.levenshteinDistance(query.toLowerCase(), term);
        return distance > 0 && distance <= 2;
      });

    return suggestions.slice(0, 2);
  }

  levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }

    return track[str2.length][str1.length];
  }
}

module.exports = new SearchService();
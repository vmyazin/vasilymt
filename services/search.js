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
    this.searchIndex = [];
    this.fuse = null;
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractPugMetadata(content, key) {
    const match = content.match(new RegExp(`\/\/- ${key}: (.+)`));
    return match ? match[1].trim() : '';
  }

  humanizeFilename(file) {
    return path.basename(file, '.pug')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  extractTags(content) {
    const keywordsMatch = content.match(/meta\(name=['"]?keywords['"]?\s*,\s*content=['"](.+?)['"]\)/);
    if (keywordsMatch) {
      return keywordsMatch[1].split(',').map(tag => tag.trim());
    }
    return [];
  }

  parseFrontmatter(content, filePath) {
    try {
      const matches = content.match(/^---\n([\s\S]*?)\n---/);
      if (!matches) {
        throw new Error('No frontmatter found');
      }

      const processed = matches[1].replace(
        /^(description|title):\s*(.*?)$/gm,
        (match, key, value) => `${key}: "${value.replace(/"/g, '\\"')}"`
      );

      return yaml.load(processed, {
        schema: yaml.FAILSAFE_SCHEMA,
        filename: filePath
      });
    } catch (err) {
      console.warn(`Warning: Using fallback metadata for ${filePath}`);
      return {
        title: path.basename(filePath, '.md').replace(/-/g, ' '),
        description: '',
        date: '',
        author: ''
      };
    }
  }

  async indexContent() {
    try {
      this.searchIndex = [];
      let articleCount = 0;
      let pageCount = 0;
      let profileCount = 0;

      // Index profile content from db.json
      try {
        const dbPath = path.join(__dirname, '..', 'content', 'db.json');
        const db = await fs.readJson(dbPath);

        if (db.pages?.about) {
          for (const [profile, content] of Object.entries(db.pages.about)) {
            this.searchIndex.push({
              id: `profile-${profile}`,
              type: 'profile',
              title: content.meta?.title || `${profile.charAt(0).toUpperCase() + profile.slice(1)} Profile`,
              description: content.meta?.description || '',
              content: this.cleanText(content.content || ''),
              url: '/about',
              profile: profile,
              tags: ['profile', profile, profile === 'entrepreneur' ? 'business' : 'professional']
            });
            profileCount++;
          }
        }
      } catch (error) {
        console.error('Error indexing profile content:', error);
      }

      // Index Markdown files (blog posts)
      const mdFiles = await glob('content/articles/**/*.md');
      for (const file of mdFiles) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const data = this.parseFrontmatter(content, file);

          const contentStart = content.indexOf('---\n', 4) + 4;
          const markdownContent = content.slice(contentStart);

          this.searchIndex.push({
            id: path.basename(file, '.md'),
            type: 'article',
            title: data.title || '',
            description: data.description || '',
            tags: data.tags ? (
              typeof data.tags === 'string'
                ? data.tags.split(',').map(tag => tag.trim())
                : Array.isArray(data.tags)
                  ? data.tags
                  : []
            ) : [],
            content: this.cleanText(removeMd(markdownContent)),
            url: `/blog/${path.basename(file, '.md')}`,
            date: data.date || '',
            author: data.author || ''
          });
          articleCount++;
        } catch (error) {
          console.error(`Error processing article ${file}:`, error.message);
        }
      }

      // Index Pug files (static pages)
      const pugFiles = await glob('pages/**/*.pug');
      const excludeFiles = ['layout.pug', 'error.pug'];
      const excludeDirectories = ['/mixins/', '/partials/'];
      const defaultContext = {
        site: {
          project: {
            theme: 'default',
            favicon: '/favicon.ico',
            logoAnimated: false,
            siteName: 'My Site',
            siteLogo: '/images/logo.png',
            author: 'Default Author',
          },
          social: {
            twitter: 'https://twitter.com/default',
          },
          appIds: {
            googleAnalytics: 'UA-000000-1',
          },
        },
        envVars: {
          ACTIVE_PROFILE: 'default',
        },
        postMetaData: {
          tags: ['default'],
          fullUrl: 'https://example.com',
          title: 'Default Title',
        },
        articles: [
          {
            slug: 'default-article',
            title: 'Default Article',
          },
        ],
        path: '/',
        isDev: false,
      };
  
      for (const file of pugFiles) {
        const fileName = path.basename(file);
        const dirName = path.dirname(file);
  
        if (excludeFiles.includes(fileName)) continue;
        if (excludeDirectories.some(dir => dirName.includes(dir))) continue;
  
        try {
          // Render the Pug template to HTML with default context
          const htmlContent = pug.renderFile(file, defaultContext);
  
          // Use JSDOM to extract text content
          const dom = new JSDOM(htmlContent);
          const textContent = dom.window.document.body.textContent || '';
  
          // Extract metadata (title and description)
          const content = await fs.readFile(file, 'utf-8');
          const titleMatch = content.match(/\/\/- title: (.+)/);
          const descMatch = content.match(/\/\/- description: (.+)/);
          const title = titleMatch?.[1] || this.humanizeFilename(file);
          const description = descMatch?.[1] || '';
  
          if (textContent.trim()) {
            this.searchIndex.push({
              id: path.basename(file, '.pug'),
              type: 'page',
              title,
              description,
              content: this.cleanText(textContent),
              url: `/${path.basename(file, '.pug')}`,
              tags: this.extractTags(content),
            });
            pageCount++;
          } else {
            console.warn(`No content extracted from ${file}`);
          }
        } catch (error) {
          console.error(`Error processing page ${file}:`, error.stack);
        }
      }
  
      this.initializeFuse();
      await this.saveIndex();
  
      console.log(`Indexed ${articleCount} articles, ${pageCount} pages, and ${profileCount} profiles successfully`);
      return true;
    } catch (error) {
      console.error('Error building search index:', error);
      return false;
    }
  }

  initializeFuse() {
    const options = {
      includeScore: true,
      threshold: 0.3,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      ignoreLocation: true,
      findAllMatches: true,
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.3 },
        { name: 'content', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
        { name: 'profile', weight: 0.4 }
      ],
      distance: 100,
      tokenize: true,
      matchAllTokens: false,
      location: 0,
      isCaseSensitive: false
    };

    this.fuse = new Fuse(this.searchIndex, options);
  }

  async saveIndex() {
    const indexPath = path.join(DATA_DIR, 'search-index.json');
    const indexData = {
      lastUpdated: new Date().toISOString(),
      items: this.searchIndex
    };

    await fs.writeJson(indexPath, indexData, { spaces: 2 });
    await this.createSymlink();
  }

  async createSymlink() {
    const source = path.join(DATA_DIR, 'search-index.json');
    const target = path.join(__dirname, '..', 'public', 'search-index.json');

    try {
      await fs.remove(target).catch(() => {});
      await fs.ensureSymlink(source, target);
    } catch (error) {
      console.error('Error creating symlink:', error);
    }
  }

  search(query) {
    if (!this.fuse || !query || query.length < 2) {
      return {
        results: [],
        suggestions: []
      };
    }

    const searchResults = this.fuse.search(query);
    const results = searchResults.map(result => ({
      ...result.item,
      score: 1 - result.score,
      matches: result.matches
    }));

    const suggestions = this.getSuggestions(query, results);

    return {
      results,
      suggestions,
      originalQuery: query
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
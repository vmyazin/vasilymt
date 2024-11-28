// scripts/build-crawl.js
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { parseStringPromise } = require('xml2js');
const sanitizeHtml = require('sanitize-html');
const { performance } = require('perf_hooks');
const http = require('http');
const { spawn } = require('child_process');

class WebCrawler {
  constructor(baseURL, isLocal = true) {
    this.baseURL = baseURL;
    this.isLocal = isLocal;
    this.visitedUrls = new Set();
  }

  // Normalize URLs to local ones if running locally
  normalizeUrl(url) {
    return this.isLocal
      ? url.replace(/https?:\/\/simon\.rapidsystemshub\.com/, 'http://localhost:3000')
      : url;
  }

  async checkServer() {
    return new Promise((resolve) => {
      http.get(this.baseURL, () => {
        resolve(true);
      }).on('error', () => {
        resolve(false);
      });
    });
  }

  async ensureServer() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      const isRunning = await this.checkServer();
      if (isRunning) return null;

      if (retries === 0) {
        console.log('Server not running. Starting server...');
        const server = spawn('npm', ['run', 'start'], {
          stdio: 'inherit',
          shell: true,
          detached: true
        });

        // Handle server process errors
        server.on('error', (err) => {
          console.error('Failed to start server:', err);
        });

        return server;
      }

      console.log(`Waiting for server to start (attempt ${retries + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries++;
    }

    throw new Error('Server failed to start after multiple attempts');
  }

  async parseSitemap(xmlContent) {
    try {
      const result = await parseStringPromise(xmlContent);
      return result.urlset.url.map(url => url.loc[0]); // Extract all <loc> tags
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      return [];
    }
  }

  async fetchSitemap() {
    try {
      const response = await fetch(`${this.baseURL}/sitemap.xml`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const xml = await response.text();
      const sitemapUrls = await this.parseSitemap(xml);
  
      console.log(`Sitemap contains ${sitemapUrls.length} URLs`);
      return sitemapUrls;
    } catch (error) {
      console.error('Failed to fetch sitemap:', error);
  
      // Fallback: Crawl known routes
      console.log('Using fallback routes...');
      return [
        '/',
        '/about',
        '/blog',
        '/contact',
        '/privacy',
        '/terms'
      ].map(route => `${this.baseURL}${route}`);
    }
  }

  async crawlPage(url, retries = 3) {
    const normalizedUrl = this.normalizeUrl(url);
    if (this.visitedUrls.has(normalizedUrl)) return null;
    this.visitedUrls.add(normalizedUrl);

    const response = await this.page.goto(normalizedUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    if (response.status() !== 200 && response.status() !== 304) {
      throw new Error(`HTTP ${response.status()} on ${url}`);
    }

    const pageData = await this.extractPageContent();
    if (pageData) {
      pageData.url = url; // Use the exact URL from the sitemap
      pageData.type = url.includes('/blog/') ? 'article' : 'page'; // Classify as article or page
    }
    return pageData;
  }

  async crawl() {
    const startTime = performance.now();
    const searchIndex = [];
    let successCount = 0;
    let errorCount = 0;
    let serverProcess = null;

    try {
      serverProcess = await this.ensureServer();
      await this.initialize();
      const urls = await this.fetchSitemap();

      console.log(`Found ${urls.length} URLs to crawl`);

      for (const url of urls) {
        try {
          const pageData = await this.crawlPage(url);
          if (pageData) {
            searchIndex.push(pageData);

            if (pageData.embeddedPosts) {
              searchIndex.push(...pageData.embeddedPosts);
            }
          
            successCount++;
            console.log(`✅ Indexed: ${url}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed: ${url}`, error.message);
        }
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      const stats = {
        totalPages: urls.length,
        successfulCrawls: successCount,
        failedCrawls: errorCount,
        crawlTimeSeconds: duration.toFixed(2),
        averageTimePerPage: (duration / successCount).toFixed(2),
        timestamp: new Date().toISOString()
      };

      const dataDir = path.join(__dirname, '..', 'data');
      await fs.ensureDir(dataDir);
      await fs.writeJson(
        path.join(dataDir, 'search-index.json'),
        {
          lastUpdated: new Date().toISOString(),
          stats,
          items: searchIndex
        },
        { spaces: 2 }
      );

      console.log('\nCrawl Statistics:', stats);
    } finally {
      if (this.browser) await this.browser.close();
      if (serverProcess) {
        process.kill(-serverProcess.pid);
      }
    }

    return searchIndex;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('VasilyMT Search Crawler Bot 1.0');

    // Ignore resource loading errors
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) {
        console.error('Page Error:', msg.text());
      }
    });

    // Block unnecessary resources
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      if (this.shouldBlockResource(request)) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  shouldBlockResource(request) {
    // Block non-essential resources
    const blockedResources = [
      'image', 'media', 'font', 'stylesheet',
      'script',  // Block most scripts since we just need content
      'other'
    ];

    // Allow essential scripts (e.g. for dynamic content loading)
    const essentialScripts = [
      '/javascript/search.js',
      '/javascript/topnav.js'
    ];

    const resourceType = request.resourceType();
    const url = request.url();

    return blockedResources.includes(resourceType) &&
      !essentialScripts.some(script => url.includes(script));
  }

  async extractPageContent() {
    try {
      const content = await this.page.evaluate(() => {
        const posts = [];
  
        // Extract blog entries if available
        document.querySelectorAll('.blog-post').forEach(post => {
          posts.push({
            title: post.querySelector('h2, h1')?.textContent.trim(),
            description: post.querySelector('p')?.textContent.trim(),
            tags: post.dataset.tags?.split(',') || [],
            date: post.dataset.date || '',
            url: post.querySelector('a')?.href,
            type: 'article',
          });
        });
  
        // Page-level data
        const pageTitle = document.querySelector('title')?.textContent.trim();
        const pageDescription = document.querySelector('meta[name="description"]')?.content;
        const pageH1 = document.querySelector('h1')?.textContent.trim();
        const pageH2 = document.querySelector('h2')?.textContent.trim();
        const pageUrl = window.location.href;
  
        return {
          title: pageTitle,
          description: pageDescription,
          h1: pageH1,
          h2: pageH2,
          url: pageUrl,
          type: 'page',
          content: document.body.innerText.trim(),
          embeddedPosts: posts,
        };
      });
  
      return content;
    } catch (error) {
      console.error(`Content extraction failed: ${error.message}`);
      return null;
    }
  }
}

if (require.main === module) {
  const crawler = new WebCrawler('http://localhost:3000', true);
  crawler.crawl()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Crawling failed:', err);
      process.exit(1);
    });
}

module.exports = WebCrawler;
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

async function fetchDynamicUrls(baseURL) {
  try {
    const sitemapURL = `${baseURL}/sitemap.xml`;
    console.log(`Fetching sitemap from ${sitemapURL}`);
    const response = await fetch(sitemapURL);
    const sitemap = await response.text();

    // Parse sitemap for URLs (use regex for simplicity)
    const urls = sitemap.match(/<loc>(.*?)<\/loc>/g).map(loc => loc.replace(/<\/?loc>/g, ''));
    return urls;
  } catch (error) {
    console.error('Error fetching dynamic URLs:', error);
    return [];
  }
}

async function safeGoto(page, url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      return;
    } catch (error) {
      console.error(`Attempt ${attempt} failed for ${url}:`, error);
      if (attempt === retries) throw error;
    }
  }
}

async function crawlAndIndex() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const baseURL = 'http://localhost:3000'; // Replace with your site's base URL

  const urlsToCrawl = await fetch(`${baseURL}/sitemap.xml`)
  .then(res => res.text())
  .then(data => parseSitemap(data));
  
  const searchIndex = [];

  for (const url of urlsToCrawl) {
    try {
      console.log(`Crawling ${url}...`);
      await safeGoto(page, url);

      // Extract content
      const title = await page.title();
      const description = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]');
        return metaDesc ? metaDesc.content : '';
      });
      const bodyText = await page.evaluate(() => document.body.innerText);
      const tags = await page.evaluate(() => {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        return metaKeywords ? metaKeywords.content.split(',').map(tag => tag.trim()) : [];
      });

      searchIndex.push({
        url,
        title,
        description,
        content: bodyText,
        tags,
      });
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  await browser.close();

  const dataDir = path.join(__dirname, '..', 'data');
  await fs.ensureDir(dataDir);
  const indexPath = path.join(dataDir, 'search-index.json');
  await fs.writeJson(indexPath, { lastUpdated: new Date().toISOString(), items: searchIndex }, { spaces: 2 });

  console.log(`✅ Crawling and indexing completed successfully. Indexed ${searchIndex.length} pages.`);
}

crawlAndIndex().catch(err => {
  console.error('❌ Error during crawling and indexing:', err);
});
// routes/sitemap.js
const express = require('express');
const router = express.Router();
const { create } = require('xmlbuilder2');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); // Add UTC plugin
const timezone = require('dayjs/plugin/timezone'); // Add timezone plugin
const path = require('path');
const fs = require('fs').promises;
const { getSiteProfiles } = require('../app.config');

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Format date to ISO 8601 with timezone
const formatDate = (date) => {
  if (date) {
    // If we have a date string like "07-13-2022", convert it to ISO format
    return dayjs(date).utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
  }
  // For current date
  return dayjs().utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
};

const getEnvVar = (key, fallback) => {
  const value = process.env[key];
  return value === undefined ? fallback : value;
};

// Static routes configuration
const staticRoutes = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/films', priority: 0.8, changefreq: 'weekly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/tags', priority: 0.5, changefreq: 'weekly' }
];

// Blog-specific routes
const blogRoutes = [
  { path: '/blog', priority: 0.9, changefreq: 'daily' }
];

async function getBlogPosts() {
  try {
    const contentPath = path.join(__dirname, '../content/articles');
    const files = await fs.readdir(contentPath);
    
    const posts = [];
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(contentPath, file), 'utf-8');
        const frontMatter = content.split('---')[1];
        
        const dateMatch = frontMatter.match(/date:\s*([\d-]+)/);
        const titleMatch = frontMatter.match(/title:\s*(.+)/);
        
        if (dateMatch && titleMatch) {
          const date = dateMatch[1];
          const title = titleMatch[1].trim();
          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          posts.push({
            path: `/blog/${slug}`,
            lastmod: date,
            priority: 0.6,
            changefreq: 'never'
          });
        }
      }
    }
    return posts;
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
}

async function generateSitemap(siteProfile, profileName) {
  const SITE_URL = siteProfile.project.URL;
  
  const routes = [...staticRoutes];
  if (profileName === 'entrepreneur') {
    routes.push(...blogRoutes);
    const blogPosts = await getBlogPosts();
    routes.push(...blogPosts);
  }
  
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

  routes.forEach(route => {
    const url = root.ele('url');
    url.ele('loc').txt(`${SITE_URL}${route.path}`);
    url.ele('lastmod').txt(formatDate(route.lastmod));
    url.ele('changefreq').txt(route.changefreq);
    url.ele('priority').txt(route.priority.toString());
  });

  return root.end({ prettyPrint: true });
}


router.get('/sitemap.xml', async (req, res) => {
  try {
    const profiles = getSiteProfiles();
    const activeProfile = getEnvVar('ACTIVE_PROFILE', 'professional');
    
    // Use the same profile selection logic as setSiteProfile
    let siteProfile;
    if (!profiles[activeProfile]) {
      console.warn(`Warning: Profile "${activeProfile}" not found, falling back to professional profile`);
      siteProfile = profiles.professional;
    } else {
      siteProfile = profiles[activeProfile];
    }

    const sitemap = await generateSitemap(siteProfile, activeProfile);
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
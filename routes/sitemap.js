// routes/sitemap.js
const express = require('express');
const router = express.Router();
const { create } = require('xmlbuilder2');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { siteConfig } = require('../app.config');

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);


/**
 * Format date to ISO 8601 with timezone.
 */
const formatDate = (date) => {
  if (date) {
    return dayjs(date).utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
  }
  return dayjs().utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
};


// Static routes for professional profile
const staticRoutes = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/films', priority: 0.8, changefreq: 'weekly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' }
];


/**
 * Generates sitemap XML for the site.
 */
function generateSitemap() {
  const SITE_URL = siteConfig.project.URL;

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

  staticRoutes.forEach(route => {
    const url = root.ele('url');
    url.ele('loc').txt(`${SITE_URL}${route.path}`);
    url.ele('lastmod').txt(formatDate(route.lastmod));
    url.ele('changefreq').txt(route.changefreq);
    url.ele('priority').txt(route.priority.toString());
  });

  return root.end({ prettyPrint: true });
}


router.get('/sitemap.xml', (req, res) => {
  try {
    const sitemap = generateSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});


module.exports = router;

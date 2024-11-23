// scripts/generate-sitemap.js
const fs = require('fs').promises;
const path = require('path');
const { create } = require('xmlbuilder2');
const dayjs = require('dayjs');
const { getSiteProfiles } = require('../app.config');

// Get site profiles
const profiles = getSiteProfiles();

// Static routes configuration
const staticRoutes = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/blog', priority: 0.9, changefreq: 'daily' },
  { path: '/contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/films', priority: 0.8, changefreq: 'weekly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/tags', priority: 0.5, changefreq: 'weekly' }
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

async function generateSitemapForProfile(profileName, profile) {
  try {
    const SITE_URL = profile.project.URL;
    const blogPosts = await getBlogPosts();
    const allRoutes = [...staticRoutes, ...blogPosts];
    
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

    allRoutes.forEach(route => {
      const url = root.ele('url');
      url.ele('loc').txt(`${SITE_URL}${route.path}`);
      url.ele('lastmod').txt(route.lastmod || dayjs().format('YYYY-MM-DD'));
      url.ele('changefreq').txt(route.changefreq);
      url.ele('priority').txt(route.priority.toString());
    });

    const sitemap = root.end({ prettyPrint: true });
    
    // Write to public directory with profile-specific name
    const outputPath = path.join(__dirname, `../public/sitemap-${profileName}.xml`);
    await fs.writeFile(outputPath, sitemap);
    console.log(`Sitemap for ${profileName} profile generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error(`Error generating sitemap for ${profileName}:`, error);
  }
}

async function generateSitemaps() {
  // Generate sitemaps for each profile
  for (const [profileName, profile] of Object.entries(profiles)) {
    await generateSitemapForProfile(profileName, profile);
  }
}

generateSitemaps();
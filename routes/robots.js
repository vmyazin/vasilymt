// routes/robots.js
const express = require('express');
const router = express.Router();
const { getSiteProfiles } = require('../app.config');

// Helper function to get environment variable, matching app.config.js
const getEnvVar = (key, fallback) => {
  const value = process.env[key];
  return value === undefined ? fallback : value;
};

router.get('/robots.txt', (req, res) => {
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

  const robotsTxt = `# robots.txt for ${siteProfile.project.siteName}
User-agent: *
Allow: /

# ${activeProfile} profile sitemap
Sitemap: ${siteProfile.project.URL}/sitemap-${activeProfile}.xml

# Disallow common development paths
Disallow: /admin/
Disallow: /debug/
Disallow: /search/
`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

module.exports = router;
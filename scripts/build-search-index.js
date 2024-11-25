// scripts/build-search-index.js
const searchService = require('../services/search');

async function buildSearchIndex() {
  console.log('Building search index...');
  try {
    const success = await searchService.indexContent({
      context: {
        site: {
          project: {
            theme: 'default',
            favicon: '/favicon.ico',
            logoAnimated: false,
            siteName: 'My Site',
            siteLogo: '/images/logo.png',
          },
        },
        envVars: {
          ACTIVE_PROFILE: 'default',
        },
        postMetaData: {
          tags: [],
          fullUrl: '',
        },
        articles: [],
      },
    }); // Pass mock context for static pages here

    if (success) {
      console.log('✅ Search index built successfully');
      process.exit(0);
    } else {
      console.error('❌ Search index build failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error building search index:', error);
    process.exit(1);
  }
}


buildSearchIndex();
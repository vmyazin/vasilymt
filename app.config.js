// app.config.js
const sharedConfig = {
  project: {
    location: "undisclosed location",
    URL: "https://www.vasilym.com",
    ogImage: "/images/og-image-vm.png",
    favicon: "/images/favicon.png"
  },
  navigation: {
    showAbout: true,
    showBlog: true
  }
};

// Helper to safely get environment variables with fallback
const getEnvVar = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined) {
    console.log(`Environment variable ${key} not found, using fallback: ${fallback}`);
  } else {
    console.log(`Environment variable ${key} found with value: ${value}`);
  }
  return value || fallback;
};

const professionalProfile = {
  project: {
    theme: "professional",
    ...sharedConfig.project,
    siteName: getEnvVar('PROFESSIONAL_NAME', 'Vasily Myazin'),
    author: getEnvVar('PROFESSIONAL_NAME', 'Vasily Myazin'),
    headline: "Tech Leadership Through Product Design and Coding",
    description: "Senior Software Engineer, Technical Leader, and Enterprise Solutions Architect.",
    email: "contact@vasilym.com",
    URL: "https://www.vasilym.com",
    location: "Miami, FL",
    imagePrefix: getEnvVar('PROFESSIONAL_IMAGE_PREFIX', 'vasily'),
    ogImage: getEnvVar('PROFESSIONAL_OGIMAGE', sharedConfig.project.ogImage),
  },
  appIds: {
    googleAnalytics: "UA-2420101-39"
  },
  social: {
    linkedin: "https://www.linkedin.com/in/vmyazin/",
    telegram: "https://t.me/vasilymz",
  }
};

const entrepreneurProfile = {
  project: {
    theme: "entrepreneur",
    ...sharedConfig.project,
    siteName: getEnvVar('ENTREPRENEUR_NAME', 'Simon Myazin'),
    author: getEnvVar('ENTREPRENEUR_NAME', 'Simon Myazin'),
    headline: "Learn to Hack Life: Knowledge Work Meets Zen and World Travel",
    description: "Creator, Designer, Traveler, Mentor. Get Inspired and Become Productive with me!",
    email: "simon@rapidsystemshub.com",
    URL: getEnvVar('ENTREPRENEUR_URL', 'https://simon.vasilym.com'),
    imagePrefix: getEnvVar('ENTREPRENEUR_IMAGE_PREFIX', 'simon'),
    // Override the spread of sharedConfig.project.ogImage
    ogImage: getEnvVar('ENTREPRENEUR_OGIMAGE', '/images/og-image-sm.jpg'),
    favicon: "/images/favicon-simon.png",
  },
  appIds: {
    googleAnalytics: "UA-XXXXXXX"
  },
  social: {
    instagram: "https://instagram.com/vasily",
    twitter: "https://twitter.com/rapidsystemshub",
  }
};

const siteProfiles = {
  professional: professionalProfile,
  entrepreneur: entrepreneurProfile
};

// Create filtered environment variables object
const getFilteredEnv = () => {
  const filtered = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => 
      key === 'NODE_ENV' ||
      key.startsWith('ACTIVE_') || 
      key.startsWith('ENTREPRENEUR_') || 
      key.startsWith('PROFESSIONAL_')
    )
  );
  console.log('Filtered environment variables:', filtered);
  return filtered;
};

// Simple environment-based profile selection middleware
const setSiteProfile = (req, res, next) => {
  const activeProfile = getEnvVar('ACTIVE_PROFILE', 'professional');
  console.log(`Setting site profile to: ${activeProfile}`);
  
  if (!siteProfiles[activeProfile]) {
    console.warn(`Warning: Profile "${activeProfile}" not found, falling back to professional profile`);
    res.locals.site = siteProfiles.professional;
  } else {
    res.locals.site = siteProfiles[activeProfile];
  }
  
  // Add development mode flag
  res.locals.isDev = process.env.NODE_ENV !== 'production';
  
  // Add filtered environment variables
  res.locals.envVars = getFilteredEnv();

  // Debug log the final ogImage value
  console.log('Final ogImage value:', res.locals.site.project.ogImage);
  
  next();
};

module.exports = {
  siteProfiles,
  setSiteProfile
};
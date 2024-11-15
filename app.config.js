// app.config.js
const professionalProfile = {
  project: {
    theme: "professional",
    siteName: process.env.PROFESSIONAL_NAME || "Vasily Myazin",
    author: process.env.PROFESSIONAL_NAME || "Vasily Myazin",
    description: "Senior Software Engineer, Technical Leader, and Enterprise Solutions Architect.",
    URL: "https://www.vasilym.com",
    location: "undisclosed location",
    imagePrefix: process.env.PROFESSIONAL_IMAGE_PREFIX || "vasily",
    ogImage: process.env.PROFESSIONAL_OGIMAGE || "/images/og-image-vm.png"
  },
  appIds: {
    googleAnalytics: "UA-2420101-39"
  },
  social: {
    linkedin: "https://www.linkedin.com/in/vmyazin/",
  }
};

const entrepreneurProfile = {
  project: {
    theme: "entrepreneur",
    siteName: process.env.ENTREPRENEUR_NAME || "Simon Myazin",
    author: process.env.ENTREPRENEUR_NAME || "Simon Myazin",
    description: "Creator, Designer, Traveler, Mentor. Get Inspired and Become Productive with me!",
    URL: process.env.ENTREPRENEUR_URL || "https://simon.vasilym.com",
    location: "undisclosed location",
    imagePrefix: process.env.ENTREPRENEUR_IMAGE_PREFIX || "simon",
    ogImage: process.env.ENTREPRENEUR_OGIMAGE || "/images/og-image-vm.png"
  },
  appIds: {
    googleAnalytics: "UA-XXXXXXX"
  },
  social: {
    instagram: "https://instagram.com/vasily",
    telegram: "https://t.me/vasilymz",
    twitter: "https://twitter.com/rapidsystemshub",
  }
};

const siteProfiles = {
  professional: professionalProfile,
  entrepreneur: entrepreneurProfile
};

// Create filtered environment variables object
const getFilteredEnv = () => {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => 
      key.startsWith('ACTIVE_') || 
      key.startsWith('ENTREPRENEUR_') || 
      key.startsWith('PROFESSIONAL_')
    )
  );
};

// Simple environment-based profile selection middleware
const setSiteProfile = (req, res, next) => {
  const activeProfile = process.env.ACTIVE_PROFILE || 'professional';
  
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
  
  next();
};

module.exports = {
  siteProfiles,
  setSiteProfile
};
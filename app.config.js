// app.config.js
const dotenv = require('dotenv');

// Load environment variables first, before any config is created
const result = dotenv.config();
if (result.error) {
  console.warn('Warning: .env file not found or cannot be read');
}

// Debug logger that only logs in development and only once per session
const debugLogger = {
  logged: new Set(),
  log(key, message, data) {
    if (process.env.NODE_ENV !== 'development') return;
    
    const logKey = `${key}-${JSON.stringify(message)}`;
    if (this.logged.has(logKey)) return;
    
    this.logged.add(logKey);
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Enhanced helper to safely get environment variables with better debugging
const getEnvVar = (key, fallback) => {
  const value = process.env[key];
  
  if (value === undefined) {
    debugLogger.log(key, `⚠️ Environment variable ${key} not found, using fallback: ${fallback}`);
    return fallback;
  }
  
  return value;
};

const sharedConfig = {
  project: {
    location: "an undisclosed location",
    URL: "https://www.vasilym.com",
    ogImage: "/images/og-image-vm.png",
    homepageImage: "/images/portrait-vasily-exp.jpg",
    favicon: "/images/favicon.png",
    siteLogo: "/images/vm-logo-22-2.svg",
  },
  navigation: {
    showAbout: true,
    showBlog: true,
    showNow: true
  }
};

// Create the profiles after environment is definitely loaded
const createProfiles = () => {
  debugLogger.log('profiles', 'Creating profiles with environment configuration...');
  
  const professionalProfile = {
    project: {
      theme: "professional",
      ...sharedConfig.project,
      siteName: getEnvVar('PROFESSIONAL_NAME', 'Vasily Myazin'),
      author: getEnvVar('PROFESSIONAL_NAME', 'Vasily Myazin'),
      alias: "vasily",
      headline: "Tech Leadership Through Product Design and Coding",
      description: "Senior Software Engineer, Technical Leader, and Enterprise Solutions Architect.",
      email: "contact@vasilym.com",
      URL: "https://vasilym.com",
      location: "Miami, FL",
      logoAnimated: true,
      domain: getEnvVar('PROFESSIONAL_DOMAIN'),
      imagePrefix: getEnvVar('PROFESSIONAL_IMAGE_PREFIX', 'vasily'),
      ogImage: getEnvVar('PROFESSIONAL_OGIMAGE', sharedConfig.project.ogImage),
    },
    appIds: {
      googleAnalytics: getEnvVar('PROFESSIONAL_GAID')
    },
    social: {
      linkedin: "https://www.linkedin.com/in/vmyazin/",
      telegram: "https://t.me/vasilymz",
    },
    navigation: {
      ...sharedConfig.navigation,
      showBlog: false,
      showNow: false
    }
  };

  const entrepreneurProfile = {
    project: {
      theme: "entrepreneur",
      ...sharedConfig.project,
      siteName: getEnvVar('ENTREPRENEUR_NAME', 'Simon Myazin'),
      author: getEnvVar('ENTREPRENEUR_NAME', 'Simon Myazin'),
      alias: "simon",
      headline: "Maximize Life's ROI: Knowledge Work Meets Zen and World Travel",
      description: "Creator, Designer, Traveler, Mentor. Get Inspired and Become Productive with me!",
      email: "simon@rapidsystemshub.com",
      URL: getEnvVar('ENTREPRENEUR_URL', 'https://simon.vasilym.com'),
      domain: getEnvVar('ENTREPRENEUR_DOMAIN'),
      imagePrefix: getEnvVar('ENTREPRENEUR_IMAGE_PREFIX', 'simon'),
      siteLogo: "/images/simon-logo-3d-out2.svg",
      logoAnimated: false,
      homepageImage: "/images/about/simon-chi-laptop.jpeg",
      ogImage: getEnvVar('ENTREPRENEUR_OGIMAGE', '/images/og-image-sm.jpg'),
      favicon: "/images/favicon-simon.png",
    },
    appIds: {
      googleAnalytics: getEnvVar('ENTREPRENEUR_GAID')
    },
    social: {
      instagram: "https://instagram.com/vasily",
      twitter: "https://twitter.com/rapidsystemshub",
    },
    navigation: {
      ...sharedConfig.navigation,
    },
  };

  return {
    professional: professionalProfile,
    entrepreneur: entrepreneurProfile
  };
};

// Create filtered environment variables object
const getFilteredEnv = () => {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => 
      key === 'NODE_ENV' ||
      key.startsWith('ACTIVE_') || 
      key.startsWith('ENTREPRENEUR_') || 
      key.startsWith('PROFESSIONAL_')
    )
  );
};

// Create profiles only when needed
let siteProfiles = null;

// Simple environment-based profile selection middleware
const setSiteProfile = (req, res, next) => {
  // Initialize profiles if not already done
  if (!siteProfiles) {
    siteProfiles = createProfiles();
    // Log environment info only once when profiles are first created
    debugLogger.log('env', '\nFiltered environment variables:', getFilteredEnv());
  }

  const activeProfile = getEnvVar('ACTIVE_PROFILE', 'professional');
  
  if (!siteProfiles[activeProfile]) {
    debugLogger.log('profile-warning', `Warning: Profile "${activeProfile}" not found, falling back to professional profile`);
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
  setSiteProfile,
  getSiteProfiles: () => {
    if (!siteProfiles) {
      siteProfiles = createProfiles();
    }
    return siteProfiles;
  }
};
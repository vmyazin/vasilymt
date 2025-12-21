// app.config.js
const dotenv = require('dotenv');

// Load environment variables first
const result = dotenv.config();
if (result.error) {
    console.warn('Warning: .env file not found or cannot be read');
}


/**
 * Debug logger that only logs in development and only once per session.
 */
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


/**
 * Safely gets environment variable with fallback.
 */
const getEnvVar = (key, fallback) => {
    const value = process.env[key];

    if (value === undefined) {
        debugLogger.log(key, `⚠️ Env var ${key} not found, using fallback: ${fallback}`);
        return fallback;
    }

    return value;
};


/**
 * Site configuration for the professional profile (Vasily).
 */
const siteConfig = {
    project: {
        theme: "professional",
        siteName: getEnvVar('SITE_NAME', 'Vasily Myazin'),
        author: getEnvVar('SITE_NAME', 'Vasily Myazin'),
        alias: "vasily",
        headline: "Tech Leadership Through Product Design and Coding",
        description: "Senior Software Engineer, Technical Leader, and Enterprise Solutions Architect.",
        email: "contact@vasilym.com",
        URL: getEnvVar('SITE_URL', 'https://vasilym.com'),
        location: "Miami, FL",
        logoAnimated: true,
        ogImage: getEnvVar('SITE_OGIMAGE', '/images/og-image-vm.png'),
        homepageImage: "/images/portrait-vasily-exp.jpg",
        favicon: "/images/favicon.png",
        siteLogo: "/images/vm-logo-22-2.svg",
    },
    appIds: {
        googleAnalytics: getEnvVar('GOOGLE_ANALYTICS_ID', '')
    },
    social: {
        linkedin: "https://www.linkedin.com/in/vmyazin/",
        telegram: "https://t.me/vasilymz",
    },
    navigation: {
        showAbout: true,
        showBlog: false,
        showNow: false
    }
};


/**
 * Middleware to set site configuration on response locals.
 */
const setSiteProfile = (req, res, next) => {
    res.locals.site = siteConfig;
    res.locals.isDev = process.env.NODE_ENV !== 'production';
    res.locals.envVars = { NODE_ENV: process.env.NODE_ENV };

    next();
};


module.exports = {
    setSiteProfile,
    getSiteProfiles: () => ({ professional: siteConfig }),
    siteConfig
};
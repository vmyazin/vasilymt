// routes/index.js
const express = require("express");
const router = express.Router();

const { siteConfig } = require('../app.config');


/**
 * Initialize site config middleware.
 */
router.use((req, res, next) => {
    res.locals.site = siteConfig;
    res.locals.envVars = { NODE_ENV: process.env.NODE_ENV };
    next();
});


/**
 * Loads site info with current year.
 */
const getSiteInfo = () => {
    return { currentYear: new Date().getFullYear() };
};

const siteInfo = getSiteInfo();

// OG Images for sharing
const aboutImageForShare = "/images/about/og-image-about-vm.jpeg";
const filmsImageForShare = "/images/films/og-image-films-vm.jpeg";


/**
 * Loads content from db.json for a specific page and profile.
 */
const getContent = (page, profile = 'professional') => {
    try {
        const db = require('../content/db.json');

        if (!db.pages || !db.pages[page] || !db.pages[page][profile]) {
            console.error(`Content not found: pages.${page}.${profile}`);
            return null;
        }

        return db.pages[page][profile];
    } catch (err) {
        console.error('Error loading content DB:', err);
        return null;
    }
};


// === ROUTES ===

router.get("/", (req, res) => {
    const content = getContent('home');

    res.render("home", {
        siteInfo,
        path: req.path,
        content
    });
});


router.get("/about", (req, res) => {
    const homeUrl = req.protocol + "://" + req.get("host");
    const imageFullUrl = homeUrl + aboutImageForShare;
    const content = getContent('about');

    if (!content) {
        return res.status(500).render('error', {
            message: 'Content not found',
            siteInfo,
            path: req.path
        });
    }

    res.render("about", {
        content,
        siteInfo,
        path: req.path,
        title: content.meta.title,
        imageFullUrl,
        profile: 'professional'
    });
});


router.get("/films", (req, res) => {
    const homeUrl = req.protocol + "://" + req.get("host");
    const imageFullUrl = homeUrl + filmsImageForShare;

    res.render("films", {
        siteInfo,
        path: req.path,
        title: "My Favorite Movies",
        imageFullUrl,
    });
});


router.get("/contact", (req, res) => {
    res.render("contact", { siteInfo, path: req.path, title: "Contact" });
});


router.get("/privacy", (req, res) => {
    res.render("privacy", { siteInfo, path: req.path, title: "Privacy Policy" });
});


router.get("/terms", (req, res) => {
    res.render("terms", { siteInfo, path: req.path, title: "Terms of Service" });
});


module.exports = router;
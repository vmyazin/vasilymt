// routes/index.js
const cors = require("cors");
const express = require("express");
const router = express.Router();

const { getSiteProfiles } = require('../app.config');
router.blogPath = __dirname + "/../content/articles/";
const MarkdownBlog = require("../scripts/blog-setup");
const blog = new MarkdownBlog(router.blogPath);
const siteInfo = blog.info;

// Initialize profiles
const siteProfiles = getSiteProfiles();

// Initialize envVars middleware
router.use((req, res, next) => {
  res.locals.envVars = {
    ACTIVE_PROFILE: process.env.ACTIVE_PROFILE || 'entrepreneur',
  };

  // Initialize site profile based on ACTIVE_PROFILE
  res.locals.site = siteProfiles[res.locals.envVars.ACTIVE_PROFILE];

  next();
});

// Initialize blog before setting up routes
let blogInitialized = false;
const initializeBlog = async () => {
  if (!blogInitialized) {
    await blog.initialize();
    await blog.sortBy({ property: "date", asc: false });
    blogInitialized = true;
  }
};

// Middleware to ensure blog is initialized
router.use(async (req, res, next) => {
  try {
    await initializeBlog();
    next();
  } catch (err) {
    console.error('Error initializing blog:', err);
    next(err);
  }
});

let dateObj = new Date();
let current = {};
current.year = dateObj.getFullYear();
siteInfo["currentYear"] = current.year;

// About OG Image
const aboutImageForShare = "/images/about/og-image-about-vm.jpeg",
  filmsImageForShare = "/images/films/og-image-films-vm.jpeg";

// Add content loader for about
const getContent = (profile) => {
  try {
    const db = require('../content/db.json');
  
    if (!db.pages || !db.pages.about) {
      console.error('Content DB missing about page section');
      return null;
    }

    if (!db.pages.about[profile]) {
      console.error(`Profile "${profile}" not found in content DB`);
      return null;
    }

    return db.pages.about[profile];
  } catch (err) {
    console.error('Error loading content DB:', err);
    return null;
  }
};

router.get("/", async (req, res) => {
  const articles = blog.posts;
  
  // Get content based on active profile
  const profile = process.env.ACTIVE_PROFILE || 'professional';
  const content = require('../content/db.json').pages.home[profile];
    
  res.render("home", { 
    articles, 
    siteInfo, 
    path: req.path,
    content
  });
});

router.get("/intro", (req, res) => {
  const articles = blog.posts;
  res.render("intro", { articles, siteInfo, path: req.path });
});

router.get("/about_old", (req, res) => {
  const homeUrl = req.protocol + "://" + req.get("host"),
    imageFullUrl = homeUrl + aboutImageForShare;
  res.render("about_old", {
    siteInfo,
    path: req.path,
    title: "About",
    imageFullUrl: imageFullUrl,
  });
});

router.get("/about", (req, res) => {
  const homeUrl = req.protocol + "://" + req.get("host"),
    imageFullUrl = homeUrl + aboutImageForShare;
  
  try {
    const content = getContent(process.env.ACTIVE_PROFILE);
    
    if (!content) {
      return res.status(500).render('error', { 
        message: 'Content not found for current profile',
        siteInfo,
        path: req.path 
      });
    }

    res.render("about", {
      content,
      siteInfo,
      path: req.path,
      title: content.meta.title,
      imageFullUrl: imageFullUrl,
      profile: process.env.ACTIVE_PROFILE
    });
  } catch (err) {
    console.error('Error loading about page:', err);
    res.status(500).render('error', { 
      message: 'Error loading content',
      siteInfo,
      path: req.path 
    });
  }
});

router.get("/films", (req, res) => {
  const homeUrl = req.protocol + "://" + req.get("host"),
    imageFullUrl = homeUrl + filmsImageForShare;
  res.render("films", {
    siteInfo,
    path: req.path,
    title: "My Favorite Movies",
    imageFullUrl: imageFullUrl,
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

// Add Now page route
router.get("/now", (req, res) => {
  // Check if Now page is enabled for current profile
  if (!res.locals.site?.navigation?.showNow) {
    console.log('Now page access attempted but disabled for profile:', process.env.ACTIVE_PROFILE);
    return res.redirect('/');
  }

  try {
    const db = require('../content/db.json');
    const profile = res.locals.envVars.ACTIVE_PROFILE || 'entrepreneur';
    
    if (!db.pages?.now?.[profile]) {
      return res.status(500).render('error', { 
        message: 'Now page content not found for current profile',
        siteInfo,
        path: req.path 
      });
    }

    const content = db.pages.now[profile];
    const homeUrl = req.protocol + "://" + req.get("host");

    res.render("now", {
      content,
      siteInfo,
      path: req.path,
      title: content.meta.title,
      description: content.meta.description,
      profile: profile,
      site: res.locals.site,
      lastUpdated: new Date().toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric'
      })
    });
  } catch (err) {
    console.error('Error loading now page:', err);
    res.status(500).render('error', { 
      message: 'Error loading content',
      siteInfo,
      path: req.path 
    });
  }
});

const checkBlogAccess = (req, res, next) => {
  // Check if site profile is available and showBlog is false
  if (!res.locals.site?.navigation?.showBlog) {
    return res.redirect('/');
  }
  next();
};

// Apply blog access check to all blog routes
router.use('/blog', checkBlogAccess);

// Blog index route
router.get("/blog", (req, res) => {
  const articles = blog.posts;
  res.render("blog", { 
    articles, 
    siteInfo, 
    path: req.path,
    title: "Blog",
    isBlog: true,
    site: res.locals.site // Ensure site profile is passed
  });
});

// Individual blog post route
router.get("/blog/:filename", async (req, res) => {
  const slug = req.params.filename;
  const postMetaData = blog.getPostMetadata(slug);
  
  // Check if post exists first
  if (!postMetaData) {
    return res.render("error", {
      error: { status: 404 },
      message: 'Blog post not found',
      path: req.path,
      isBlog: true,
      layout: 'blog',
      siteInfo,
      site: res.locals.site
    });
  }

  // Only get next/prev if we have a valid post
  const nextPostMetaData = blog.getPostMetadata(slug, 1);
  const prevPostMetaData = blog.getPostMetadata(slug, -1);
  
  // Add URL data
  const homeUrl = req.protocol + "://" + req.get("host");
  postMetaData.fullUrl = homeUrl + req.originalUrl;
  postMetaData.homeUrl = homeUrl;
  postMetaData.imageFullUrl = homeUrl + postMetaData.image;

  if (postMetaData.imageForShare) {
    postMetaData.imageForShareFullUrl = homeUrl + postMetaData.imageForShare;
  }

  try {
    const content = await blog.renderMarkdown(slug);
    
    res.render("article", {
      postMetaData,
      nextPostMetaData,
      prevPostMetaData,
      siteInfo,
      content,
      path: req.path,
      layout: 'blog',
      isBlog: true,
      isBlogPost: true,
      site: res.locals.site
    });
  } catch (err) {
    console.error('Error rendering blog post:', err);
    res.render("error", {
      error: { status: 500 },
      message: 'Error loading blog post',
      path: req.path,
      isBlog: true,
      layout: 'blog',
      siteInfo,
      site: res.locals.site
    });
  }
});

router.get("/tags", async (req, res) => {
  const tags = blog.tags;
  res.render("tags", { tags, siteInfo, path: req.path, title: "Tags" });
});

router.get("/tags/:tag", async (req, res) => {
  const tag = req.params.tag;
  const tags = blog.tags;
  const articles = await blog.getPostsByTag(tag);
  res.render("tag", {
    tag,
    tags,
    articles,
    siteInfo,
    path: req.path,
    title: tag,
  });
});


module.exports = router;
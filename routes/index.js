// routes/index.js
const cors = require("cors");
const express = require("express");
const router = express.Router();
router.blogPath = __dirname + "/../content/articles/";
const MarkdownBlog = require("../scripts/blog-setup");
const blog = new MarkdownBlog(router.blogPath);
const siteInfo = blog.info;
blog.init().then(() => blog.sortBy({ property: "date", asc: false }));

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
  
    // Check if we have the about page data
    if (!db.pages || !db.pages.about) {
      console.error('Content DB missing about page section');
      return null;
    }

    // Check if we have the profile data
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

router.get("/", (req, res) => {
  const articles = blog.posts;
  res.render("home", { articles, siteInfo, path: req.path });
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
  
  // Debug logging
  console.log('Active Profile:', process.env.ACTIVE_PROFILE);
  
  try {
    const content = getContent(process.env.ACTIVE_PROFILE);
    
    console.log('Active Profile:', process.env.ACTIVE_PROFILE);
    console.log('Full content:', JSON.stringify(content, null, 2));
    console.log('Bio section:', JSON.stringify(content.bio, null, 2));
    console.log('Bio images:', content.bio.images ? JSON.stringify(content.bio.images, null, 2) : 'No images found');

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
  res.render("terms", { siteInfo, path: req.path, title: "Privacy Policy" });
});

router.get("/blog", async (req, res) => {
  const articles = blog.posts;
  res.render("blog", { articles, siteInfo, path: req.path, title: "Blog" });
});

router.route("/api/search").get(cors(), async (req, res) => {
  const articles = blog.posts;
  const search = req.query.name.toLowerCase();

  if (search) {
    results = articles.filter((a) =>
      (a.title + a.description + a.author).toLowerCase().includes(search)
    );
  } else {
    results = [];
  }
  res.json(results);
});

router.get("/blog/:filename", async (req, res) => {
  const slug = req.params.filename;
  const postMetaData = blog.getPostMetadata(slug),
    nextPostMetaData = blog.getPostMetadata(slug, 1),
    prevPostMetaData = blog.getPostMetadata(slug, -1);
  postMetaData.fullUrl =
    req.protocol + "://" + req.get("host") + req.originalUrl;
  postMetaData.homeUrl = req.protocol + "://" + req.get("host");
  postMetaData.imageFullUrl = postMetaData.homeUrl + postMetaData.image;

  if (postMetaData.imageForShare !== undefined) {
    postMetaData.imageForShareFullUrl =
      postMetaData.homeUrl + postMetaData.imageForShare;
  }


  if (!postMetaData) {
    res.render("blog-not-found", slug);
    return;
  }

  res.render(
    "article",
    Object.assign(
      {},
      { postMetaData },
      { nextPostMetaData, prevPostMetaData },
      { siteInfo },
      {
        content: await blog.renderMarkdown(slug),
        path: req.path,
        layout: "blog",
        isBlog: true,
        isBlogPost: true,
      }
    )
  );
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

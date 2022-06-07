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

// ask Request for the host name and assign environment name
function getEnv(host) {
  if (host.includes("localhost")) {
    siteInfo.env = "local";
  } else if (host.includes("alpha")) {
    siteInfo.env = "alpha";
  } else {
    siteInfo.env = "prod";
  }
}

// About OG Image
const aboutImageForShare = "/images/about/og-image-about-vm.jpeg",
  filmsImageForShare = "/images/films/og-image-films-vm.jpeg";

router.get("/", (req, res) => {
  const articles = blog.posts;
  getEnv(req.get("host"));
  res.render("home", { articles, siteInfo, path: req.path });
});

router.get("/intro", (req, res) => {
  const articles = blog.posts;
  getEnv(req.get("host"));
  res.render("intro", { articles, siteInfo, path: req.path });
});

router.get("/about", (req, res) => {
  getEnv(req.get("host"));
  const homeUrl = req.protocol + "://" + req.get("host"),
    imageFullUrl = homeUrl + aboutImageForShare;
  res.render("about", {
    siteInfo,
    path: req.path,
    title: "About",
    imageFullUrl: imageFullUrl,
  });
});

router.get("/films", (req, res) => {
  getEnv(req.get("host"));
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
  getEnv(req.get("host"));
  res.render("contact", { siteInfo, path: req.path, title: "Contact" });
});

router.get("/privacy", (req, res) => {
  getEnv(req.get("host"));
  res.render("privacy", { siteInfo, path: req.path, title: "Privacy Policy" });
});

router.get("/terms", (req, res) => {
  getEnv(req.get("host"));
  res.render("terms", { siteInfo, path: req.path, title: "Privacy Policy" });
});

router.get("/blog", async (req, res) => {
  const articles = blog.posts;
  getEnv(req.get("host"));
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

  getEnv(req.get("host"));

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
  getEnv(req.get("host"));
  res.render("tags", { tags, siteInfo, path: req.path, title: "Tags" });
});

router.get("/tags/:tag", async (req, res) => {
  const tag = req.params.tag;
  const tags = blog.tags;
  const articles = await blog.getPostsByTag(tag);
  getEnv(req.get("host"));
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

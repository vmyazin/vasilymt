const cors = require('cors')
const express = require('express');
const router = express.Router();
router.blogPath = __dirname + '/../content/articles/';
const MarkdownBlog = require('../scripts/blog-setup');
const blog = new MarkdownBlog(router.blogPath);
const blogInfo = blog.info;
blog.init().then(() => blog.sortBy({ property: "date", asc: false }));

let dateObj = new Date();
let current = {};
current.year = dateObj.getFullYear();
blogInfo['currentYear'] = current.year;

// ask Request for the host name and assign environment name
function getEnv(host) {
  if (host.includes('localhost')) {
    blogInfo.env = 'local'
  } else if (host.includes('alpha')) {
    blogInfo.env = 'alpha'
  } else {
    blogInfo.env = 'prod'
  }
}

router.get('/', (req, res) => {
  const articles = blog.posts;
  res.render('index', { articles, blogInfo, path: req.path });
});

router.get('/about', (req, res) => {
  res.render('about', { blogInfo, path: req.path, title: "About" });
});

router.get('/contact', (req, res) => {
  res.render('contact', { blogInfo, path: req.path, title: "Contact"  });
});

router.get('/blog', async (req, res) => {
  const articles = blog.posts;
  res.render('blog', { articles, blogInfo, path: req.path, title: "Blog • Thoughts"  });
});

router.route('/api/search').get(cors(), async (req, res) => {
  const articles = blog.posts;
  const search = req.query.name.toLowerCase()

  if (search) {
    results = articles.filter((a) => (a.title + a.description + a.author).toLowerCase().includes(search));
  } else {
    results = []
  }
  res.json(results)
})

router.get('/blog/:filename', async (req, res) => {
  const slug = req.params.filename
  const postMetaData = blog.getPostMetadata(slug),
        nextPostMetaData = blog.getPostMetadata(slug, 1),
        prevPostMetaData = blog.getPostMetadata(slug, -1)
  postMetaData.fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
  getEnv(req.get('host'))

  if (!postMetaData) {
    res.render('blog-not-found', slug);
    return;
  }

  res.render('article', Object.assign({},
    { postMetaData },
    { nextPostMetaData, prevPostMetaData },
    { blogInfo },
    {
      content: await blog.renderMarkdown(slug),
      path: req.path,
      layout: 'blog',
      isBlog: true,
      isBlogPost: true
    }
  ));
});

router.get('/tags', async (req, res) => {
  const tags = blog.tags;
  res.render('tags', { tags, blogInfo, path: req.path, title: "Tags" });
});

router.get('/tags/:tag', async (req, res) => {
  const tag = req.params.tag;
  const tags = blog.tags;
  const articles = await blog.getPostsByTag(tag);
  res.render('tag', { tag, tags, articles, blogInfo, path: req.path, title: tag });
});

module.exports = router;

const cors = require('cors')
const express = require('express');
const router = express.Router();
router.blogPath = './content/articles/';
const MarkdownBlog = require('../scripts/blog-setup');
const blog = new MarkdownBlog(router.blogPath);
const blogInfo = blog.info;
blog.init().then(() => blog.sortBy({ property: "date", asc: false }));

router.get('/', (req, res) => {
  const articles = blog.posts;
  res.render('index', { articles, blogInfo, path: req.path });
});

router.get('/tags', async (req, res) => {
  const tags = blog.tags;
  res.render('tags', { tags, blogInfo, path: req.path });
});

router.get('/tags/:tag', async (req, res) => {
  const tag = req.params.tag;
  const tags = blog.tags;
  const articles = await blog.getPostsByTag(tag);
  res.render('tag', { tag, tags, articles, blogInfo, path: req.path });
});

router.get('/about', (req, res) => {
  res.render('about', { blogInfo, path: req.path });
});

router.get('/contact', (req, res) => {
  res.render('contact', { blogInfo, path: req.path });
});

router.get('/blog', async (req, res) => {
  const articles = blog.posts;
  res.render('blog', { articles, blogInfo, path: req.path });
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
  const slug = req.params.filename;
  const postMetaData = blog.getPostMetadata(slug);
  const nextPostMetaData = blog.getPostMetadata(slug, 1);
  const prevPostMetaData = blog.getPostMetadata(slug, -1);

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

module.exports = router;

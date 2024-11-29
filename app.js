// app.js
const dotenv = require('dotenv');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sassMiddleware = require("sass-middleware");
const { setSiteProfile, siteProfiles } = require('./app.config');

// Load environment variables first
dotenv.config();

// Env logging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Debugger should be visible:', process.env.NODE_ENV === 'development');
console.log('ACTIVE_PROFILE:', process.env.ACTIVE_PROFILE);

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const debugRouter = require('./routes/debug');
const robotsRouter = require('./routes/robots');
const sitemapRouter = require('./routes/sitemap');
const searchRouter = require('./routes/search');

const app = express();
const port = 3000;

// view engine setup
app.set('views', path.join(__dirname, 'pages'));
app.set('view engine', 'pug');

// Add profile and theme middleware before routes
app.use(setSiteProfile);
app.use((req, res, next) => {
  const profile = res.locals.site?.project?.theme || 'professional';
  res.locals.themeClass = `theme-${profile}`;
  next();
});

// Global envVars middleware
app.use((req, res, next) => {
  res.locals.envVars = {
    ACTIVE_PROFILE: process.env.ACTIVE_PROFILE || 'entrepreneur',
  };
  next();
});


// Make site config available to all templates
app.use((req, res, next) => {
  res.locals.siteProfiles = siteProfiles;
  next();
});

// Routes
app.use('/', robotsRouter);
app.use('/', sitemapRouter);
app.use('/', searchRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);
if (process.env.NODE_ENV !== 'production') {
  app.use('/debug', debugRouter);
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  sassMiddleware({
    src: __dirname + '/scss',
    dest: __dirname + '/public/stylesheets',
    debug: true,
    indentedSyntax: false,
    outputStyle: 'compressed',
    prefix: '/stylesheets',
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  // Ensure theme and profile data is available
  if (!res.locals.site) {
    res.locals.site = {
      project: {
        theme: 'professional',
        name: 'Default Profile'
      }
    };
  }

  // Set HTTP status
  res.status(err.status || 500);
  
  // Handle JSON requests
  if (req.accepts('html')) {
    res.render("error", {
      error: { status: err.status || 500 },
      message: err.status === 404 ? 'Page Not Found' : (err.message || 'Something went wrong'),
      path: req.path,
      siteInfo: req.app.locals.siteInfo || {},
      site: res.locals.site,
      themeClass: `theme-${res.locals.site.project.theme}`
    });
  } else {
    // API/JSON response
    res.json({ 
      error: err.status === 404 ? 'Not Found' : (err.message || 'An error occurred'),
      status: err.status || 500
    });
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports = app;
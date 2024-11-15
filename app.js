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

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const debugRouter = require('./routes/debug');

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

// Make site config available to all templates
app.use((req, res, next) => {
  res.locals.siteProfiles = siteProfiles;
  next();
});

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

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
if (process.env.NODE_ENV !== 'production') {
  app.use('/debug', debugRouter);
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports = app;
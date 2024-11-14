// app.js
let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
const sassMiddleware = require("sass-middleware");
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import config
const config = {
  websitePerson: process.env.websitePerson || 'Default Name',
  // Add other variables as needed
};

let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');

let app = express();
const port = 3000;

// view engine setup
app.set('views', path.join(__dirname, 'pages'));
app.set('view engine', 'pug');

// Make config available to all templates
app.use((req, res, next) => {
  res.locals.config = config;
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

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports = app;
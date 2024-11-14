// app.config.js
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create config object
const config = {
  websitePerson: process.env.websitePerson || 'Default Name',
  // Add other variables as needed
};

function basicConfig(app, options = {}) {
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    
    // view engine setup
    app.set('views', path.join(__dirname, 'pages'));
    app.set('view engine', 'pug');
    
    // Make config available to all templates
    app.use((req, res, next) => {
        res.locals.config = config;
        next();
    });
    
    app.use(express.static(path.join(__dirname, options.public ? options.public : 'public')));
}

module.exports = basicConfig;
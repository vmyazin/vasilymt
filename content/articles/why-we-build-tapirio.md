---
title: Why We Started Building Tapirio
date: 08-13-2020
author: Vasily Myazin
description: After looking for the perfect solution for a website platform we ended up building our own.
image: /images/blog/laptop-tapirio.jpg
tags: story, history, meta
---
![Tapirio on a laptop](/images/blog/laptop-tapirio.jpg)

**After years of building various websites for my personal projects and clients I formed an opinion on what makes a good, solid engine for a website or web application.**

I tried many different approaches and technologies and here are some examples to name:

- static HTML pages styled with basic CSS
- simplistic and minimally dynamic PHP projects
- CMSs of the days of yore names of which I cannot recall
- custom WordPress themes and plugins
- BackboneJS, AngularJS, React single page apps and websites
- practically non-opinionated nimble server solutions on NodeJS, with community’s favorite [ExpressJS](https://expressjs.com) web server

The last one on the list, an Express JS-based site/app, became my favorite. As a designer with developer chops I found it really enjoyable to use JavaScript on both front and back-end. Sass (SCSS) working out of the box, as well as my favorite HTML replacement Pug, a high-performance templating language. I am also a fan of [Markdown](/blog/markdown-basics): a simple mark-up language that allows writing articles in what I like to call “rich plain text.” Having those technologies in one toolkit is useful and powerful.

Sidenote: I’m using the terms “app,” “website” and “site” for the purposes of this post interchangeably.

I spent several years building WordPress sites (themes) by myself as well as in collaboration with other people, but found dealing with its dependence on a database and an extremely opinionated engine tedious. Moving hosting servers, running a local server, cutting the fat off the “factory” presets took a long time and I didn’t enjoy the process.

I believe starting a new web project should be pretty straight-forward. With the advent of [Google Cloud](https://cloud.google.com), [Heroku](https://www.heroku.com), [Linode](https://www.linode.com) amongst many other cloud hosting solutions, quick deployment of web apps became extremely simple. Downloading a package to initiate an Express-based project is easy enough but I end up spending longer than I’d like on adding the basics that I would normally want in any project.

Enter Tapirio, a project I built with my talented developer friend [Michael Makarov](https://www.makarovcomedy.com). Our mutual friend [Dimka Zdorov](https://www.dimka.com) also provided support and helped with ideation. A special shout out to [Pavel Koziakov](https://www.ecom.koziakov.com) for designing our cute mascot. Out project is a light and flexible toolkit, an advanced boilerplate for quickly getting started with a website project. The idea was to make it not too prescriptive, built for modern SEO requirements, customizable, with plenty of useful modules like blogging and rendering a podcast XML feed onto a web page. A handy Swiss army knife for those familiar with basic web development, if you will.

We are still in alpha at the time of this writing, but chugging along and deploying our personal projects based on Tapirio. This is an open-source project and we welcome contributions. Email your feedback and questions at *support at tapirio dot com*.

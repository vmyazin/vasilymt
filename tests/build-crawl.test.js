// tests/build-crawl.test.js
const { jest } = require('@jest/globals');
const path = require('path');
const fs = require('fs-extra');
const WebCrawler = require('../scripts/build-crawl');

describe('WebCrawler', () => {
  let crawler;
  
  beforeEach(() => {
    crawler = new WebCrawler('http://localhost:3000');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('parseSitemap correctly extracts URLs', async () => {
    const sampleXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>http://example.com/page1</loc></url>
        <url><loc>http://example.com/page2</loc></url>
      </urlset>
    `;
    
    const urls = await crawler.parseSitemap(sampleXml);
    expect(urls).toEqual(['http://example.com/page1', 'http://example.com/page2']);
  });

  test('extractPageContent extracts expected fields', async () => {
    const mockPage = {
      evaluate: jest.fn().mockResolvedValue({
        title: 'Test Page',
        description: 'Test Description',
        content: 'Test Content',
        url: '/test'
      })
    };
    
    crawler.page = mockPage;
    const content = await crawler.extractPageContent();
    
    expect(content).toHaveProperty('title');
    expect(content).toHaveProperty('description');
    expect(content).toHaveProperty('content');
    expect(content).toHaveProperty('url');
  });

  test('crawlPage respects retry limit', async () => {
    const mockPage = {
      goto: jest.fn().mockRejectedValue(new Error('Failed')),
      evaluate: jest.fn()
    };
    
    crawler.page = mockPage;
    await expect(crawler.crawlPage('http://test.com')).rejects.toThrow();
    expect(mockPage.goto).toHaveBeenCalledTimes(3);
  });

  test('crawl generates valid search index', async () => {
    const mockUrls = ['http://test.com/page1', 'http://test.com/page2'];
    const mockPageData = {
      title: 'Test',
      description: 'Test desc',
      content: 'Test content',
      url: '/test'
    };

    crawler.fetchSitemap = jest.fn().mockResolvedValue(mockUrls);
    crawler.crawlPage = jest.fn().mockResolvedValue(mockPageData);
    crawler.initialize = jest.fn();
    crawler.browser = { close: jest.fn() };

    const index = await crawler.crawl();
    
    expect(index).toHaveLength(2);
    expect(index[0]).toEqual(mockPageData);
  });
});
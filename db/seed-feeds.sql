-- Newsroom seed feeds for Worldwire

INSERT INTO feeds (name, url, category, country, language, priority) VALUES
('Financial Times', 'https://www.ft.com/?format=rss', 'world', 'UK', 'en', 9),
('The Economist', 'https://www.economist.com/the-world-this-week/rss.xml', 'world', 'UK', 'en', 9),
('The Economist Finance', 'https://www.economist.com/finance-and-economics/rss.xml', 'business', 'UK', 'en', 8),
('NYT World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'world', 'US', 'en', 8),
('NYT Business', 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', 'business', 'US', 'en', 7),
('NYT Technology', 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', 'tech', 'US', 'en', 8),
('WSJ World', 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', 'world', 'US', 'en', 8),
('WSJ Tech', 'https://feeds.a.dj.com/rss/RSSWSJD.xml', 'tech', 'US', 'en', 7),
('Washington Post World', 'https://feeds.washingtonpost.com/rss/world', 'world', 'US', 'en', 7),
('Washington Post Business', 'https://feeds.washingtonpost.com/rss/business', 'business', 'US', 'en', 6),
('BBC World News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'world', 'UK', 'en', 7),
('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'business', 'UK', 'en', 6),
('The Guardian World', 'https://www.theguardian.com/world/rss', 'world', 'UK', 'en', 6),
('NPR News', 'https://feeds.npr.org/1001/rss.xml', 'world', 'US', 'en', 6),
('MIT Technology Review', 'https://www.technologyreview.com/feed/', 'tech', 'US', 'en', 9),
('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech', 'US', 'en', 8),
('Wired', 'https://www.wired.com/feed/rss', 'tech', 'US', 'en', 8),
('The Verge', 'https://www.theverge.com/rss/index.xml', 'tech', 'US', 'en', 7),
('TechCrunch', 'https://techcrunch.com/feed/', 'tech', 'US', 'en', 7),
('IEEE Spectrum', 'https://spectrum.ieee.org/rss/fulltext', 'tech', 'US', 'en', 8),
('Bloomberg Technology', 'https://feeds.bloomberg.com/technology/news.rss', 'tech', 'US', 'en', 7)
ON CONFLICT (url) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  active = true,
  priority = EXCLUDED.priority;

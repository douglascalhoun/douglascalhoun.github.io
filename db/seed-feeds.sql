-- Seed initial RSS feeds

-- Global / International
INSERT INTO feeds (name, url, category, country, language) VALUES
('BBC World News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'world', 'UK', 'en'),
('NYT World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'world', 'US', 'en'),
('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'world', 'Qatar', 'en'),
('The Guardian World', 'https://www.theguardian.com/world/rss', 'world', 'UK', 'en');

-- United States
INSERT INTO feeds (name, url, category, country, language) VALUES
('NPR News', 'https://feeds.npr.org/1001/rss.xml', 'news', 'US', 'en'),
('New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', 'news', 'US', 'en'),
('Washington Post', 'https://feeds.washingtonpost.com/rss/world', 'world', 'US', 'en'),
('CNN Top Stories', 'http://rss.cnn.com/rss/cnn_topstories.rss', 'news', 'US', 'en');

-- Europe
INSERT INTO feeds (name, url, category, country, language) VALUES
('Der Spiegel International', 'https://www.spiegel.de/international/index.rss', 'news', 'Germany', 'en'),
('El País', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', 'news', 'Spain', 'es');

-- Asia
INSERT INTO feeds (name, url, category, country, language) VALUES
('South China Morning Post', 'https://www.scmp.com/rss/91/feed', 'news', 'Hong Kong', 'en'),
('The Japan Times', 'https://www.japantimes.co.jp/feed/', 'news', 'Japan', 'en');

-- Tech & Business
INSERT INTO feeds (name, url, category, country, language) VALUES
('TechCrunch', 'https://techcrunch.com/feed/', 'tech', 'US', 'en'),
('Hacker News', 'https://hnrss.org/frontpage', 'tech', 'Global', 'en'),
('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech', 'US', 'en');

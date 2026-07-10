-- Seed Worldwire editorial feeds (tech-first)

-- AI / frontier tech
INSERT INTO feeds (name, url, category, country, language) VALUES
('OpenAI Blog', 'https://openai.com/blog/rss.xml', 'ai', 'US', 'en'),
('Google AI Blog', 'https://blog.google/technology/ai/rss/', 'ai', 'US', 'en'),
('DeepMind Blog', 'https://deepmind.google/blog/rss.xml', 'ai', 'UK', 'en'),
('MIT Technology Review', 'https://www.technologyreview.com/feed/', 'tech', 'US', 'en'),
('The Verge AI', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'ai', 'US', 'en'),
('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech', 'US', 'en'),
('TechCrunch', 'https://techcrunch.com/feed/', 'tech', 'US', 'en'),
('Wired', 'https://www.wired.com/feed/rss', 'tech', 'US', 'en'),
('Hacker News Front Page', 'https://hnrss.org/frontpage', 'tech', 'Global', 'en'),
('IEEE Spectrum', 'https://spectrum.ieee.org/rss/fulltext', 'tech', 'US', 'en'),
('VentureBeat AI', 'https://venturebeat.com/category/ai/feed/', 'ai', 'US', 'en')
ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, active = true;

-- VR / spatial
INSERT INTO feeds (name, url, category, country, language) VALUES
('UploadVR', 'https://uploadvr.com/feed/', 'vr', 'US', 'en'),
('Road to VR', 'https://www.roadtovr.com/feed/', 'vr', 'US', 'en')
ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, active = true;

-- Business with tech gravity
INSERT INTO feeds (name, url, category, country, language) VALUES
('FT Technology', 'https://www.ft.com/technology?format=rss', 'business', 'UK', 'en'),
('Bloomberg Technology', 'https://feeds.bloomberg.com/technology/news.rss', 'business', 'US', 'en')
ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, active = true;

-- Selective geopolitics
INSERT INTO feeds (name, url, category, country, language) VALUES
('BBC World News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'world', 'UK', 'en')
ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, active = true;

# Worldwire

Unread feed of serious English-language news and tech reporting.

## What it does
1. Crawls respected newsrooms (FT, NYT, WSJ, WaPo, Economist, BBC, plus tech press)
2. Drops celebrity gossip and incremental political noise
3. Caches stories in your browser
4. Shows only stories you have not marked read
5. Harvests public comments for NYT and Ars Technica, un-collapsed under each story

## Comments
Only shown for sources we can harvest:
- **NYT** — community `requestHandler` JSON
- **Ars Technica** — OpenForum / XenForo thread linked from each story

Other sources have no comment UI.

## Not included
No images, search, filters, favorites, or push-notification UI.

## Links
- Main (all sources): https://rss-news-aggregator.netlify.app/
- Source index: https://rss-news-aggregator.netlify.app/sources
- Per-source pages: https://rss-news-aggregator.netlify.app/source/<slug>
  (e.g. `/source/ars-technica`, `/source/nyt-technology`)

## Local development
```bash
npm install
npm run dev:rss
```

## Production
https://rss-news-aggregator.netlify.app

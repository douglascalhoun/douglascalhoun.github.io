# Worldwire

Unread feed of serious English-language news and tech reporting.

## What it does
1. Crawls respected newsrooms (FT, NYT, WSJ, WaPo, Economist, BBC, plus tech press)
2. Drops celebrity gossip and incremental political noise
3. Caches stories in your browser
4. Shows only stories you have not marked read
5. Harvests public comments (when available) and un-collapses them under each story

## Comments
Reliable public harvest today:
- **NYT** — community `requestHandler` JSON (author, body, recs, replies, timestamps)
- **Ars Technica** — OpenForum / XenForo thread linked from each story
- **Guardian** — Discussion API (adapter ready if the feed returns)

Other Worldwire sources are marked unsupported with a clear reason (BBC comments usually off; FT / Economist / WSJ / Bloomberg / WaPo / MIT TR not publicly harvestable from here). Comments load on expand and cache in Postgres for ~30 minutes.

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

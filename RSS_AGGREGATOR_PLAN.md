# RSS Aggregator with Push Notifications - Project Plan

## Overview
Build a global news RSS aggregator that fetches headlines from top news sources worldwide and sends push notifications with headlines and blurbs to keep you informed in real-time.

## System Architecture

### Frontend
- **Framework**: Vite + React (or vanilla JS for simplicity)
- **UI Components**: News feed display, subscription management, notification preferences
- **Service Worker**: Handle push notifications and offline functionality
- **Storage**: IndexedDB for offline article caching

### Backend (Netlify)
- **Functions**: API endpoints for feed management
- **Scheduled Functions**: Periodic RSS feed fetching (every 15-30 minutes)
- **Database**: Netlify Database (Postgres) for storing feeds, articles, user preferences
- **Push Service**: Web Push API integration

## Database Schema

### Tables

**`feeds`**
```sql
- id (uuid, primary key)
- name (text) - e.g., "BBC World News"
- url (text) - RSS feed URL
- category (text) - e.g., "world", "tech", "business"
- country (text) - e.g., "UK", "US", "Global"
- language (text) - e.g., "en", "es"
- active (boolean)
- fetch_interval_minutes (integer) - default 30
- last_fetched_at (timestamp)
- created_at (timestamp)
```

**`articles`**
```sql
- id (uuid, primary key)
- feed_id (uuid, foreign key -> feeds.id)
- title (text)
- description (text)
- link (text)
- pub_date (timestamp)
- guid (text, unique) - RSS item unique identifier
- author (text, nullable)
- categories (text[]) - array of tags
- image_url (text, nullable)
- content (text, nullable) - full article content if available
- notified (boolean) - has user been notified?
- created_at (timestamp)
```

**`subscriptions`**
```sql
- id (uuid, primary key)
- user_id (text) - browser fingerprint or session ID
- push_subscription (jsonb) - Web Push subscription object
- notification_enabled (boolean)
- keywords (text[]) - notify only for articles matching these keywords
- excluded_keywords (text[]) - skip articles with these keywords
- categories (text[]) - which categories to include
- countries (text[]) - which countries to include
- created_at (timestamp)
- updated_at (timestamp)
```

**`notification_log`**
```sql
- id (uuid, primary key)
- subscription_id (uuid, foreign key)
- article_id (uuid, foreign key)
- sent_at (timestamp)
- status (text) - "sent", "failed", "clicked"
```

## Top News Sources (Initial Set)

### Global / International
- BBC World News - https://feeds.bbci.co.uk/news/world/rss.xml
- Reuters World - http://feeds.reuters.com/reuters/worldNews
- Al Jazeera - https://www.aljazeera.com/xml/rss/all.xml
- The Guardian World - https://www.theguardian.com/world/rss

### United States
- NPR News - https://feeds.npr.org/1001/rss.xml
- New York Times - https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml
- Washington Post - https://feeds.washingtonpost.com/rss/world
- CNN - http://rss.cnn.com/rss/cnn_topstories.rss

### Europe
- Der Spiegel (Germany) - https://www.spiegel.de/international/index.rss
- Le Monde (France) - https://www.lemonde.fr/rss/une.xml
- El País (Spain) - https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada

### Asia
- South China Morning Post - https://www.scmp.com/rss/91/feed
- The Japan Times - https://www.japantimes.co.jp/feed/
- The Times of India - https://timesofindia.indiatimes.com/rssfeedstopstories.cms

### Tech & Business
- TechCrunch - https://techcrunch.com/feed/
- Hacker News - https://hnrss.org/frontpage
- Financial Times - https://www.ft.com/?format=rss
- Bloomberg - https://feeds.bloomberg.com/markets/news.rss

## Core Features

### 1. RSS Feed Aggregation
- **Scheduled Function** runs every 15-30 minutes
- Fetches all active feeds
- Parses RSS/Atom formats
- Deduplicates articles by GUID
- Extracts: title, description, link, pub_date, author, image
- Stores new articles in database

### 2. Push Notifications
- **Web Push API** for browser notifications
- User subscribes via frontend
- Service worker receives and displays notifications
- Notification format:
  ```
  Title: [Source] Headline
  Body: Article blurb (first 150 chars)
  Icon: Source logo or article image
  Actions: "Read", "Dismiss", "Save for Later"
  ```

### 3. Smart Filtering
- **Keyword matching**: Only notify for specific topics
- **Category filtering**: Select news categories (world, tech, sports)
- **Country/region filtering**: Focus on specific regions
- **Time windows**: Quiet hours (no notifications during sleep)
- **Rate limiting**: Max N notifications per hour

### 4. User Interface
- **News Feed View**: Chronological list of all articles
- **Category Tabs**: Filter by category
- **Source Management**: Enable/disable specific sources
- **Notification Settings**: Configure preferences
- **Search**: Full-text search across headlines and descriptions
- **Read/Unread tracking**: Mark articles as read
- **Favorites/Bookmarks**: Save articles for later

## Technical Implementation Details

### RSS Parsing
```javascript
// Use rss-parser library
import Parser from 'rss-parser';

const parser = new Parser();
const feed = await parser.parseURL(feedUrl);

for (const item of feed.items) {
  // Extract and store article
}
```

### Scheduled Function (Netlify)
```javascript
// netlify/functions/fetch-rss.mjs
export default async (req) => { /* ... */ };

export const config = {
  schedule: "*/30 * * * *" // Every 30 minutes
};
```

### Web Push Setup
```javascript
// Generate VAPID keys for push notifications
// Store public key in frontend, private key in env vars
// Subscribe user's browser to push notifications
// Send notifications via web-push library
```

### Database Connection
```javascript
// Use @netlify/database for Postgres access
import { getDb } from '@netlify/database';

const db = await getDb();
const articles = await db.query('SELECT * FROM articles WHERE notified = false');
```

## Development Phases

### Phase 1: Core Infrastructure (Foundation)
1. Set up Netlify Database with schema
2. Create seed data with initial RSS feeds
3. Build RSS fetching scheduled function
4. Test article storage and deduplication

### Phase 2: API Layer
1. Create REST API endpoints:
   - GET /api/articles (list articles)
   - GET /api/feeds (list feeds)
   - POST /api/subscribe (push subscription)
   - PUT /api/preferences (update notification settings)
2. Implement pagination and filtering
3. Add error handling and logging

### Phase 3: Frontend UI
1. Build article feed display
2. Add source/category filtering
3. Implement search functionality
4. Create settings panel

### Phase 4: Push Notifications
1. Set up VAPID keys
2. Implement service worker
3. Add subscription flow in frontend
4. Build notification sender function
5. Test notification delivery

### Phase 5: Smart Features
1. Keyword filtering
2. Rate limiting
3. Read/unread tracking
4. Favorites system
5. Notification history

### Phase 6: Polish & Deploy
1. Add loading states and error handling
2. Optimize performance
3. Add analytics (optional)
4. Deploy to Netlify
5. Test end-to-end

## Environment Variables Needed

```
DATABASE_URL - Auto-provided by Netlify Database
VAPID_PUBLIC_KEY - For push notifications
VAPID_PRIVATE_KEY - For push notifications
VAPID_SUBJECT - mailto:your@email.com
```

## File Structure

```
/workspace/
├── netlify/
│   └── functions/
│       ├── fetch-rss.mjs (scheduled)
│       ├── articles.mjs (GET /api/articles)
│       ├── feeds.mjs (GET /api/feeds)
│       ├── subscribe.mjs (POST /api/subscribe)
│       ├── notify.mjs (send push notifications)
│       └── preferences.mjs (user preferences)
├── src/
│   ├── components/
│   │   ├── ArticleCard.jsx
│   │   ├── FeedList.jsx
│   │   ├── SettingsPanel.jsx
│   │   └── NotificationToggle.jsx
│   ├── services/
│   │   ├── api.js (API client)
│   │   └── notifications.js (push setup)
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── sw.js (service worker)
│   └── manifest.json
├── db/
│   ├── schema.sql
│   └── seed-feeds.sql
├── package.json
├── netlify.toml
└── vite.config.js
```

## Next Steps / Questions

1. **UI Preference**: Simple vanilla JS or React-based interface?
2. **Notification Frequency**: How often do you want to check feeds? Every 15 min, 30 min, hourly?
3. **Notification Volume**: Do you want ALL headlines or smart filtering from the start?
4. **Authentication**: Single user (you) or multi-user support?
5. **Mobile**: Web app only or also native mobile notifications via PWA?

## Estimated Complexity

- **Backend Setup**: Medium (Netlify Functions + Database)
- **RSS Parsing**: Low (existing libraries)
- **Push Notifications**: Medium-High (requires VAPID keys, service worker, testing)
- **Frontend**: Medium (depends on UI complexity)
- **Smart Filtering**: Medium (keyword matching, preferences)

**Total**: This is a substantial project that will require multiple implementation sessions. Core functionality (fetch + display + basic notifications) can be achieved first, with smart filtering added iteratively.

---

**Ready to proceed?** I can start with Phase 1 (database setup and RSS fetching) or we can adjust the plan based on your priorities.

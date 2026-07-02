# RSS News Aggregator

A global news RSS aggregator with push notifications that fetches headlines from top news sources worldwide.

## Features

- 🌍 **Global News Sources**: Aggregates from BBC, Reuters, Al Jazeera, NYT, and more
- 🔔 **Push Notifications**: Real-time browser notifications for new articles
- 🎯 **Smart Filtering**: Keyword-based and category-based filtering
- 📱 **Responsive Design**: Works on desktop and mobile
- ⚡ **Automatic Updates**: RSS feeds fetched every 30 minutes
- 🚀 **Powered by Netlify**: Functions, Database, and Scheduled Functions

## Architecture

### Backend (Netlify Functions)
- **fetch-rss.mjs**: Scheduled function (every 30 min) that fetches RSS feeds
- **send-notifications.mjs**: Scheduled function (every 15 min) that sends push notifications
- **articles.mjs**: API endpoint to fetch articles
- **feeds.mjs**: API endpoint to list RSS feeds
- **subscribe.mjs**: API endpoint to manage push subscriptions
- **db-init.mjs**: Database initialization endpoint

### Database (Netlify Database - Postgres)
- **feeds**: RSS feed sources
- **articles**: Fetched news articles
- **subscriptions**: User push notification subscriptions
- **notification_log**: Notification history

### Frontend (React + Vite)
- Article feed with filtering
- Settings panel for notification preferences
- Feed management UI
- Service worker for push notifications

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate VAPID Keys for Push Notifications
```bash
npx web-push generate-vapid-keys
```

### 3. Set Environment Variables in Netlify Dashboard
Go to Netlify Dashboard → Site → Environment Variables and add:

```
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:your-email@example.com
```

### 4. Deploy to Netlify
```bash
npx netlify deploy --prod
```

### 5. Initialize Database
After deployment, visit:
```
https://your-site.netlify.app/.netlify/functions/db-init
```

This will create the database schema and seed initial RSS feeds.

### 6. Manual RSS Fetch (Optional)
To manually trigger RSS fetching:
```
https://your-site.netlify.app/.netlify/functions/fetch-rss
```

## Development

### Local Development
```bash
npm run dev:rss
```

### Build
```bash
npm run build:rss
```

## Usage

1. **View Articles**: Browse the latest news from all sources
2. **Filter by Category**: Click category tabs to filter
3. **Enable Notifications**: Click the notification bell icon
4. **Configure Preferences**: Click the settings icon to:
   - Add keywords to include/exclude
   - Select specific categories
   - Choose regions/countries
5. **View Feeds**: Click the feed icon to see all RSS sources

## Notification Preferences

- **Include Keywords**: Only get notified for articles containing these words
- **Exclude Keywords**: Never get notified for articles containing these words
- **Categories**: Select which news categories to follow
- **Countries**: Filter by news source country/region

## RSS Sources Included

### Global News
- BBC World News
- Reuters World
- Al Jazeera
- The Guardian World

### US News
- NPR News
- New York Times
- Washington Post
- CNN

### International
- Der Spiegel (Germany)
- El País (Spain)
- South China Morning Post (Hong Kong)
- The Japan Times (Japan)

### Tech & Business
- TechCrunch
- Hacker News
- Ars Technica

## Technical Stack

- **Frontend**: React, Vite
- **Backend**: Netlify Functions (Node.js)
- **Database**: Netlify Database (Postgres)
- **Notifications**: Web Push API with Service Workers
- **RSS Parsing**: rss-parser
- **Push Library**: web-push

## Scheduled Functions

The app uses Netlify Scheduled Functions to automate:

1. **RSS Fetching** (every 30 minutes)
   - Fetches all active RSS feeds
   - Parses and stores new articles
   - Deduplicates by GUID

2. **Push Notifications** (every 15 minutes)
   - Finds unnotified articles
   - Matches against user preferences
   - Sends web push notifications
   - Marks articles as notified

## API Endpoints

- `GET /.netlify/functions/articles?category=<category>&limit=50&offset=0`
- `GET /.netlify/functions/feeds`
- `POST /.netlify/functions/subscribe`
- `GET /.netlify/functions/vapid-public-key`
- `GET /.netlify/functions/db-init`
- `GET /.netlify/functions/fetch-rss`
- `GET /.netlify/functions/send-notifications`

## Browser Support

- Chrome 50+
- Firefox 44+
- Safari 16+ (with push notifications on macOS 13+)
- Edge 17+

## License

MIT

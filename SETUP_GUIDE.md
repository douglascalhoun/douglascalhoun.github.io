# RSS Aggregator Setup Guide

## Generated VAPID Keys

**IMPORTANT**: Add these to your Netlify environment variables before deploying!

### Go to Netlify Dashboard

1. Navigate to: https://app.netlify.com
2. Select your site
3. Go to: Site settings → Environment variables
4. Add the following variables:

```
VAPID_PUBLIC_KEY=BE2BWLH3x2zUn2t_UcLBIEMz3Lqrv2WkMliXX36brOiQa4rfbaXlUk-oBGBD7n6Q2NsTH_G8H7vYlA4e9eBhgHI
VAPID_PRIVATE_KEY=NTPsn4UIi7yuArmrOlExHsdbf9A8QJCncDWEjXY_Pck
VAPID_SUBJECT=mailto:douglas.calhoun@gmail.com
```

## Deployment Steps

### 1. Link to Netlify (if not already linked)
```bash
npx netlify link
```

Or create a new site:
```bash
npx netlify init
```

### 2. Deploy the Site
```bash
npx netlify deploy --prod
```

### 3. Set Up Netlify Database

The site will automatically provision Netlify Database on first deploy. The DATABASE_URL will be available in your functions.

### 4. Initialize the Database

After deployment, visit this URL to create tables and seed data:
```
https://your-site.netlify.app/.netlify/functions/db-init
```

You should see a response like:
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "feedCount": 15
}
```

### 5. Test RSS Fetching

Manually trigger RSS fetching:
```
https://your-site.netlify.app/.netlify/functions/fetch-rss
```

This will fetch articles from all RSS feeds and store them in the database.

### 6. Verify the Site

Open your deployed site URL and you should see:
- The RSS News Aggregator interface
- Articles from various news sources
- Category tabs (World, News, Tech, etc.)
- Notification bell icon in the header

### 7. Enable Push Notifications

On the deployed site:
1. Click the notification bell icon 🔕
2. Allow notification permission when prompted
3. The icon should turn to 🔔 (green)
4. New articles will now trigger browser notifications

## Scheduled Functions

Netlify will automatically run:
- **RSS Fetching**: Every 30 minutes
- **Push Notifications**: Every 15 minutes

You can monitor these in: Netlify Dashboard → Functions → Scheduled executions

## Troubleshooting

### Database connection errors
- Ensure Netlify Database is provisioned (check Site settings → Add-ons)
- Run the db-init function to create tables

### No articles appearing
- Manually trigger fetch-rss function
- Check function logs in Netlify Dashboard → Functions → fetch-rss

### Push notifications not working
- Verify VAPID keys are set in environment variables
- Check browser console for errors
- Ensure service worker is registered (check DevTools → Application → Service Workers)

### CORS errors
- All API endpoints have CORS headers configured
- If issues persist, check Network tab in browser DevTools

## Next Steps

After successful deployment:
1. Test the article feed
2. Enable notifications and verify they work
3. Configure your notification preferences
4. Monitor the scheduled function logs
5. Add more RSS feeds if desired (edit db/seed-feeds.sql and re-run db-init)

## Updating RSS Feeds

To add more feeds:
1. Edit `db/seed-feeds.sql`
2. Add new INSERT statements
3. Redeploy the site
4. Run the db-init function again (it will skip duplicates)

## Production Checklist

- ✅ VAPID keys configured
- ✅ Site deployed to Netlify
- ✅ Database initialized
- ✅ RSS feeds fetched
- ✅ Push notifications enabled and tested
- ✅ Scheduled functions running

# Quick Start - RSS News Aggregator

## ✅ Deployment Complete!

Your RSS News Aggregator is now live at:
**https://rss-news-aggregator.netlify.app**

## Next Step: Set Up Database

The site is deployed, but you need to configure a database to make it functional.

### Recommended: Neon Postgres (Free Tier)

1. **Sign up at Neon**: https://neon.tech
2. **Create a new project** (takes ~30 seconds)
3. **Get your connection string** from the Neon dashboard
   - It looks like: `postgresql://user:password@host.neon.tech/database`
4. **Add to Netlify environment variables**:
   ```bash
   npx netlify env:set DATABASE_URL "your-connection-string-here"
   ```
5. **Initialize the database**:
   Visit: https://rss-news-aggregator.netlify.app/.netlify/functions/db-init
   
   You should see:
   ```json
   {
     "success": true,
     "message": "Database initialized successfully",
     "feedCount": 15
   }
   ```

6. **Fetch initial articles**:
   Visit: https://rss-news-aggregator.netlify.app/.netlify/functions/fetch-rss
   
   This will fetch articles from all RSS feeds.

7. **Refresh the site** and you should see articles!

## Features Ready to Use

✅ **Frontend deployed** - UI is live and accessible
✅ **Functions deployed** - All 7 API endpoints are ready
✅ **Push notifications** - VAPID keys configured
✅ **Scheduled functions** - Will run automatically once database is set up
- RSS fetching: Every 30 minutes
- Push notifications: Every 15 minutes

## Alternative Database Options

### Option 1: Supabase (Free)
1. Sign up at https://supabase.com
2. Create project → Get connection string
3. Same setup as Neon above

### Option 2: Netlify Database (Requires Team Plan)
1. Upgrade to Netlify Team plan ($19/month)
2. Database will auto-provision
3. Redeploy: `npx netlify deploy --prod`

## Testing Without Database

The frontend will load but show no articles until database is configured.
Functions will return appropriate error messages if DATABASE_URL is not set.

## Current Status

- ✅ Site: https://rss-news-aggregator.netlify.app
- ✅ Functions: All bundled and deployed
- ✅ Environment: VAPID keys configured
- ⏳ Database: Needs to be configured (see above)

## What Happens Next

Once database is configured:
1. **Scheduled RSS fetching** will run every 30 minutes automatically
2. **Push notifications** will be sent every 15 minutes for new articles
3. **15+ global news sources** will be aggregated
4. **Smart filtering** based on your preferences

## Support

If you encounter issues:
1. Check function logs: https://app.netlify.com/projects/rss-news-aggregator/logs/functions
2. Verify DATABASE_URL is set: `npx netlify env:list`
3. Test database connection: Visit the db-init function URL

Enjoy your RSS News Aggregator! 📰🔔

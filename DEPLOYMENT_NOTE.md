# Deployment Note - Netlify Database Limitation

## Issue Encountered

The deployment failed because **Netlify Database** requires a Team or Enterprise plan and is not available on the Free tier.

Error message:
```
database feature not available for this account
```

## Solutions

### Option 1: Use Alternative Database (Recommended for Free Tier)

Replace Netlify Database with a free alternative:

#### A. Neon (Serverless Postgres - Free Tier Available)
1. Sign up at https://neon.tech
2. Create a new project
3. Get the connection string
4. Set environment variable in Netlify:
   ```
   DATABASE_URL=postgresql://user:password@host/database
   ```
5. Update `netlify/functions/lib/db.mjs` to use a standard Postgres client instead of `@netlify/database`

#### B. Supabase (Free Tier Available)
1. Sign up at https://supabase.com
2. Create a new project
3. Get the database connection string
4. Similar setup as Neon above

### Option 2: Upgrade Netlify Plan

Upgrade to Netlify Team plan to access Netlify Database:
- Go to https://app.netlify.com/teams/douglascalhoun/overview
- Upgrade to Team plan ($19/month)
- Redeploy the site

### Option 3: Simplified Version Without Database

For immediate deployment, we can create a simpler version that:
- Uses Netlify Blobs for article storage
- Removes scheduled functions
- Fetches RSS on-demand in the frontend

## Current Deployment Status

The site build was successful, but deployment failed during database provisioning.

Site URL (once database issue is resolved): https://rss-news-aggregator.netlify.app

## Next Steps

Please choose one of the options above. I recommend:

1. **For Free Solution**: Use Neon Postgres (Option 1A)
2. **For Full Features**: Upgrade Netlify plan (Option 2)
3. **For Quick Test**: Deploy simplified version without database (Option 3)

Let me know which approach you'd like to take, and I'll update the code accordingly.

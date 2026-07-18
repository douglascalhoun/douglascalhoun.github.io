# Worldwire Presenter

LLM-mediated news desk on top of the existing RSS crawl.

## What it does

1. **Crawl** RSS feeds on a schedule (`fetch-rss`).
2. **Scrape** publicly visible article text (`scrape-articles`) into Postgres (`scraped_body`).
3. **Remember** per-browser user preferences (`user_profiles.preferences`).
4. **Brief** “what’s new since you left” via Netlify AI Gateway (`presenter-digest`).
5. **Chat** to refine interests, mute sources, change tone, or request feeds (`presenter-chat`).

Home (`/`) is the presenter. Raw headline river lives at `/archive`.

## Enable AI

In the Netlify UI for this site: enable **AI Gateway / AI features**, then redeploy.  
Do **not** set your own `OPENAI_API_KEY` — Netlify injects gateway credentials.

Optional: `PRESENTER_MODEL` (default `gpt-4o-mini`).

## Key endpoints

| Function | Role |
|----------|------|
| `scrape-articles` | Extract public article text (scheduled + manual) |
| `presenter-prefs` | GET/POST user memory |
| `presenter-digest` | Build / cache briefing |
| `presenter-chat` | Conversational preference updates |

## Identity

Anonymous `userId` in `localStorage` (`worldwire.userId`), sent as `X-User-Id`.

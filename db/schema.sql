-- RSS Aggregator Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feeds table: stores RSS feed sources
CREATE TABLE IF NOT EXISTS feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    country TEXT,
    language TEXT DEFAULT 'en',
    active BOOLEAN DEFAULT true,
    fetch_interval_minutes INTEGER DEFAULT 30,
    priority INTEGER DEFAULT 5,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles table: stores fetched articles
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL,
    pub_date TIMESTAMP WITH TIME ZONE,
    guid TEXT UNIQUE NOT NULL,
    author TEXT,
    categories TEXT[],
    image_url TEXT,
    content TEXT,
    notified BOOLEAN DEFAULT false,
    relevance_score INTEGER DEFAULT 0,
    is_relevant BOOLEAN DEFAULT true,
    topics TEXT[] DEFAULT '{}',
    filter_reasons TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table: stores user push notification subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    push_subscription JSONB NOT NULL,
    notification_enabled BOOLEAN DEFAULT true,
    keywords TEXT[],
    excluded_keywords TEXT[],
    categories TEXT[],
    countries TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification log: tracks sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'sent'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_notified ON articles(notified) WHERE notified = false;
CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles(guid);
CREATE INDEX IF NOT EXISTS idx_feeds_active ON feeds(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_article_id ON notification_log(article_id);

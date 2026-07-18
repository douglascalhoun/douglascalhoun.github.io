import React, { useEffect, useRef, useState, useTransition } from 'react';
import * as api from '../services/api';
import {
  fetchChatHistory,
  fetchDigest,
  fetchPreferences,
  sendChatMessage,
  triggerScrape
} from '../services/presenterApi';
import { navigate } from '../services/routing';

const SUGGESTIONS = [
  'Less US election horse-race, more policy consequences',
  'Mute Bloomberg Technology for a bit',
  'Prefer FT and Economist framing on markets',
  'Go deeper on AI regulation',
  'Add a calm daily tone; skip sensational language'
];

function PrefChips({ preferences }) {
  if (!preferences) return null;
  const chips = [
    ...preferences.interests.map((t) => ({ label: t, kind: 'interest' })),
    ...preferences.disinterests.map((t) => ({ label: t, kind: 'disinterest' })),
    ...preferences.mutedSources.map((t) => ({ label: `mute:${t}`, kind: 'mute' })),
    ...preferences.preferredSources.map((t) => ({ label: `prefer:${t}`, kind: 'prefer' })),
    ...preferences.viewpoints.map((t) => ({ label: t, kind: 'viewpoint' }))
  ].slice(0, 18);

  if (!chips.length) {
    return (
      <p className="pref-empty">
        Tell the presenter what you care about — interests, sources, or viewpoints.
      </p>
    );
  }

  return (
    <ul className="pref-chips" aria-label="Learned preferences">
      {chips.map((c) => (
        <li key={`${c.kind}-${c.label}`} className={`pref-chip pref-${c.kind}`}>
          {c.label}
        </li>
      ))}
    </ul>
  );
}

function EventBlock({ event, index }) {
  return (
    <article className="event-block" style={{ '--i': index }}>
      <header className="event-head">
        <h3>{event.title}</h3>
        {event.confidence && (
          <span className={`confidence conf-${event.confidence}`}>{event.confidence}</span>
        )}
      </header>
      <p className="event-summary">{event.summary}</p>
      {event.whyItMatters && (
        <p className="event-why">
          <span>Why it matters</span> {event.whyItMatters}
        </p>
      )}
      {!!event.articles?.length && (
        <ul className="event-sources">
          {event.articles.map((a) => (
            <li key={a.id || a.url}>
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                {a.source}
              </a>
              <span>{a.title}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function PresenterPage() {
  const [digestPayload, setDigestPayload] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [, startTransition] = useTransition();
  const chatEnd = useRef(null);
  const booted = useRef(false);

  async function loadAll({ forceDigest = false } = {}) {
    setLoading(true);
    setError(null);
    try {
      const [prefs, digest, chat] = await Promise.all([
        fetchPreferences(),
        fetchDigest({ force: forceDigest, markVisit: true }),
        fetchChatHistory()
      ]);
      startTransition(() => {
        setPreferences(prefs.preferences);
        setDigestPayload(digest);
        setMessages(chat.messages || []);
      });
      if (digest.missingKey || digest.fallback) {
        setNote(
          digest.missingKey
            ? 'AI Gateway is not enabled yet — showing a wire fallback. Enable AI on the Netlify site.'
            : 'Presenter used a fallback briefing.'
        );
      } else {
        setNote('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    loadAll();
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function handleRefreshBriefing() {
    setBusy('briefing');
    setError(null);
    try {
      const digest = await fetchDigest({ force: true, markVisit: true });
      setDigestPayload(digest);
      setPreferences(digest.preferences || preferences);
      setNote(digest.fallback ? 'Fallback briefing (AI unavailable).' : 'Briefing refreshed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleCrawlAndScrape() {
    setBusy('crawl');
    setError(null);
    try {
      const crawl = await api.triggerFetch();
      const scrape = await triggerScrape(10);
      setNote(
        `Crawled ${crawl.successfulFeeds || 0}/${crawl.totalFeeds || 0} feeds · scraped ${scrape.ok + scrape.partial + scrape.rssOnly}/${scrape.attempted} articles`
      );
      await handleRefreshBriefing();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleSend(text) {
    const message = String(text || draft).trim();
    if (!message || busy) return;
    setDraft('');
    setBusy('chat');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: message }
    ]);
    try {
      const result = await sendChatMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
          meta: { patchApplied: result.patchApplied }
        }
      ]);
      if (result.preferences) setPreferences(result.preferences);
      if (result.patchApplied) {
        setNote('Preferences updated — refreshing briefing…');
        const digest = await fetchDigest({ force: true, markVisit: false });
        setDigestPayload(digest);
        setNote('Preferences updated and briefing refreshed.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const digest = digestPayload?.digest;

  return (
    <div className="app presenter-app">
      <div className="presenter-atmosphere" aria-hidden="true" />

      <header className="presenter-hero">
        <div className="presenter-hero-inner">
          <p className="brand-mark">Worldwire</p>
          <h1 className="hero-headline">
            {digest?.headline || (loading ? 'Reading the wires…' : 'Your desk')}
          </h1>
          <p className="hero-lede">
            {digest?.lede ||
              'A presenter that remembers what you care about and briefs only what is new since you left.'}
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRefreshBriefing}
              disabled={!!busy || loading}
            >
              {busy === 'briefing' ? 'Briefing…' : 'Refresh briefing'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleCrawlAndScrape}
              disabled={!!busy || loading}
            >
              {busy === 'crawl' ? 'Gathering…' : 'Crawl + scrape'}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => navigate('/archive')}>
              Raw wires
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => navigate('/sources')}>
              Sources
            </button>
          </div>
        </div>
      </header>

      <main className="presenter-main">
        <section className="memory-panel" aria-label="Your news memory">
          <div className="panel-label">Memory</div>
          <PrefChips preferences={preferences} />
          {preferences?.tone && (
            <p className="tone-line">
              Tone: <em>{preferences.tone}</em>
              {preferences.depth ? ` · ${preferences.depth}` : ''}
            </p>
          )}
        </section>

        <div className="status-row presenter-status">
          <span>{note}</span>
          {error && <span className="error">{error}</span>}
          {digestPayload?.articleCount != null && (
            <span className="meta-quiet">{digestPayload.articleCount} source items considered</span>
          )}
        </div>

        <section className="briefing-panel" aria-live="polite">
          <div className="panel-label">Since you were away</div>
          {loading ? (
            <div className="empty">Building your briefing…</div>
          ) : !digest?.events?.length ? (
            <div className="empty">
              Quiet desk. Crawl sources or widen your interests in chat.
            </div>
          ) : (
            <div className="event-list">
              {digest.events.map((event, i) => (
                <EventBlock key={`${event.title}-${i}`} event={event} index={i} />
              ))}
            </div>
          )}

          {!!digest?.watchlist?.length && (
            <div className="watchlist">
              <div className="panel-label">Watchlist</div>
              <ul>
                {digest.watchlist.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {digest?.ignoredNote && (
            <p className="ignored-note">{digest.ignoredNote}</p>
          )}
        </section>

        <section className="chat-panel" aria-label="Presenter chat">
          <div className="panel-label">Interrogate the desk</div>
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="suggestion"
                disabled={!!busy}
                onClick={() => handleSend(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="chat-log">
            {messages.map((m) => (
              <div key={m.id || `${m.role}-${m.created_at}-${m.content?.slice(0, 12)}`} className={`chat-bubble chat-${m.role}`}>
                <p>{m.content}</p>
              </div>
            ))}
            {busy === 'chat' && <div className="chat-bubble chat-assistant chat-pending">Thinking…</div>}
            <div ref={chatEnd} />
          </div>

          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <label className="sr-only" htmlFor="presenter-input">
              Message the presenter
            </label>
            <textarea
              id="presenter-input"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. I’m bored of midterm speculation — prioritize Asia markets and chip export controls"
              disabled={!!busy}
            />
            <button type="submit" className="btn btn-primary" disabled={!!busy || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

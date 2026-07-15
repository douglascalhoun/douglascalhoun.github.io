import React from 'react';
import { SOURCES, sourcePath } from '../services/sources';
import { navigate } from '../services/routing';

function SourcesNav({ activeSlug = null, compact = false }) {
  return (
    <nav className={`sources-nav${compact ? ' sources-nav-compact' : ''}`} aria-label="News sources">
      <div className="sources-nav-head">
        <button type="button" className="linkish" onClick={() => navigate('/')}>
          All sources
        </button>
        <span className="sources-nav-sep">·</span>
        <button type="button" className="linkish" onClick={() => navigate('/sources')}>
          Source index
        </button>
      </div>
      <ul className="sources-nav-list">
        {SOURCES.map((source) => {
          const active = source.slug === activeSlug;
          return (
            <li key={source.slug}>
              <button
                type="button"
                className={`sources-nav-item${active ? ' is-active' : ''}`}
                onClick={() => navigate(sourcePath(source.slug))}
              >
                <span>{source.name}</span>
                {source.comments && <span className="sources-badge">comments</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SourcesIndexPage() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <button type="button" className="back-link" onClick={() => navigate('/')}>
              ← Worldwire
            </button>
            <h1>Sources</h1>
            <p className="tagline">
              One page per newsroom — headlines, blurbs, and comments where available
            </p>
          </div>
        </div>
      </header>
      <main className="main">
        <ul className="source-index-list">
          {SOURCES.map((source) => (
            <li key={source.slug} className="source-index-item">
              <a
                className="source-index-link"
                href={sourcePath(source.slug)}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(sourcePath(source.slug));
                }}
              >
                <span className="source-index-name">{source.name}</span>
                <span className="source-index-meta">
                  {source.category} · {source.country}
                  {source.comments ? ' · comments' : ''}
                </span>
              </a>
              <code className="source-index-url">{sourcePath(source.slug)}</code>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default SourcesNav;

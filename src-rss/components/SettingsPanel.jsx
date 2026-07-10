import React, { useState } from 'react';

function SettingsPanel({ preferences, onUpdate, onClose, categories, feeds }) {
  const [localPrefs, setLocalPrefs] = useState({
    keywords: preferences.keywords || [],
    excludedKeywords: preferences.excludedKeywords || [],
    categories: preferences.categories || [],
    countries: preferences.countries || [],
    maxNotificationsPerHour: preferences.maxNotificationsPerHour || 12
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [excludedKeywordInput, setExcludedKeywordInput] = useState('');

  const availableCountries = [...new Set(feeds.map(f => f.country).filter(Boolean))].sort();

  function addKeyword() {
    if (keywordInput.trim()) {
      setLocalPrefs({
        ...localPrefs,
        keywords: [...localPrefs.keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  }

  function removeKeyword(keyword) {
    setLocalPrefs({
      ...localPrefs,
      keywords: localPrefs.keywords.filter(k => k !== keyword)
    });
  }

  function addExcludedKeyword() {
    if (excludedKeywordInput.trim()) {
      setLocalPrefs({
        ...localPrefs,
        excludedKeywords: [...localPrefs.excludedKeywords, excludedKeywordInput.trim()]
      });
      setExcludedKeywordInput('');
    }
  }

  function removeExcludedKeyword(keyword) {
    setLocalPrefs({
      ...localPrefs,
      excludedKeywords: localPrefs.excludedKeywords.filter(k => k !== keyword)
    });
  }

  function toggleCategory(category) {
    const newCategories = localPrefs.categories.includes(category)
      ? localPrefs.categories.filter(c => c !== category)
      : [...localPrefs.categories, category];

    setLocalPrefs({ ...localPrefs, categories: newCategories });
  }

  function toggleCountry(country) {
    const newCountries = localPrefs.countries.includes(country)
      ? localPrefs.countries.filter(c => c !== country)
      : [...localPrefs.countries, country];

    setLocalPrefs({ ...localPrefs, countries: newCountries });
  }

  function handleSave() {
    onUpdate(localPrefs);
    onClose();
  }

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>Notification Preferences</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <section className="settings-section">
          <h3>Include Keywords</h3>
          <p className="help-text">Only notify for articles containing these keywords (leave empty for all)</p>
          <div className="keyword-input">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="e.g., climate, technology, sports"
            />
            <button onClick={addKeyword} className="btn btn-primary">Add</button>
          </div>
          <div className="tag-list">
            {localPrefs.keywords.map(keyword => (
              <span key={keyword} className="tag">
                {keyword}
                <button onClick={() => removeKeyword(keyword)}>✕</button>
              </span>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Exclude Keywords</h3>
          <p className="help-text">Never notify for articles containing these keywords. Defaults already block celebrity/live-update noise.</p>
          <div className="keyword-input">
            <input
              type="text"
              value={excludedKeywordInput}
              onChange={(e) => setExcludedKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludedKeyword())}
              placeholder="e.g., celebrity, gossip"
            />
            <button onClick={addExcludedKeyword} className="btn btn-primary">Add</button>
          </div>
          <div className="tag-list">
            {localPrefs.excludedKeywords.map(keyword => (
              <span key={keyword} className="tag tag-excluded">
                {keyword}
                <button onClick={() => removeExcludedKeyword(keyword)}>✕</button>
              </span>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Rate Limit</h3>
          <p className="help-text">Max push notifications per hour</p>
          <div className="keyword-input">
            <input
              type="number"
              min="1"
              max="100"
              value={localPrefs.maxNotificationsPerHour}
              onChange={(e) => setLocalPrefs({
                ...localPrefs,
                maxNotificationsPerHour: Math.max(1, Math.min(100, parseInt(e.target.value) || 20))
              })}
            />
          </div>
        </section>

        <section className="settings-section">
          <h3>Categories</h3>
          <p className="help-text">Select categories to receive (leave empty for all)</p>
          <div className="checkbox-list">
            {categories.map(category => (
              <label key={category} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={localPrefs.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Countries</h3>
          <p className="help-text">Select regions to receive (leave empty for all)</p>
          <div className="checkbox-list">
            {availableCountries.map(country => (
              <label key={country} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={localPrefs.countries.includes(country)}
                  onChange={() => toggleCountry(country)}
                />
                {country}
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="panel-footer">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSave} className="btn btn-primary">Save Preferences</button>
      </div>
    </div>
  );
}

export default SettingsPanel;

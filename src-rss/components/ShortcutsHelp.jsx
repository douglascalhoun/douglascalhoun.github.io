import React from 'react';

const ROWS = [
  ['j / k', 'Move focus up / down'],
  ['x', 'Mark focused story read'],
  ['o / Enter', 'Open focused story'],
  ['u', 'Undo last dismiss'],
  ['r', 'Refresh the wire'],
  ['c', 'Crawl sources now'],
  ['?', 'Toggle this help'],
  ['Esc', 'Close help'],
];

function ShortcutsHelp({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="help-head">
          <h2>Desk shortcuts</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <ul className="help-list">
          {ROWS.map(([keys, label]) => (
            <li key={keys}>
              <kbd>{keys}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ShortcutsHelp;

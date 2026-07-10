/**
 * Decode HTML entities and strip leftover tags from RSS text.
 */

const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
};

function decodeEntity(match, named, dec, hex) {
  if (named) {
    const key = named.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMED, key)) return NAMED[key];
    return match;
  }
  if (dec) {
    const code = Number(dec);
    if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
  }
  if (hex) {
    const code = parseInt(hex, 16);
    if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
  }
  return match;
}

export function decodeHtmlEntities(input) {
  if (!input || typeof input !== 'string') return '';
  let text = input;
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(
      /&([a-zA-Z]+);|&#(\d+);|&#x([0-9a-fA-F]+);/g,
      decodeEntity
    );
    if (next === text) break;
    text = next;
  }
  return text;
}

export function cleanText(input) {
  if (!input || typeof input !== 'string') return '';
  return decodeHtmlEntities(input)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

import { emptyResult } from '../normalize.mjs';

/**
 * Sources that rarely/never expose harvestable public comments.
 * We still record an honest status so the UI can un-collapse a clear message.
 */
const UNSUPPORTED = [
  {
    test: /(^|\.)bbc\.(com|co\.uk)$/i,
    platform: 'bbc',
    message: 'BBC stories almost never expose a public comment API (comments are usually off).'
  },
  {
    test: /(^|\.)ft\.com$/i,
    platform: 'ft',
    message: 'Financial Times comments are not publicly harvestable from this app.'
  },
  {
    test: /(^|\.)economist\.com$/i,
    platform: 'economist',
    message: 'The Economist does not expose a public comments feed.'
  },
  {
    test: /(^|\.)wsj\.com$|(^|\.)dj\.com$/i,
    platform: 'wsj',
    message: 'WSJ comments are subscriber-walled and not publicly harvestable.'
  },
  {
    test: /(^|\.)bloomberg\.com$/i,
    platform: 'bloomberg',
    message: 'Bloomberg does not expose a public comments feed.'
  },
  {
    test: /(^|\.)technologyreview\.com$/i,
    platform: 'mit-tr',
    message: 'MIT Technology Review pages checked here do not expose a public comment system.'
  },
  {
    test: /(^|\.)washingtonpost\.com$/i,
    platform: 'wapo',
    message: 'Washington Post comments are not reliably reachable from this environment.'
  }
];

export function unsupportedForHost(hostname) {
  const host = String(hostname || '').replace(/^www\./, '');
  for (const entry of UNSUPPORTED) {
    if (entry.test.test(host)) {
      return emptyResult({
        platform: entry.platform,
        status: 'unsupported',
        message: entry.message
      });
    }
  }
  return null;
}

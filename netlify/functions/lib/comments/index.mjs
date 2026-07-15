import { harvestNytComments } from './adapters/nyt.mjs';
import { harvestArsComments } from './adapters/ars.mjs';
import { harvestGuardianComments } from './adapters/guardian.mjs';
import { unsupportedForHost } from './adapters/unsupported.mjs';
import { emptyResult } from './normalize.mjs';

function hostnameOf(articleUrl) {
  try {
    return new URL(articleUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Route an article URL to the most reliable harvester for that publisher.
 *
 * Reliable public harvest today:
 * - New York Times → community requestHandler JSON
 * - Ars Technica → OpenForum / XenForo HTML thread linked from the story
 * - The Guardian → Discussion API (if URL is Guardian)
 *
 * Other Worldwire sources are marked unsupported with an explicit reason.
 */
export async function harvestCommentsForUrl(articleUrl) {
  if (!articleUrl || typeof articleUrl !== 'string') {
    return emptyResult({
      platform: 'unknown',
      status: 'error',
      message: 'Missing article URL'
    });
  }

  let url;
  try {
    url = new URL(articleUrl);
  } catch {
    return emptyResult({
      platform: 'unknown',
      status: 'error',
      message: 'Invalid article URL'
    });
  }

  // Strip tracking params that break some comment lookups (esp. BBC/NYT).
  ['at_medium', 'at_campaign', 'mod', 'smid', 'smtyp'].forEach((key) => {
    url.searchParams.delete(key);
  });
  const cleanUrl = url.toString();
  const host = hostnameOf(cleanUrl);

  if (/(^|\.)nytimes\.com$/i.test(host)) {
    return harvestNytComments(cleanUrl);
  }
  if (/(^|\.)arstechnica\.com$/i.test(host)) {
    return harvestArsComments(cleanUrl);
  }
  if (/(^|\.)theguardian\.com$/i.test(host) || /(^|\.)gu\.com$/i.test(host)) {
    return harvestGuardianComments(cleanUrl);
  }

  const unsupported = unsupportedForHost(host);
  if (unsupported) return unsupported;

  return emptyResult({
    platform: 'unknown',
    status: 'unsupported',
    message: `No comment harvester registered for ${host || 'this host'}`
  });
}

export const COMMENT_PLATFORM_NOTES = {
  nyt: 'NYT community requestHandler (public JSON)',
  ars: 'Ars OpenForum XenForo thread HTML',
  guardian: 'Guardian Discussion API',
  bbc: 'Comments usually disabled',
  ft: 'Not publicly harvestable',
  economist: 'No public comments feed',
  wsj: 'Subscriber-walled',
  bloomberg: 'No public comments feed',
  'mit-tr': 'No public comment system found',
  wapo: 'Not reliably reachable'
};

/**
 * Live smoke test for comment harvesters (no DB required).
 * Run: node scripts/test-comment-harvest.mjs
 */
import { harvestCommentsForUrl } from '../netlify/functions/lib/comments/index.mjs';

const SAMPLES = [
  'https://www.nytimes.com/2026/07/13/technology/europe-teen-social-media-ban.html',
  'https://arstechnica.com/space/2026/07/how-hard-is-it-to-build-orbital-data-centers-actually/',
  'https://www.bbc.co.uk/news/articles/c982857nlrlo',
  'https://www.ft.com/content/5b12e491-dcd0-4e0c-a464-96ec37b737ab',
  'https://www.technologyreview.com/2026/07/15/1140498/the-download-useful-quantum-computer-subsea-tunnel/'
];

for (const url of SAMPLES) {
  process.stdout.write(`\n→ ${url}\n`);
  try {
    const result = await harvestCommentsForUrl(url);
    const sample = (result.comments || []).slice(0, 2).map((c) => ({
      author: c.author,
      score: c.score,
      body: (c.body || '').slice(0, 100)
    }));
    console.log(
      JSON.stringify(
        {
          platform: result.platform,
          status: result.status,
          commentCount: result.commentCount,
          harvested: result.comments?.length || 0,
          message: result.message,
          sourceThreadUrl: result.sourceThreadUrl,
          sample
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('FAILED', error.message);
  }
}

/**
 * Enemy barks — pirate shouts matched to mood.
 * Pool: ≥10k unique lines (generated). Session cycle = shuffle without replacement
 * until a mood deck is exhausted, then reshuffle.
 */
import { QUOTE_POOL, QUOTE_POOL_TOTAL } from './enemyQuotes.pool.js';

export const MOODS = {
    aggressive: {
        id: 'aggressive',
        color: '#ff6644',
        colorInt: 0xff6644
    },
    pensive: {
        id: 'pensive',
        color: '#a8c4e0',
        colorInt: 0xa8c4e0
    },
    fearful: {
        id: 'fearful',
        color: '#e8d48a',
        colorInt: 0xe8d48a
    },
    upset: {
        id: 'upset',
        color: '#ff6a9a',
        colorInt: 0xff6a9a
    }
};

export const QUOTES = QUOTE_POOL;
export const QUOTE_TOTAL = QUOTE_POOL_TOTAL;

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

/**
 * Per-mood draw-without-replacement decks for one play session.
 * Reshuffles only after a mood's full list has been spoken.
 */
class QuoteCycle {
    constructor(pool) {
        this.pool = pool;
        this.decks = {};
        this.cursor = {};
        this.spoken = {};
        for (const mood of Object.keys(MOODS)) {
            this._reshuffle(mood);
            this.spoken[mood] = 0;
        }
    }

    _reshuffle(mood) {
        const src = this.pool[mood] || this.pool.pensive || [];
        this.decks[mood] = shuffleInPlace(src.slice());
        this.cursor[mood] = 0;
    }

    next(mood) {
        const key = MOODS[mood] ? mood : 'pensive';
        if (!this.decks[key] || this.cursor[key] >= this.decks[key].length) {
            this._reshuffle(key);
        }
        const line = this.decks[key][this.cursor[key]];
        this.cursor[key] += 1;
        this.spoken[key] += 1;
        return line;
    }

    /** Remaining unique lines before a mood reshuffles. */
    remaining(mood) {
        const key = MOODS[mood] ? mood : 'pensive';
        const deck = this.decks[key];
        if (!deck) return 0;
        return Math.max(0, deck.length - this.cursor[key]);
    }

    stats() {
        const byMood = {};
        for (const mood of Object.keys(MOODS)) {
            byMood[mood] = {
                pool: (this.pool[mood] || []).length,
                remaining: this.remaining(mood),
                spoken: this.spoken[mood] || 0
            };
        }
        return { total: QUOTE_POOL_TOTAL, byMood };
    }
}

/** One cycle shared by all NPCs for the whole session. */
export const quoteCycle = new QuoteCycle(QUOTE_POOL);

export function pickQuote(mood) {
    return quoteCycle.next(mood);
}

export function moodColor(mood) {
    return (MOODS[mood] || MOODS.pensive).color;
}

export function resetQuoteCycle() {
    for (const mood of Object.keys(MOODS)) {
        quoteCycle._reshuffle(mood);
        quoteCycle.spoken[mood] = 0;
    }
}

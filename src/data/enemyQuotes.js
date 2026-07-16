/**
 * Enemy barks — short philosophy / great sayings matched to mood.
 * Moods rise from combat circumstance (see NPCShip.resolveMood).
 */

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

export const QUOTES = {
    aggressive: [
        'Fortune favors the bold.',
        'I came, I saw, I conquered.',
        'The die is cast.',
        'Si vis pacem, para bellum.',
        'Cry havoc, and let slip the dogs of war.',
        'Victory belongs to the most persevering.',
        'Who dares, wins.',
        'Aut viam inveniam aut faciam.',
        'The stronger man wins.',
        'Strike while the iron is hot.',
        'Audentes fortuna iuvat.',
        'No retreat. No surrender.'
    ],
    pensive: [
        'The unexamined life is not worth living.',
        'I think, therefore I am.',
        'Know thyself.',
        'This too shall pass.',
        'The only true wisdom is knowing you know nothing.',
        'Man is the measure of all things.',
        'Time is a created thing.',
        'We are what we repeatedly do.',
        'The journey of a thousand miles begins with one step.',
        'Still waters run deep.',
        'To be is to be perceived.',
        'All that is gold does not glitter.'
    ],
    fearful: [
        'The only thing we have to fear is fear itself.',
        'Cowards die many times before their deaths.',
        'He who fights and runs away…',
        'Discretion is the better part of valor.',
        'Even the brave may tremble.',
        'Fear is the mind-killer.',
        'Better a live dog than a dead lion.',
        'The night is darkest before the dawn.',
        'Save yourselves!',
        'I am not afraid of storms… only drowning.',
        'Run, that you may live.',
        'Death smiles at us all.'
    ],
    upset: [
        'Et tu, Brute?',
        'Hell hath no fury…',
        'I am wrapping myself in misfortune!',
        'O, I am fortune’s fool!',
        'The fault, dear Brutus, is not in our stars.',
        'Rage, rage against the dying of the light.',
        'I will have such revenges…',
        'Something is rotten in the state of Denmark.',
        'This is the way the world ends.',
        'Not with a bang but a whimper.',
        'I am become Death…',
        'My name is Ozymandias, king of kings!'
    ]
};

export function pickQuote(mood) {
    const list = QUOTES[mood] || QUOTES.pensive;
    return list[Math.floor(Math.random() * list.length)];
}

export function moodColor(mood) {
    return (MOODS[mood] || MOODS.pensive).color;
}

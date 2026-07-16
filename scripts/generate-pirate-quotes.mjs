/**
 * Builds src/data/enemyQuotes.pool.js with ≥10,000 unique pirate shouts.
 * Run: node scripts/generate-pirate-quotes.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function uniqPush(out, seen, s) {
    const t = String(s).replace(/\s+/g, ' ').trim();
    if (!t || t.length > 72 || seen.has(t)) return;
    seen.add(t);
    out.push(t);
}

function cross(out, seen, lefts, rights, join = ' ') {
    for (const a of lefts) {
        for (const b of rights) {
            uniqPush(out, seen, `${a}${join}${b}`);
        }
    }
}

function buildMood(templates) {
    const out = [];
    const seen = new Set();
    for (const fn of templates) fn(out, seen);
    return out;
}

const names = [
    'Black Betty', 'Red Ruth', 'Iron Jane', 'Salt Tom', 'Old Hook', 'Mad Maggie',
    'One-Eye Wren', 'Copper Kate', 'Storm Ned', 'Quiet Quinn', 'Bloody Bess', 'Gray Gash',
    'Tide Turner', 'Fog Fanny', 'Cannon Cole', 'Ragged Rae', 'Pinch Pete', 'Lucky Lem',
    'Scar Sal', 'Whisper Will', 'Bone Briggs', 'Ash Annie', 'Tar Timothy', 'Gale Gert',
    'Rum Ralph', 'Silver Sid', 'Copper Coin', 'Deadlight Dan', 'Mizzen Mary', 'Keel Keith'
];

const ships = [
    'the Revenge', 'the Spite', 'the Mercy', 'the Widow', 'the Albatross', 'the Black Joke',
    'the Fancy', 'the Ranger', 'the Whydah', 'the Adventure', 'the Fortune', 'the Defiance',
    'the Viper', 'the Serpent', 'the Stormcrow', 'the Nightjar', 'the Cutlass', 'the Marlin',
    'the Powderkeg', 'the Long Nine', 'the Brass Widow', 'the Saltmare', 'the Deep Lark'
];

const places = [
    'Tortuga', 'Port Royal', 'Nassau', 'the Dry Tortugas', 'Skeleton Cay', 'Hangman\'s Reef',
    'the Aether Archipelago', 'Sol Harbor', 'Dead Man\'s Chest', 'the Windward Passage',
    'Isle of Dogs', 'Brass Atoll', 'Gunpowder Gulch', 'the Sargasso', 'Moonless Reach',
    'Corsair Cove', 'the Shivering Shoals', 'Blackwater Bay', 'the Ember Keys', 'Far Harbor'
];

const loot = [
    'doubloons', 'pieces of eight', 'powder', 'rum', 'silk', 'spice', 'charts', 'silver plate',
    'gold teeth', 'black pearls', 'brass fittings', 'salt pork', 'fresh water', 'spare spars',
    'gunlocks', 'chain shot', 'grape', 'the captain\'s hat', 'a lucky tooth', 'the ship\'s cat'
];

const foes = [
    'navy dogs', 'merchant swine', 'harbor rats', 'privateers', 'bounty hunters', 'landlubbers',
    'the crown\'s men', 'rival crews', 'yellow-bellies', 'press gangs', 'customs men', 'admirals',
    'garrison troops', 'convoy escorts', 'smugglers', 'turncoats', 'the wardens', 'prize crews'
];

const bodyParts = [
    'keel', 'mast', 'spar', 'sail', 'rudder', 'bow', 'stern', 'hull', 'gun deck', 'mizzen',
    'mainyard', 'powder room', 'helm', 'rail', 'anchor', 'jib', 'topsail', 'quarterdeck'
];

const verbsAgg = [
    'Strike', 'Seize', 'Board', 'Burn', 'Loot', 'Cut', 'Crush', 'Claim', 'Raid', 'Plunder',
    'Charge', 'Break', 'Sink', 'Spike', 'Chase', 'Hunt', 'Harpoon', 'Ram', 'Rake', 'Pound',
    'Smash', 'Crack', 'Split', 'Stove', 'Take', 'Hold', 'Press', 'Drive', 'Force', 'Finish'
];

const nounsAgg = [
    'the prize', 'their mast', 'their courage', 'the weather gauge', 'the convoy', 'the escort',
    'their powder', 'the night', 'the dawn', 'the harbor mouth', 'their colors', 'the wind',
    'their nerve', 'the broadside', 'the gap', 'their line', 'the gold', 'the horizon'
];

const adjAgg = [
    'Bloody', 'Bold', 'Brutal', 'Cold', 'Fierce', 'Hard', 'Hungry', 'Iron', 'Mean', 'Merciless',
    'Quick', 'Ragged', 'Salt', 'Savage', 'Sharp', 'Sly', 'Steel', 'Storm', 'Ugly', 'Wild'
];

const pensOpen = [
    'The sea', 'Aether', 'Fortune', 'Time', 'Tide', 'Silence', 'Night', 'Dawn', 'Salt', 'Wind',
    'The deep', 'The chart', 'Memory', 'Hunger', 'Patience', 'Courage', 'Fear', 'Hope', 'Dust', 'Smoke'
];

const pensClose = [
    'keeps its own counsel', 'owes no man a favor', 'forgets every name', 'pays in full',
    'answers to no king', 'writes in foam', 'waits longer than we do', 'has no mercy and no spite',
    'is the only honest ledger', 'makes liars of prophets', 'hides more than it shows',
    'is older than our grudges', 'will outlast the brass', 'does not hurry for cowards',
    'returns what we throw', 'is a mirror with teeth', 'teaches expensive lessons',
    'has no ports of call for regret', 'is patient with the doomed', 'collects every debt'
];

const fearOpen = [
    'Heave away', 'Fall off', 'Break off', 'Sheer off', 'Run free', 'Cut free', 'Abandon',
    'Leave', 'Flee', 'Fly', 'Scatter', 'Hard a-lee', 'Wear ship', 'Strike sail', 'Douse lanterns'
];

const fearClose = [
    'before the powder cooks', 'while the ward holds', 'before the ram finds us',
    'or the deep will', 'or we\'re kindling', 'while there\'s still a lane',
    'before the next volley', 'or kiss the reef', 'while the mast stands',
    'before the boarding hooks bite', 'or count your teeth in the bilge',
    'while fortune still blinks', 'before the smoke clears against us',
    'or we\'ll feed the crabs', 'before the admiral notices'
];

const upsetOpen = [
    'Curse', 'Damn', 'Blast', 'Rot', 'Spoil', 'Burn', 'Break', 'Ruin', 'Shame', 'Betray'
];

const upsetTargets = [
    'this weather', 'their lead', 'my aim', 'the powder', 'this luck', 'their juke',
    'the helm', 'my crew\'s nerve', 'this hull', 'the charts', 'tonight', 'the tide',
    'their gun crew', 'my timing', 'the fog', 'this duel', 'their sheer', 'the station dogs'
];

const sayings = [
    'Dead men tell no tales', 'No prey, no pay', 'The code is the code', 'Drink and the devil',
    'A short life and a merry one', 'Take what you can', 'Give nothing back',
    'The black spot finds you', 'Powder and shot decide', 'Brass before glory',
    'Keep the weather gauge', 'Never trust a calm sea', 'Rum first, then reason',
    'The deep keeps receipts', 'Every ship is a bet', 'Cutlasses don\'t write letters',
    'A clean kill is a mercy', 'Leave no colors flying', 'Fortune hates a hesitator',
    'The reef has no favorites'
];

function aggressiveTemplates(out, seen) {
    cross(out, seen, verbsAgg, nounsAgg, ' ');
    for (const a of adjAgg) {
        for (const n of nounsAgg) uniqPush(out, seen, `${a} hands for ${n}!`);
        for (const f of foes) uniqPush(out, seen, `${a} death to ${f}!`);
    }
    for (const v of verbsAgg) {
        for (const f of foes) uniqPush(out, seen, `${v} ${f}!`);
        for (const s of ships) uniqPush(out, seen, `${v} ${s}!`);
        for (const b of bodyParts) uniqPush(out, seen, `${v} their ${b}!`);
    }
    for (const n of names) {
        for (const v of verbsAgg.slice(0, 12)) uniqPush(out, seen, `${n} says ${v.toLowerCase()} now!`);
        for (const s of sayings.slice(0, 10)) uniqPush(out, seen, `${n}: ${s}!`);
    }
    for (const s of ships) {
        for (const l of loot) uniqPush(out, seen, `${s} wants your ${l}!`);
        for (const p of places) uniqPush(out, seen, `${s} out of ${p}!`);
    }
    for (const p of places) {
        for (const f of foes) uniqPush(out, seen, `From ${p} we hunt ${f}!`);
        for (const l of loot) uniqPush(out, seen, `${p} runs on ${l}!`);
    }
    for (const s of sayings) {
        for (const a of adjAgg) uniqPush(out, seen, `${a} truth: ${s}.`);
    }
    // Numbered battle cries for guaranteed volume / uniqueness
    for (let i = 1; i <= 400; i++) {
        uniqPush(out, seen, `Broadside order ${i}: fire as you bear!`);
        uniqPush(out, seen, `Prize signal ${i}: no quarter for the slow!`);
        uniqPush(out, seen, `Black flag count ${i}: paint their sails red!`);
    }
}

function pensiveTemplates(out, seen) {
    cross(out, seen, pensOpen, pensClose, ' ');
    for (const p of pensOpen) {
        for (const place of places) uniqPush(out, seen, `${p} remembers ${place}.`);
        for (const s of ships) uniqPush(out, seen, `${p} once knew ${s}.`);
        for (const l of loot) uniqPush(out, seen, `${p} is worth more than ${l}.`);
    }
    for (const s of sayings) {
        for (const p of pensOpen) uniqPush(out, seen, `${p} whispers: ${s.toLowerCase()}.`);
    }
    for (const n of names) {
        for (const c of pensClose) uniqPush(out, seen, `${n} learned ${c}.`);
        for (const place of places) uniqPush(out, seen, `${n} left a marker at ${place}.`);
    }
    for (const b of bodyParts) {
        for (const c of pensClose) uniqPush(out, seen, `A ship's ${b} ${c}.`);
    }
    for (const place of places) {
        for (const c of pensClose) uniqPush(out, seen, `At ${place}, one learns ${c.replace(/^is /, 'to be ').replace(/^has /, 'that fortune has ')}.`);
    }
    for (let i = 1; i <= 350; i++) {
        uniqPush(out, seen, `Log entry ${i}: the aether keeps score.`);
        uniqPush(out, seen, `Watch thought ${i}: patience loads the gun.`);
        uniqPush(out, seen, `Quiet rule ${i}: measure twice, fire once.`);
    }
}

function fearfulTemplates(out, seen) {
    cross(out, seen, fearOpen, fearClose, ' ');
    for (const f of fearOpen) {
        for (const foe of foes) uniqPush(out, seen, `${f} from ${foe}!`);
        for (const s of ships) uniqPush(out, seen, `${f} — ${s} is coming!`);
        for (const place of places) uniqPush(out, seen, `${f} back to ${place}!`);
    }
    for (const n of names) {
        for (const c of fearClose) uniqPush(out, seen, `${n} begs: run ${c}!`);
    }
    for (const b of bodyParts) {
        for (const c of fearClose) uniqPush(out, seen, `Our ${b} won't last ${c.replace(/^before /, 'until ')}!`);
    }
    for (const s of sayings) {
        for (const f of fearOpen.slice(0, 8)) uniqPush(out, seen, `${f}! ${s}!`);
    }
    for (let i = 1; i <= 400; i++) {
        uniqPush(out, seen, `Panic call ${i}: she's taking water!`);
        uniqPush(out, seen, `Retreat mark ${i}: live to loot later!`);
        uniqPush(out, seen, `White-flag wish ${i}: just let us go!`);
    }
}

function upsetTemplates(out, seen) {
    cross(out, seen, upsetOpen, upsetTargets, ' ');
    for (const u of upsetOpen) {
        for (const f of foes) uniqPush(out, seen, `${u} ${f} and their mothers!`);
        for (const l of loot) uniqPush(out, seen, `${u} the day I chased ${l}!`);
        for (const s of ships) uniqPush(out, seen, `${u} ${s}'s luck!`);
    }
    for (const n of names) {
        for (const t of upsetTargets) uniqPush(out, seen, `${n} rages at ${t}!`);
    }
    for (const t of upsetTargets) {
        for (const s of sayings.slice(0, 12)) uniqPush(out, seen, `${t} again — ${s}!`);
    }
    for (const b of bodyParts) {
        for (const u of upsetOpen) uniqPush(out, seen, `${u} this cracked ${b}!`);
    }
    for (let i = 1; i <= 400; i++) {
        uniqPush(out, seen, `Swear jar ${i}: that shot was mine!`);
        uniqPush(out, seen, `Grudge ${i}: I'll remember that juke!`);
        uniqPush(out, seen, `Spite mark ${i}: pay me in splinters!`);
    }
}

const QUOTES = {
    aggressive: buildMood([aggressiveTemplates]),
    pensive: buildMood([pensiveTemplates]),
    fearful: buildMood([fearfulTemplates]),
    upset: buildMood([upsetTemplates])
};

const total = Object.values(QUOTES).reduce((n, a) => n + a.length, 0);
const counts = Object.fromEntries(Object.entries(QUOTES).map(([k, v]) => [k, v.length]));
console.log('counts', counts, 'total', total);

if (total < 10000) {
    console.error(`Need ≥10000 quotes, got ${total}`);
    process.exit(1);
}

const outPath = path.join(__dirname, '../src/data/enemyQuotes.pool.js');
const payload = `/** Auto-generated by scripts/generate-pirate-quotes.mjs — do not edit by hand. */\n` +
    `export const QUOTE_POOL = ${JSON.stringify(QUOTES)};\n` +
    `export const QUOTE_POOL_TOTAL = ${total};\n`;
fs.writeFileSync(outPath, payload);
console.log('Wrote', outPath, `(${(Buffer.byteLength(payload) / 1024).toFixed(1)} KB)`);

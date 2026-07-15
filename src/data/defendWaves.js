/**
 * Defend-the-Station wave script.
 * Difficulty comes from new behaviors, not HP sponges.
 * Hits stay low so fights stay readable and decisive.
 */
export const DEFEND_WAVES = [
    {
        id: 1,
        announce: 'DEFEND THE STATION — Hostile scout inbound!',
        spawns: [{ archetype: 'scout', count: 1 }]
    },
    {
        id: 2,
        announce: 'Scout fleeing! Two raiders inbound!',
        spawns: [{ archetype: 'raider', count: 2 }]
    },
    {
        id: 3,
        announce: 'Raiders breaking! Triad wing inbound!',
        spawns: [{ archetype: 'weaver', count: 2 }, { archetype: 'flanker', count: 1 }]
    },
    {
        id: 4,
        announce: 'Wing routed — ACE pilot dropping in!',
        spawns: [{ archetype: 'ace', count: 1 }]
    },
    {
        id: 5,
        announce: 'ACE down — WARMASTER arrives!',
        spawns: [{ archetype: 'warmaster', count: 1 }]
    }
];

export const ARCHETYPES = {
    scout: {
        label: 'Scout',
        hits: 2,
        speed: 70,
        fireRate: 1100,
        fireRange: 360,
        idealRange: 260,
        shotDamage: 6,
        color: 0xffaa44,
        pattern: 'straight',
        bounty: 80
    },
    raider: {
        label: 'Raider',
        hits: 2,
        speed: 95,
        fireRate: 750,
        fireRange: 400,
        idealRange: 220,
        shotDamage: 8,
        color: 0xff6622,
        pattern: 'strafe',
        bounty: 110
    },
    weaver: {
        label: 'Weaver',
        hits: 2,
        speed: 110,
        fireRate: 650,
        fireRange: 430,
        idealRange: 200,
        shotDamage: 8,
        color: 0xff4488,
        pattern: 'weave',
        bounty: 140
    },
    flanker: {
        label: 'Flanker',
        hits: 2,
        speed: 120,
        fireRate: 700,
        fireRange: 380,
        idealRange: 160,
        shotDamage: 9,
        color: 0xcc66ff,
        pattern: 'flank',
        bounty: 150
    },
    ace: {
        label: 'Ace',
        hits: 3,
        speed: 130,
        fireRate: 520,
        fireRange: 460,
        idealRange: 210,
        shotDamage: 10,
        color: 0xff2244,
        pattern: 'burst_dash',
        bounty: 280,
        abilities: ['burst', 'dash']
    },
    warmaster: {
        label: 'Warmaster',
        hits: 4,
        speed: 125,
        fireRate: 480,
        fireRange: 500,
        idealRange: 240,
        shotDamage: 11,
        color: 0xff0066,
        pattern: 'warmaster',
        bounty: 500,
        abilities: ['burst', 'dash', 'decoy', 'mine']
    }
};

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
        speed: 65,
        fireRate: 2600,
        fireRange: 420,
        idealRange: 280,
        shotDamage: 7,
        color: 0xffaa44,
        pattern: 'straight',
        bounty: 80
    },
    raider: {
        label: 'Raider',
        hits: 2,
        speed: 85,
        fireRate: 2200,
        fireRange: 440,
        idealRange: 260,
        shotDamage: 8,
        color: 0xff6622,
        pattern: 'strafe',
        bounty: 110
    },
    weaver: {
        label: 'Weaver',
        hits: 2,
        speed: 95,
        fireRate: 2000,
        fireRange: 460,
        idealRange: 250,
        shotDamage: 8,
        color: 0xff4488,
        pattern: 'weave',
        bounty: 140
    },
    flanker: {
        label: 'Flanker',
        hits: 2,
        speed: 105,
        fireRate: 1900,
        fireRange: 430,
        idealRange: 230,
        shotDamage: 9,
        color: 0xcc66ff,
        pattern: 'flank',
        bounty: 150
    },
    ace: {
        label: 'Ace',
        hits: 3,
        speed: 115,
        fireRate: 1600,
        fireRange: 480,
        idealRange: 250,
        shotDamage: 10,
        color: 0xff2244,
        pattern: 'burst_dash',
        bounty: 280,
        abilities: ['burst', 'dash']
    },
    warmaster: {
        label: 'Warmaster',
        hits: 4,
        speed: 110,
        fireRate: 1500,
        fireRange: 520,
        idealRange: 270,
        shotDamage: 11,
        color: 0xff0066,
        pattern: 'warmaster',
        bounty: 500,
        abilities: ['burst', 'dash', 'decoy', 'mine']
    }
};

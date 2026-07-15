/**
 * The Archipelago — systems are islands in the aether-sea.
 * Leave an island's gravity well (outer ring) to catch deep hyperspace lanes (EV Nova).
 */

export const SYSTEMS = {
    sol: {
        id: 'sol',
        name: 'Sol Haven',
        color: 0xc9a227,
        mapX: 0,
        mapY: 0,
        planet: {
            name: 'Terra Isle',
            color: 0x2f6b4f,
            water: 0x2a5a8a,
            radius: 300,
            kind: 'isle'
        },
        station: { name: 'King\'s Quay', dx: 600, dy: -400 },
        links: ['vega', 'sirius'],
        prices: {
            food: { buy: 12, sell: 8 },
            ore: { buy: 22, sell: 15 },
            tech: { buy: 45, sell: 30 }
        },
        danger: 1,
        blurb: 'Home island. Safe harbor under the lighthouse.'
    },
    vega: {
        id: 'vega',
        name: 'Vega Reach',
        color: 0x88aaff,
        mapX: 180,
        mapY: -40,
        planet: {
            name: 'Vega Atoll',
            color: 0x3a7a9a,
            water: 0x1a4a6a,
            radius: 260,
            kind: 'atoll'
        },
        station: { name: 'Exchange Wharf', dx: -500, dy: 350 },
        links: ['sol', 'altair', 'rigel'],
        prices: {
            food: { buy: 18, sell: 11 },
            ore: { buy: 16, sell: 10 },
            tech: { buy: 55, sell: 38 }
        },
        danger: 2,
        blurb: 'Busy trade current. Ore washes cheap onto the quay.'
    },
    sirius: {
        id: 'sirius',
        name: 'Sirius Yard',
        color: 0xe8e0d0,
        mapX: -160,
        mapY: 70,
        planet: {
            name: 'Sirius Spit',
            color: 0x8a9aaa,
            water: 0x4a5a6a,
            radius: 220,
            kind: 'spit'
        },
        station: { name: 'Drydock Row', dx: 450, dy: 500 },
        links: ['sol', 'procyon'],
        prices: {
            food: { buy: 10, sell: 6 },
            ore: { buy: 28, sell: 18 },
            tech: { buy: 40, sell: 26 }
        },
        danger: 2,
        blurb: 'Shipwrights\' isle. Food surplus, timber scarce.'
    },
    altair: {
        id: 'altair',
        name: 'Altair Frontier',
        color: 0xff8866,
        mapX: 300,
        mapY: 80,
        planet: {
            name: 'Red Cay',
            color: 0xa05030,
            water: 0x5a3040,
            radius: 280,
            kind: 'cay'
        },
        station: { name: 'Corsair Port', dx: 700, dy: -200 },
        links: ['vega', 'rigel'],
        prices: {
            food: { buy: 25, sell: 16 },
            ore: { buy: 30, sell: 20 },
            tech: { buy: 35, sell: 22 }
        },
        danger: 3,
        blurb: 'Lawless cay. Privateers ride the gravity well.'
    },
    rigel: {
        id: 'rigel',
        name: 'Rigel Ice',
        color: 0xaaddff,
        mapX: 220,
        mapY: -160,
        planet: {
            name: 'Frost Holm',
            color: 0xb0c8e0,
            water: 0x6080a0,
            radius: 320,
            kind: 'holm'
        },
        station: { name: 'Frost Haven', dx: -650, dy: -300 },
        links: ['vega', 'altair'],
        prices: {
            food: { buy: 30, sell: 20 },
            ore: { buy: 20, sell: 12 },
            tech: { buy: 60, sell: 42 }
        },
        danger: 3,
        blurb: 'Cold outer holm. Charts and chronometers fetch gold.'
    },
    procyon: {
        id: 'procyon',
        name: 'Procyon Deep',
        color: 0xffcc88,
        mapX: -280,
        mapY: -40,
        planet: {
            name: 'Far Reef',
            color: 0xc09040,
            water: 0x6a5030,
            radius: 240,
            kind: 'reef'
        },
        station: { name: 'Relay Buoy', dx: 200, dy: -550 },
        links: ['sirius'],
        prices: {
            food: { buy: 14, sell: 9 },
            ore: { buy: 35, sell: 24 },
            tech: { buy: 50, sell: 34 }
        },
        danger: 4,
        blurb: 'Remote reef. Pirates hunt the deep lanes beyond the well.'
    }
};

export const MISSION_TEMPLATES = [
    {
        id: 'haul_food',
        type: 'haul',
        title: 'Provision Run',
        desc: 'Buy provisions here and sell them at {dest}.',
        good: 'food',
        amount: 5,
        reward: 180
    },
    {
        id: 'haul_ore',
        type: 'haul',
        title: 'Ore Charter',
        desc: 'Deliver ore to the quay at {dest}.',
        good: 'ore',
        amount: 4,
        reward: 220
    },
    {
        id: 'haul_tech',
        type: 'haul',
        title: 'Chronometer Run',
        desc: 'Smuggle navigation tech to {dest}.',
        good: 'tech',
        amount: 3,
        reward: 320
    },
    {
        id: 'bounty',
        type: 'bounty',
        title: 'Privateer Bounty',
        desc: 'Disable {count} hostile sails. Any island.',
        count: 2,
        reward: 250
    },
    {
        id: 'scout',
        type: 'scout',
        title: 'Chart the Lane',
        desc: 'Ride hyperspace to {dest} and make harbor.',
        reward: 150
    }
];

export function getSystem(id) {
    return SYSTEMS[id] || SYSTEMS.sol;
}

export function linkedSystems(id) {
    const sys = getSystem(id);
    return sys.links.map((lid) => SYSTEMS[lid]).filter(Boolean);
}

export function pickMission(fromSystemId) {
    const from = getSystem(fromSystemId);
    const template = MISSION_TEMPLATES[Math.floor(Math.random() * MISSION_TEMPLATES.length)];
    const destOptions = Object.keys(SYSTEMS).filter((id) => id !== fromSystemId);
    const destId = destOptions[Math.floor(Math.random() * destOptions.length)];
    const dest = getSystem(destId);

    if (template.type === 'bounty') {
        return {
            ...template,
            from: fromSystemId,
            progress: 0,
            active: true
        };
    }

    return {
        ...template,
        from: fromSystemId,
        dest: destId,
        destName: dest.name,
        desc: template.desc.replace('{dest}', dest.name).replace('{count}', String(template.count || 0)),
        progress: 0,
        active: true
    };
}

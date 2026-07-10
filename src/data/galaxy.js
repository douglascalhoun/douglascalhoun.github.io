/** Galaxy definition — simplified EV Nova style star map */

export const SYSTEMS = {
    sol: {
        id: 'sol',
        name: 'Sol',
        color: 0xffdd66,
        mapX: 0,
        mapY: 0,
        planet: { name: 'Earth', color: 0x3366cc, radius: 300 },
        station: { name: 'Outpost Alpha', dx: 600, dy: -400 },
        links: ['vega', 'sirius'],
        prices: {
            food: { buy: 12, sell: 8 },
            ore: { buy: 22, sell: 15 },
            tech: { buy: 45, sell: 30 }
        },
        danger: 1,
        blurb: 'Home system. Safe trading hub.'
    },
    vega: {
        id: 'vega',
        name: 'Vega',
        color: 0x88aaff,
        mapX: 180,
        mapY: -40,
        planet: { name: 'Vega Prime', color: 0x66aadd, radius: 260 },
        station: { name: 'Vega Exchange', dx: -500, dy: 350 },
        links: ['sol', 'altair', 'rigel'],
        prices: {
            food: { buy: 18, sell: 11 },
            ore: { buy: 16, sell: 10 },
            tech: { buy: 55, sell: 38 }
        },
        danger: 2,
        blurb: 'Busy trade corridor. Ore is cheap here.'
    },
    sirius: {
        id: 'sirius',
        name: 'Sirius',
        color: 0xffffff,
        mapX: -160,
        mapY: 70,
        planet: { name: 'Sirius B', color: 0xccddee, radius: 220 },
        station: { name: 'Dockside Yard', dx: 450, dy: 500 },
        links: ['sol', 'procyon'],
        prices: {
            food: { buy: 10, sell: 6 },
            ore: { buy: 28, sell: 18 },
            tech: { buy: 40, sell: 26 }
        },
        danger: 2,
        blurb: 'Industrial yards. Food surplus, ore scarce.'
    },
    altair: {
        id: 'altair',
        name: 'Altair',
        color: 0xff8866,
        mapX: 300,
        mapY: 80,
        planet: { name: 'Altair III', color: 0xcc5533, radius: 280 },
        station: { name: 'Red Port', dx: 700, dy: -200 },
        links: ['vega', 'rigel'],
        prices: {
            food: { buy: 25, sell: 16 },
            ore: { buy: 30, sell: 20 },
            tech: { buy: 35, sell: 22 }
        },
        danger: 3,
        blurb: 'Frontier world. Hostile patrols common.'
    },
    rigel: {
        id: 'rigel',
        name: 'Rigel',
        color: 0xaaddff,
        mapX: 220,
        mapY: -160,
        planet: { name: 'Rigel Ice', color: 0x99ccff, radius: 320 },
        station: { name: 'Frost Haven', dx: -650, dy: -300 },
        links: ['vega', 'altair'],
        prices: {
            food: { buy: 30, sell: 20 },
            ore: { buy: 20, sell: 12 },
            tech: { buy: 60, sell: 42 }
        },
        danger: 3,
        blurb: 'Cold outer system. Tech fetches a premium.'
    },
    procyon: {
        id: 'procyon',
        name: 'Procyon',
        color: 0xffcc88,
        mapX: -280,
        mapY: -40,
        planet: { name: 'Procyon Reach', color: 0xddaa55, radius: 240 },
        station: { name: 'Far Relay', dx: 200, dy: -550 },
        links: ['sirius'],
        prices: {
            food: { buy: 14, sell: 9 },
            ore: { buy: 35, sell: 24 },
            tech: { buy: 50, sell: 34 }
        },
        danger: 4,
        blurb: 'Remote relay. Pirates hunt the lanes.'
    }
};

export const MISSION_TEMPLATES = [
    {
        id: 'haul_food',
        type: 'haul',
        title: 'Food Run',
        desc: 'Buy food here and sell it at {dest}.',
        good: 'food',
        amount: 5,
        reward: 180
    },
    {
        id: 'haul_ore',
        type: 'haul',
        title: 'Ore Contract',
        desc: 'Deliver ore to {dest}.',
        good: 'ore',
        amount: 4,
        reward: 220
    },
    {
        id: 'haul_tech',
        type: 'haul',
        title: 'Tech Courier',
        desc: 'Smuggle tech components to {dest}.',
        good: 'tech',
        amount: 3,
        reward: 320
    },
    {
        id: 'bounty',
        type: 'bounty',
        title: 'Pirate Bounty',
        desc: 'Disable {count} hostile fighters. Any system.',
        count: 2,
        reward: 250
    },
    {
        id: 'scout',
        type: 'scout',
        title: 'Scout Sweep',
        desc: 'Hyperspace to {dest} and dock there.',
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

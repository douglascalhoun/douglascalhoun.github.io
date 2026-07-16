/**
 * The Archipelago — chill island lakes linked by spooky deep-space lanes.
 * Sail freely; no hyperspace menu. Danger rises with distance from the nearest isle.
 */

const SCALE = 58;
const ORIGIN_X = 16000;
const ORIGIN_Y = 16000;

export const SYSTEMS = {
    sol: {
        id: 'sol',
        name: 'Sol Haven',
        color: 0xc9a227,
        mapX: 0,
        mapY: 0,
        planet: {
            name: 'Terra Isle',
            color: 0x2f8b5a,
            water: 0x3db8e8,
            beach: 0xe8d5a3,
            radius: 320,
            kind: 'isle'
        },
        station: { name: 'King\'s Quay', dx: 520, dy: -360 },
        links: ['vega', 'sirius'],
        danger: 1,
        blurb: 'Palm beaches and calm blue water. Home lake.'
    },
    vega: {
        id: 'vega',
        name: 'Vega Reach',
        color: 0x88aaff,
        mapX: 180,
        mapY: -40,
        planet: {
            name: 'Vega Atoll',
            color: 0x2a9a7a,
            water: 0x2aa8d8,
            beach: 0xf0e0b0,
            radius: 280,
            kind: 'atoll'
        },
        station: { name: 'Exchange Wharf', dx: -480, dy: 320 },
        links: ['sol', 'altair', 'rigel'],
        danger: 2,
        blurb: 'Busy trade lake. Merchants cut wakes between the palms.'
    },
    sirius: {
        id: 'sirius',
        name: 'Sirius Yard',
        color: 0xe8e0d0,
        mapX: -160,
        mapY: 70,
        planet: {
            name: 'Sirius Spit',
            color: 0x6aaa8a,
            water: 0x4ab0d0,
            beach: 0xe0d0a8,
            radius: 260,
            kind: 'spit'
        },
        station: { name: 'Drydock Row', dx: 420, dy: 460 },
        links: ['sol', 'procyon'],
        danger: 2,
        blurb: 'Shipwrights\' lagoon. Safe shallows for tired traders.'
    },
    altair: {
        id: 'altair',
        name: 'Altair Frontier',
        color: 0xff8866,
        mapX: 300,
        mapY: 80,
        planet: {
            name: 'Red Cay',
            color: 0xc07040,
            water: 0x3a98c0,
            beach: 0xe8c090,
            radius: 290,
            kind: 'cay'
        },
        station: { name: 'Corsair Port', dx: 620, dy: -180 },
        links: ['vega', 'rigel'],
        danger: 3,
        blurb: 'Warm cay on the edge of the dark. Watch the deep.'
    },
    rigel: {
        id: 'rigel',
        name: 'Rigel Ice',
        color: 0xaaddff,
        mapX: 220,
        mapY: -160,
        planet: {
            name: 'Frost Holm',
            color: 0x80b090,
            water: 0x50b0d8,
            beach: 0xd8e0e8,
            radius: 300,
            kind: 'holm'
        },
        station: { name: 'Frost Haven', dx: -580, dy: -280 },
        links: ['vega', 'altair'],
        danger: 3,
        blurb: 'Cool blue lagoon. Trade lanes stretch into the black.'
    },
    procyon: {
        id: 'procyon',
        name: 'Procyon Deep',
        color: 0xffcc88,
        mapX: -280,
        mapY: -40,
        planet: {
            name: 'Far Reef',
            color: 0xa09050,
            water: 0x2a90b8,
            beach: 0xd8c898,
            radius: 250,
            kind: 'reef'
        },
        station: { name: 'Relay Buoy', dx: 180, dy: -500 },
        links: ['sirius'],
        danger: 4,
        blurb: 'Lonely reef. Beyond the lake the demons hunt.'
    }
};

/** World size for the continuous archipelago. */
export const ARCHIPELAGO_SIZE = 32000;

export function getSystem(id) {
    return SYSTEMS[id] || SYSTEMS.sol;
}

export function linkedSystems(id) {
    const sys = getSystem(id);
    return (sys.links || []).map((lid) => SYSTEMS[lid]).filter(Boolean);
}

export function allSystems() {
    return Object.values(SYSTEMS);
}

/** Place an island in continuous world space from chart coords. */
export function islandWorldPos(sys) {
    return {
        x: ORIGIN_X + (sys.mapX || 0) * SCALE,
        y: ORIGIN_Y + (sys.mapY || 0) * SCALE
    };
}

export function lakeRadius(sys) {
    return 2400 + (sys.planet?.radius || 260);
}

/**
 * @returns {{ system: object, dist: number, wx: number, wy: number, lakeR: number }}
 */
export function nearestIsland(x, y) {
    let best = null;
    for (const sys of allSystems()) {
        const { x: wx, y: wy } = islandWorldPos(sys);
        const dist = Math.hypot(x - wx, y - wy);
        if (!best || dist < best.dist) {
            best = { system: sys, dist, wx, wy, lakeR: lakeRadius(sys) };
        }
    }
    return best;
}

/**
 * 0 = on the lake beach, 1 = deep black between isles.
 */
export function openSeaThreat(x, y) {
    const n = nearestIsland(x, y);
    if (!n) return 1;
    const inner = n.lakeR * 0.72;
    const outer = n.lakeR * 1.55;
    if (n.dist <= inner) return 0;
    if (n.dist >= outer) return 1;
    return (n.dist - inner) / (outer - inner);
}

export function harborPos(sys) {
    const { x, y } = islandWorldPos(sys);
    return {
        x: x + (sys.station?.dx || 0),
        y: y + (sys.station?.dy || 0),
        name: sys.station?.name || 'Harbor'
    };
}

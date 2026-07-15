import { ARCHETYPES } from '../data/defendWaves.js';

/**
 * Fleet-scaled encounter director.
 * More / stronger pilots → trickier packs (patterns), not sponge HP.
 */
export function powerFromPlayer(player) {
    if (!player) return 1;
    const u = player.upgrades || {};
    const upgradeSum = (u.engines || 0) + (u.shields || 0) + (u.hull || 0)
        + (u.weapons || 0) + (u.cargo || 0);
    const harvest = player.harvestIndex || 0;
    const weaponBonus = player.weaponId && player.weaponId !== 'carronade' ? 2 : 0;
    return 1 + upgradeSum + harvest + weaponBonus;
}

export function summarizeFleet(localPower, remotes) {
    let power = localPower;
    let pilots = 1;
    for (const r of remotes.values()) {
        if (!r || r.systemId && r.systemId !== 'sol') continue;
        power += r.power || 1;
        pilots += 1;
    }
    const avg = power / Math.max(1, pilots);
    return { pilots, power, avg };
}

/**
 * Pick a wave recipe from fleet stats.
 * Returns { announce, spawns:[{archetype,count}] }
 */
export function recipeForFleet(fleet, waveIndex = 0) {
    const { pilots, avg } = fleet;
    const pressure = Math.min(8, Math.floor(pilots + avg / 4));

    const roster = ['scout', 'raider', 'weaver', 'flanker', 'ace', 'warmaster'];
    // Unlock higher archetypes as average power rises
    let maxIdx = 0;
    if (avg >= 3) maxIdx = 1;
    if (avg >= 6) maxIdx = 2;
    if (avg >= 9) maxIdx = 3;
    if (avg >= 12) maxIdx = 4;
    if (avg >= 16) maxIdx = 5;
    maxIdx = Math.min(maxIdx + Math.floor(waveIndex / 2), roster.length - 1);

    const spawns = [];
    let remaining = Math.max(1, Math.min(6, pressure));

    // Always teach with at least one lower-tier ship when wave is early
    if (waveIndex === 0) {
        spawns.push({ archetype: 'scout', count: 1 });
        remaining -= 1;
    }

    while (remaining > 0) {
        const idx = Math.min(maxIdx, Math.floor(Math.random() * (maxIdx + 1)));
        const arch = roster[idx];
        const count = Math.min(remaining, idx >= 4 ? 1 : 1 + Math.floor(Math.random() * 2));
        const existing = spawns.find((s) => s.archetype === arch);
        if (existing) existing.count += count;
        else spawns.push({ archetype: arch, count });
        remaining -= count;
    }

    const labels = spawns.map((s) => `${s.count}× ${ARCHETYPES[s.archetype]?.label || s.archetype}`).join(', ');
    return {
        id: waveIndex + 1,
        announce: `Fleet signal — ${pilots} pilot${pilots > 1 ? 's' : ''} · ${labels}`,
        spawns
    };
}

export function targetHostileCount(fleet) {
    return Math.min(8, Math.max(1, fleet.pilots + Math.floor(fleet.avg / 5)));
}

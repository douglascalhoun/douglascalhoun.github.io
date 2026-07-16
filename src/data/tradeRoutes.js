/**
 * Profitable trade lanes between planetary wells.
 * The campaign loop: escort merchants on the hottest routes, clear hunters, collect the lane purse.
 */
import { SYSTEMS, islandWorldPos, harborPos, getSystem } from './galaxy.js';

function edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Profit / pressure derived from island danger + strategic centrality. */
function scoreEdge(aId, bId) {
    const a = getSystem(aId);
    const b = getSystem(bId);
    const danger = Math.max(a.danger || 1, b.danger || 1);
    const hubBonus = ((a.links?.length || 0) + (b.links?.length || 0) >= 5) ? 1 : 0;
    const value = Math.min(5, danger + hubBonus); // 1–5 stars
    const piratePressure = 0.25 + danger * 0.12 + hubBonus * 0.08;
    const purse = 60 + value * 45 + danger * 20;
    return { value, piratePressure, purse };
}

function buildRoutes() {
    const seen = new Set();
    const routes = [];
    for (const sys of Object.values(SYSTEMS)) {
        for (const toId of sys.links || []) {
            const key = edgeKey(sys.id, toId);
            if (seen.has(key)) continue;
            seen.add(key);
            const meta = scoreEdge(sys.id, toId);
            const from = sys.id;
            const to = toId;
            routes.push({
                id: key,
                from,
                to,
                fromName: getSystem(from).name,
                toName: getSystem(to).name,
                label: `${getSystem(from).name.split(' ')[0]}↔${getSystem(to).name.split(' ')[0]}`,
                value: meta.value,
                piratePressure: meta.piratePressure,
                purse: meta.purse,
                // live state (mutated in scene)
                hunters: 0,
                merchants: 0,
                heat: 0
            });
        }
    }
    // Sort hottest first for HUD defaults
    routes.sort((a, b) => b.value - a.value || b.purse - a.purse);
    return routes;
}

export const ROUTES = buildRoutes();

export function getRoute(id) {
    return ROUTES.find((r) => r.id === id) || null;
}

export function routeEndpoints(route) {
    const a = harborPos(getSystem(route.from));
    const b = harborPos(getSystem(route.to));
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
}

/** Waypoints along a lane (harbor A → mid sea → harbor B). */
export function routeWaypoints(route, steps = 5) {
    const { ax, ay, bx, by } = routeEndpoints(route);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({
            x: ax + (bx - ax) * t,
            y: ay + (by - ay) * t
        });
    }
    return pts;
}

/** Distance from point to route segment + closest t in [0,1]. */
export function distToRoute(x, y, route) {
    const { ax, ay, bx, by } = routeEndpoints(route);
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby || 1;
    let t = ((x - ax) * abx + (y - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return { dist: Math.hypot(x - cx, y - cy), t, cx, cy };
}

export function nearestRoute(x, y) {
    let best = null;
    for (const route of ROUTES) {
        const d = distToRoute(x, y, route);
        if (!best || d.dist < best.dist) {
            best = { route, ...d };
        }
    }
    return best;
}

/** Live “hottest” lanes: base value × heat × pirate pressure. */
export function hottestRoutes(n = 3) {
    return [...ROUTES]
        .map((r) => ({
            route: r,
            score: r.value * (1 + r.heat) * (1 + r.piratePressure) + r.hunters * 0.8
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .map((x) => x.route);
}

export function stars(value) {
    return '★'.repeat(Math.max(1, Math.min(5, value || 1)));
}

/** Spawn point along a route (prefer mid-lane for hunters, random for merchants). */
export function pointOnRoute(route, t = 0.5, jitter = 80) {
    const { ax, ay, bx, by } = routeEndpoints(route);
    const x = ax + (bx - ax) * t + (Math.random() - 0.5) * jitter;
    const y = ay + (by - ay) * t + (Math.random() - 0.5) * jitter;
    return { x, y, t };
}

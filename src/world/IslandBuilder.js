/**
 * Draw chill island lakes (blue water, beach, palms) in the archipelago.
 */
import Phaser from 'phaser';
import { islandWorldPos, lakeRadius, harborPos } from '../data/galaxy.js';

export function paintDeepVoid(scene, worldSize) {
    scene.cameras.main.setBackgroundColor('#040812');
    const g = scene.add.graphics().setDepth(-130);
    g.fillStyle(0x040812, 1);
    g.fillRect(0, 0, worldSize, worldSize);
    // Sparse cold stars in the void between lakes
    for (let i = 0; i < 220; i++) {
        g.fillStyle(0x6688aa, Phaser.Math.FloatBetween(0.15, 0.55));
        g.fillCircle(
            Phaser.Math.Between(0, worldSize),
            Phaser.Math.Between(0, worldSize),
            Phaser.Math.FloatBetween(0.4, 1.6)
        );
    }
    // Occasional demon-eye glints
    for (let i = 0; i < 40; i++) {
        g.fillStyle(0xff4466, Phaser.Math.FloatBetween(0.08, 0.22));
        g.fillCircle(
            Phaser.Math.Between(0, worldSize),
            Phaser.Math.Between(0, worldSize),
            Phaser.Math.FloatBetween(1.2, 2.8)
        );
    }
    scene.worldGraphics.push(g);
    return g;
}

export function paintIslandLake(scene, sys) {
    const { x, y } = islandWorldPos(sys);
    const r = lakeRadius(sys);
    const water = sys.planet?.water ?? 0x3db8e8;
    const beach = sys.planet?.beach ?? 0xe8d5a3;
    const land = sys.planet?.color ?? 0x2f8b5a;

    const g = scene.add.graphics().setDepth(-110);
    // Soft deep fade into void at lake rim
    g.fillStyle(0x0a2848, 0.55);
    g.fillCircle(x, y, r * 1.12);
    // Bright calm lake
    g.fillStyle(water, 0.92);
    g.fillCircle(x, y, r * 0.98);
    g.fillStyle(0xa8e8ff, 0.18);
    g.fillCircle(x - r * 0.15, y - r * 0.12, r * 0.55);
    // Beach ring
    g.lineStyle(18, beach, 0.85);
    g.strokeCircle(x, y, (sys.planet?.radius || 260) + 36);
    // Island body
    const pr = sys.planet?.radius || 260;
    g.fillStyle(land, 1);
    g.fillCircle(x, y, pr);
    g.fillStyle(0x4cbc6a, 0.55);
    g.fillCircle(x - pr * 0.2, y - pr * 0.15, pr * 0.55);

    // Palm trees around shoreline
    const palms = 10 + Math.floor(pr / 40);
    for (let i = 0; i < palms; i++) {
        const ang = (i / palms) * Math.PI * 2 + 0.3;
        const px = x + Math.cos(ang) * (pr + 22);
        const py = y + Math.sin(ang) * (pr + 22);
        g.fillStyle(0x6b4423, 1);
        g.fillRect(px - 2, py - 18, 4, 22);
        g.fillStyle(0x2d8a4a, 1);
        g.fillTriangle(px, py - 28, px - 14, py - 12, px + 14, py - 12);
        g.fillTriangle(px, py - 24, px - 10, py - 8, px + 12, py - 10);
    }

    // Lake name buoy
    const label = scene.add.text(x, y - pr - 48, sys.planet?.name || sys.name, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '16px',
        fill: '#e8f6ff',
        stroke: '#0a3048',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(-50);
    scene.worldGraphics.push(g, label);

    return { x, y, r, sys };
}

export function placeHarborLandmark(scene, Station, sys) {
    const h = harborPos(sys);
    const station = new Station(scene, h.x, h.y, h.name, null);
    return station;
}

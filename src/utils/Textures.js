/**
 * Bake Age-of-Sail space textures once.
 * Theme: wooden aether-ships on a sea of stars (EV Nova under the hull).
 */
export function ensureGameTextures(scene) {
    if (scene.textures.exists('theme_aether_sail_v2')) return;

    // Drop prior triangle-era keys if hot-reloading
    [
        'shipPlayer', 'shipFighter', 'shipTrader', 'shipWreck', 'shipRemote',
        'edgeMarker', 'boltLaser', 'boltMissile', 'boltBomb', 'boltBall',
        'theme_aether_sail'
    ].forEach((key) => {
        if (scene.textures.exists(key)) scene.textures.remove(key);
    });

    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // --- Player: top-down sloop, bow = up ---------------------------------
    g.clear();
    // Hull
    g.fillStyle(0x6b4423, 1);
    g.fillEllipse(32, 36, 28, 56);
    g.fillStyle(0x8b5a2b, 1);
    g.fillEllipse(32, 34, 22, 48);
    // Deck planks hint
    g.lineStyle(1, 0x4a2f18, 0.55);
    g.lineBetween(32, 12, 32, 58);
    // Bowsprit
    g.fillStyle(0x5c3d2e, 1);
    g.fillTriangle(32, 4, 28, 16, 36, 16);
    // Mast
    g.fillStyle(0x3d2914, 1);
    g.fillRect(30, 18, 4, 28);
    // Mainsail (canvas)
    g.fillStyle(0xd2c2a4, 1);
    g.fillTriangle(32, 20, 14, 42, 50, 42);
    g.lineStyle(1, 0xa89070, 0.8);
    g.strokeTriangle(32, 20, 14, 42, 50, 42);
    // Gun ports
    g.fillStyle(0x1a1008, 1);
    g.fillCircle(20, 36, 2.2);
    g.fillCircle(44, 36, 2.2);
    g.fillCircle(22, 44, 2);
    g.fillCircle(42, 44, 2);
    // Brass lantern
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(32, 28, 2.5);
    g.generateTexture('shipPlayer', 64, 68);

    // --- Hostile: darker corsair ------------------------------------------
    g.clear();
    g.fillStyle(0x3a2218, 1);
    g.fillEllipse(24, 28, 22, 48);
    g.fillStyle(0x5a3320, 1);
    g.fillEllipse(24, 26, 16, 40);
    g.fillStyle(0x2a1810, 1);
    g.fillRect(22, 12, 4, 26);
    g.fillStyle(0x8b2030, 1); // blood sail
    g.fillTriangle(24, 14, 8, 36, 40, 36);
    g.fillStyle(0xc9a227, 0.9);
    g.fillCircle(24, 22, 2);
    g.fillStyle(0x1a1008, 1);
    g.fillCircle(14, 28, 2);
    g.fillCircle(34, 28, 2);
    g.generateTexture('shipFighter', 48, 52);

    // --- Trader: fat merchant cog -----------------------------------------
    g.clear();
    g.fillStyle(0x7a5a3a, 1);
    g.fillEllipse(28, 30, 36, 44);
    g.fillStyle(0xa08050, 1);
    g.fillEllipse(28, 28, 28, 36);
    g.fillStyle(0x4a3420, 1);
    g.fillRect(26, 10, 4, 24);
    g.fillStyle(0xc4b896, 1);
    g.fillTriangle(28, 12, 12, 34, 44, 34);
    g.fillStyle(0xe8dcc0, 0.5);
    g.fillCircle(28, 26, 3);
    g.generateTexture('shipTrader', 56, 56);

    // --- Wreck ------------------------------------------------------------
    g.clear();
    g.fillStyle(0x3a3a3a, 1);
    g.fillEllipse(24, 28, 22, 40);
    g.lineStyle(2, 0x222222, 1);
    g.lineBetween(10, 14, 38, 42);
    g.lineBetween(38, 16, 12, 40);
    g.fillStyle(0xff6600, 0.85);
    g.fillCircle(18, 30, 2.5);
    g.fillStyle(0xffaa00, 0.6);
    g.fillCircle(28, 24, 1.8);
    g.generateTexture('shipWreck', 48, 52);

    // --- Remote ally: teal sail -------------------------------------------
    g.clear();
    g.fillStyle(0x5a4030, 1);
    g.fillEllipse(24, 28, 20, 46);
    g.fillStyle(0x7a5840, 1);
    g.fillEllipse(24, 26, 15, 38);
    g.fillStyle(0x3d2914, 1);
    g.fillRect(22, 12, 4, 24);
    g.fillStyle(0x66c2a8, 1);
    g.fillTriangle(24, 14, 10, 34, 38, 34);
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(24, 22, 2);
    g.generateTexture('shipRemote', 48, 52);

    // --- Edge marker: tiny pennant ----------------------------------------
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 2, 4, 28, 28, 28);
    g.fillStyle(0xc9a227, 1);
    g.fillRect(15, 2, 2, 28);
    g.generateTexture('edgeMarker', 32, 32);

    // Bolts kept for compatibility
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 3);
    g.generateTexture('boltLaser', 12, 3);

    g.clear();
    g.fillStyle(0xff8844, 1);
    g.fillTriangle(14, 3, 0, 0, 0, 6);
    g.fillStyle(0xffaa66, 1);
    g.fillRect(0, 1, 8, 4);
    g.generateTexture('boltMissile', 16, 6);

    g.clear();
    g.fillStyle(0xff5566, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('boltBomb', 12, 12);

    // Iron cannonball
    g.clear();
    g.fillStyle(0x2a2a2a, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0x888888, 0.45);
    g.fillCircle(4, 4, 2);
    g.generateTexture('boltBall', 12, 12);

    // Theme marker (cache bust)
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('theme_aether_sail_v2', 2, 2);

    g.destroy();
}

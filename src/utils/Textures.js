/**
 * Bake simple shapes into reusable textures once.
 * Avoids per-frame Graphics.clear() which stutters hard on Safari WebGL.
 */
export function ensureGameTextures(scene) {
    if (scene.textures.exists('shipPlayer')) return;

    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // Player ship (pointing up)
    g.clear();
    g.fillStyle(0x44ff88, 1);
    g.fillTriangle(24, 2, 10, 40, 38, 40);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(24, 18, 4);
    g.fillStyle(0x66aaff, 0.95);
    g.fillTriangle(18, 40, 30, 40, 24, 48);
    g.lineStyle(2, 0x0a2a14, 1);
    g.strokeTriangle(24, 2, 10, 40, 38, 40);
    g.generateTexture('shipPlayer', 48, 52);

    // Generic fighter (white — tinted at runtime)
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(20, 2, 8, 36, 32, 36);
    g.fillStyle(0xffcc66, 1);
    g.fillCircle(20, 16, 3);
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeTriangle(20, 2, 8, 36, 32, 36);
    g.generateTexture('shipFighter', 40, 40);

    // Trader
    g.clear();
    g.fillStyle(0x4a7cff, 1);
    g.fillRect(6, 12, 28, 20);
    g.fillRect(14, 4, 12, 8);
    g.fillStyle(0xaaccff, 1);
    g.fillCircle(20, 22, 3);
    g.generateTexture('shipTrader', 40, 40);

    // Wreck
    g.clear();
    g.fillStyle(0x444444, 1);
    g.fillTriangle(20, 4, 8, 36, 32, 36);
    g.lineStyle(2, 0x222222, 1);
    g.lineBetween(10, 10, 30, 30);
    g.fillStyle(0xff6600, 0.9);
    g.fillCircle(14, 22, 2);
    g.generateTexture('shipWreck', 40, 40);

    // Edge marker triangle (white, tinted)
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 0, 2, 28, 30, 28);
    g.generateTexture('edgeMarker', 32, 32);

    // Laser bolt
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 3);
    g.generateTexture('boltLaser', 12, 3);

    // Missile
    g.clear();
    g.fillStyle(0xff8844, 1);
    g.fillTriangle(14, 3, 0, 0, 0, 6);
    g.fillStyle(0xffaa66, 1);
    g.fillRect(0, 1, 8, 4);
    g.generateTexture('boltMissile', 16, 6);

    // Bomb
    g.clear();
    g.fillStyle(0xff5566, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('boltBomb', 12, 12);

    // Remote friend ship
    g.clear();
    g.fillStyle(0x33ddff, 1);
    g.fillTriangle(20, 2, 8, 36, 32, 36);
    g.generateTexture('shipRemote', 40, 40);

    g.destroy();
}

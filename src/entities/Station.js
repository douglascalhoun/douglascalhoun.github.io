import Phaser from 'phaser';

/**
 * Harbor / port — a wooden quay on a rock islet in the aether-sea.
 */
export default class Station {
    constructor(scene, x, y, name = 'Harbor', prices = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.name = name;
        this.dockingRadius = 240;

        this.prices = prices || {
            food: { buy: 12, sell: 8 },
            ore: { buy: 22, sell: 15 },
            tech: { buy: 45, sell: 30 }
        };

        this.createStationGraphics();
    }

    createStationGraphics() {
        this.container = this.scene.add.container(this.x, this.y);
        this.container.setDepth(20);

        const art = this.scene.add.graphics();

        // Shallows around the islet
        art.fillStyle(0x1a4a5c, 0.35);
        art.fillCircle(0, 0, 95);
        art.fillStyle(0x2a6a7a, 0.25);
        art.fillCircle(0, 0, 70);

        // Rock islet
        art.fillStyle(0x4a5560, 1);
        art.fillEllipse(0, 8, 88, 56);
        art.fillStyle(0x6a7580, 1);
        art.fillEllipse(-6, 0, 70, 44);

        // Wooden quay (cross)
        art.fillStyle(0x6b4423, 1);
        art.fillRect(-48, -14, 96, 28);
        art.fillRect(-14, -52, 28, 104);
        art.fillStyle(0x8b5a2b, 1);
        art.fillRect(-42, -9, 84, 18);
        art.fillRect(-9, -46, 18, 92);

        // Plank lines
        art.lineStyle(1, 0x4a2f18, 0.5);
        for (let i = -40; i <= 40; i += 10) {
            art.lineBetween(i, -12, i, 12);
            art.lineBetween(-12, i, 12, i);
        }

        // Warehouse / keep
        art.fillStyle(0x5c4030, 1);
        art.fillRect(-22, -22, 44, 36);
        art.fillStyle(0x3d2914, 1);
        art.fillTriangle(0, -38, -26, -20, 26, -20);

        // Lighthouse tower
        art.fillStyle(0xd2c2a4, 1);
        art.fillRect(28, -48, 14, 52);
        art.fillStyle(0xc9a227, 1);
        art.fillCircle(35, -52, 7);
        art.fillStyle(0xffe066, 0.9);
        art.fillCircle(35, -52, 4);

        // Mooring bollards
        art.fillStyle(0x2a2a2a, 1);
        art.fillCircle(-40, 0, 3);
        art.fillCircle(40, 0, 3);
        art.fillCircle(0, -44, 3);
        art.fillCircle(0, 44, 3);

        this.container.add(art);

        this.dockingZone = this.scene.add.circle(this.x, this.y, this.dockingRadius, 0x33aa88, 0);
        this.dockingZone.setStrokeStyle(2, 0xc9a227, 0.4);
        this.dockingZone.setDepth(-30);

        this.label = this.scene.add.text(this.x, this.y - 100, this.name, {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '15px',
            fill: '#e8dcc0',
            backgroundColor: '#1a1208cc',
            padding: { x: 8, y: 4 }
        });
        this.label.setOrigin(0.5);
        this.label.setAlpha(0);
        this.label.setDepth(100);
    }

    update(playerX, playerY) {
        const distance = Phaser.Math.Distance.Between(playerX, playerY, this.x, this.y);
        const inDockingRange = distance < this.dockingRadius;

        if (inDockingRange) {
            this.dockingZone.setAlpha(0.4);
            this.label.setAlpha(1);
        } else {
            this.dockingZone.setAlpha(0);
            this.label.setAlpha(Math.max(0, 1 - (distance - this.dockingRadius) / 500));
        }

        return inDockingRange;
    }

    destroy() {
        this.container?.destroy();
        this.dockingZone?.destroy();
        this.label?.destroy();
    }

    getX() { return this.x; }
    getY() { return this.y; }
    getName() { return this.name; }
}

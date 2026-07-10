import Phaser from 'phaser';

export default class Station {
    constructor(scene, x, y, name = 'Station Alpha', prices = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.name = name;
        this.dockingRadius = 220;

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

        const station = this.scene.add.graphics();
        station.fillStyle(0x9aa3ad, 1);
        station.fillRect(-34, -34, 68, 68);
        station.fillStyle(0x6d7580, 1);
        station.fillRect(-70, -12, 36, 24);
        station.fillRect(34, -12, 36, 24);
        station.fillRect(-12, -70, 24, 36);
        station.fillRect(-12, 34, 24, 36);
        station.fillStyle(0xffe066, 0.95);
        station.fillCircle(0, 0, 9);
        station.fillCircle(-52, 0, 4);
        station.fillCircle(52, 0, 4);
        station.lineStyle(2, 0xdde3ea, 0.8);
        station.strokeRect(-34, -34, 68, 68);
        this.container.add(station);

        this.dockingZone = this.scene.add.circle(this.x, this.y, this.dockingRadius, 0x33ff88, 0);
        this.dockingZone.setStrokeStyle(2, 0x33ff88, 0.35);
        this.dockingZone.setDepth(-30);

        this.label = this.scene.add.text(this.x, this.y - 90, this.name, {
            fontSize: '16px',
            fill: '#9dffb0',
            backgroundColor: '#001a08',
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
            this.dockingZone.setAlpha(0.35);
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

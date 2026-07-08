export default class Projectile {
    constructor(scene, x, y, angle, speed = 400, options = {}) {
        this.scene = scene;
        this.damage = options.damage ?? 12;
        this.fromPlayer = options.fromPlayer ?? true;
        this.lifetime = options.lifetime ?? 1800;
        this.created = Date.now();

        const color = this.fromPlayer ? 0x66ffaa : 0xff4444;
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(color, 1);
        this.sprite.fillCircle(0, 0, this.fromPlayer ? 3 : 4);
        this.sprite.lineStyle(1, 0xffffff, 0.8);
        this.sprite.strokeCircle(0, 0, this.fromPlayer ? 3 : 4);

        this.container = scene.add.container(x, y, [this.sprite]);
        this.container.setDepth(80);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(4, -4, -4);
        this.body.setVelocity(
            Math.sin(angle) * speed,
            -Math.cos(angle) * speed
        );
    }

    update() {
        if (Date.now() - this.created > this.lifetime) {
            this.destroy();
            return false;
        }
        return true;
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    getX() {
        return this.container ? this.container.x : 0;
    }

    getY() {
        return this.container ? this.container.y : 0;
    }
}

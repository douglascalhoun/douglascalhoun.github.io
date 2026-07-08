import Phaser from 'phaser';

export default class NPCShip {
    constructor(scene, x, y, type = 'trader') {
        this.scene = scene;
        this.type = type;
        this.alive = true;
        this.speed = type === 'trader' ? 55 : 120;
        this.maxHull = type === 'trader' ? 40 : 70;
        this.hull = this.maxHull;
        this.bounty = type === 'trader' ? 75 : 150;
        this.aggroRange = type === 'fighter' ? 700 : 0;
        this.fireRange = 420;
        this.fireRate = 900;
        this.lastFireTime = 0;

        this.sprite = scene.add.graphics();
        this.drawShip(type);

        this.container = scene.add.container(x, y, [this.sprite]);
        this.container.setDepth(50);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(12, -12, -12);
        this.body.setMaxVelocity(this.speed);

        this.targetX = x;
        this.targetY = y;
        this.wanderTimer = 0;
        this.wanderInterval = Phaser.Math.Between(3000, 6000);
        this.mode = 'patrol';

        this.pickNewTarget();
    }

    drawShip(type) {
        this.sprite.clear();
        if (type === 'trader') {
            this.sprite.fillStyle(0x4a7cff, 1);
            this.sprite.fillRect(-10, -8, 20, 16);
            this.sprite.fillRect(-5, -14, 10, 6);
            this.sprite.fillStyle(0xaaccff, 1);
            this.sprite.fillCircle(0, 0, 3);
            this.sprite.lineStyle(1, 0xffffff, 0.5);
            this.sprite.strokeRect(-10, -8, 20, 16);
        } else {
            this.sprite.fillStyle(0xff6622, 1);
            this.sprite.fillTriangle(0, -16, -10, 12, 10, 12);
            this.sprite.fillStyle(0xffcc66, 1);
            this.sprite.fillCircle(0, -2, 3);
            this.sprite.lineStyle(1, 0xffffff, 0.6);
            this.sprite.strokeTriangle(0, -16, -10, 12, 10, 12);
        }
    }

    pickNewTarget() {
        const worldSize = 10000;
        const centerX = worldSize / 2;
        const centerY = worldSize / 2;
        const maxDistance = 2000;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * maxDistance;
        this.targetX = centerX + Math.cos(angle) * distance;
        this.targetY = centerY + Math.sin(angle) * distance;
    }

    update(time, delta, player) {
        if (!this.alive) return;

        if (this.type === 'fighter' && player) {
            const dist = Phaser.Math.Distance.Between(
                this.container.x, this.container.y,
                player.getX(), player.getY()
            );
            if (dist < this.aggroRange) {
                this.mode = 'attack';
                this.targetX = player.getX();
                this.targetY = player.getY();
                if (dist < this.fireRange && time - this.lastFireTime > this.fireRate) {
                    this.lastFireTime = time;
                    this.scene.spawnEnemyProjectile(this);
                }
            } else if (this.mode === 'attack') {
                this.mode = 'patrol';
                this.pickNewTarget();
            }
        }

        if (this.mode === 'patrol') {
            this.wanderTimer += delta;
            if (this.wanderTimer > this.wanderInterval) {
                this.pickNewTarget();
                this.wanderTimer = 0;
                this.wanderInterval = Phaser.Math.Between(3000, 6000);
            }
        }

        const dx = this.targetX - this.container.x;
        const dy = this.targetY - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const stopDistance = this.mode === 'attack' ? 180 : 50;

        if (distance > stopDistance) {
            const angle = Math.atan2(dy, dx);
            const speed = this.mode === 'attack' ? this.speed * 1.15 : this.speed;
            this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.container.setRotation(angle + Math.PI / 2);
        } else if (this.mode === 'patrol') {
            this.body.setVelocity(0, 0);
            this.pickNewTarget();
        } else {
            // Keep facing player while holding distance
            const angle = Math.atan2(dy, dx);
            this.body.setVelocity(0, 0);
            this.container.setRotation(angle + Math.PI / 2);
        }
    }

    takeDamage(amount) {
        if (!this.alive) return false;
        this.hull -= amount;
        this.container.setAlpha(0.5);
        this.scene.time.delayedCall(60, () => {
            if (this.alive && this.container.active) this.container.setAlpha(1);
        });

        if (this.hull <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }

    destroy() {
        this.alive = false;
        if (this.container) {
            this.container.destroy();
        }
    }

    getX() {
        return this.container.x;
    }

    getY() {
        return this.container.y;
    }

    getRotation() {
        return this.container.rotation;
    }
}

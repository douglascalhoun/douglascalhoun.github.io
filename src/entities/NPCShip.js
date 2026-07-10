import Phaser from 'phaser';

export default class NPCShip {
    /**
     * @param {object} options
     * @param {number} [options.tier=1] - Escalating difficulty for fighters
     * @param {number} [options.hits] - Hits until disabled (default by type/tier)
     */
    constructor(scene, x, y, type = 'trader', options = {}) {
        this.scene = scene;
        this.type = type;
        this.tier = options.tier || 1;
        this.alive = true;
        this.disabled = false;

        // Hit-based health: each player shot = 1 hit
        const baseHits = type === 'trader' ? 2 : 3;
        this.maxHits = options.hits ?? (baseHits + Math.max(0, this.tier - 1));
        this.hits = this.maxHits;
        this.hitDamage = 1;

        this.speed = type === 'trader'
            ? 55
            : 95 + (this.tier - 1) * 10;
        this.fleeSpeed = this.speed * 1.25;
        this.bounty = type === 'trader'
            ? 75
            : 120 + this.tier * 40;
        this.aggroRange = type === 'fighter' ? 900 + this.tier * 60 : 0;
        this.fireRange = 420;
        this.idealRange = 220;
        this.fireRate = Math.max(420, 780 - this.tier * 40);
        this.shotDamage = 8 + this.tier * 2;
        this.lastFireTime = 0;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;

        this.sprite = scene.add.graphics();
        this.damageFx = scene.add.graphics();
        this.drawShip();

        this.container = scene.add.container(x, y, [this.sprite, this.damageFx]);
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
        this.sparkTimer = 0;

        this.pickNewTarget();
    }

    drawShip() {
        this.sprite.clear();
        if (this.type === 'trader') {
            this.sprite.fillStyle(0x4a7cff, 1);
            this.sprite.fillRect(-10, -8, 20, 16);
            this.sprite.fillRect(-5, -14, 10, 6);
            this.sprite.fillStyle(0xaaccff, 1);
            this.sprite.fillCircle(0, 0, 3);
            this.sprite.lineStyle(1, 0xffffff, 0.5);
            this.sprite.strokeRect(-10, -8, 20, 16);
        } else {
            // Tougher tiers look a bit larger / hotter
            const scale = 1 + Math.min(0.35, (this.tier - 1) * 0.08);
            this.sprite.fillStyle(this.tier >= 3 ? 0xff3344 : 0xff6622, 1);
            this.sprite.fillTriangle(0, -16 * scale, -10 * scale, 12 * scale, 10 * scale, 12 * scale);
            this.sprite.fillStyle(0xffcc66, 1);
            this.sprite.fillCircle(0, -2, 3 * scale);
            this.sprite.lineStyle(1, 0xffffff, 0.6);
            this.sprite.strokeTriangle(0, -16 * scale, -10 * scale, 12 * scale, 10 * scale, 12 * scale);
        }
        this.redrawDamage();
    }

    redrawDamage() {
        this.damageFx.clear();
        if (!this.alive) return;

        const missing = this.maxHits - this.hits;
        if (missing <= 0 && !this.disabled) return;

        if (this.disabled) {
            // Dead hulk: dark + sparks
            this.sprite.clear();
            this.sprite.fillStyle(0x444444, 1);
            if (this.type === 'trader') {
                this.sprite.fillRect(-10, -8, 20, 16);
            } else {
                this.sprite.fillTriangle(0, -16, -10, 12, 10, 12);
            }
            this.damageFx.fillStyle(0xff6600, 0.9);
            this.damageFx.fillCircle(-4, 2, 2);
            this.damageFx.fillStyle(0xffaa00, 0.7);
            this.damageFx.fillCircle(5, -3, 1.5);
            this.damageFx.lineStyle(1, 0x222222, 0.8);
            this.damageFx.lineBetween(-8, -6, 8, 8);
            return;
        }

        // Scorch / smoke for damage taken
        for (let i = 0; i < missing; i++) {
            const ox = -6 + i * 5;
            const oy = 2 + (i % 2) * 3;
            this.damageFx.fillStyle(0x222222, 0.85);
            this.damageFx.fillCircle(ox, oy, 2.5);
            this.damageFx.fillStyle(0xff8800, 0.55);
            this.damageFx.fillCircle(ox + 1, oy - 1, 1.2);
        }

        // Critical (1 hit left): flashing red outline
        if (this.hits === 1) {
            this.damageFx.lineStyle(2, 0xff2222, 0.9);
            this.damageFx.strokeCircle(0, 0, 18);
        }
    }

    pickNewTarget() {
        const worldSize = 10000;
        const centerX = worldSize / 2;
        const centerY = worldSize / 2;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 2000;
        this.targetX = centerX + Math.cos(angle) * distance;
        this.targetY = centerY + Math.sin(angle) * distance;
    }

    pickFleeTarget(player) {
        const dx = this.container.x - player.getX();
        const dy = this.container.y - player.getY();
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        this.targetX = this.container.x + (dx / len) * 1400;
        this.targetY = this.container.y + (dy / len) * 1400;
        this.targetX = Phaser.Math.Clamp(this.targetX, 200, 9800);
        this.targetY = Phaser.Math.Clamp(this.targetY, 200, 9800);
    }

    update(time, delta, player) {
        if (!this.alive) return;

        if (this.disabled) {
            this.body.setVelocity(this.body.velocity.x * 0.98, this.body.velocity.y * 0.98);
            this.sparkTimer += delta;
            if (this.sparkTimer > 180) {
                this.sparkTimer = 0;
                this.redrawDamage();
                // Flicker
                this.container.setAlpha(0.55 + Math.random() * 0.35);
            }
            return;
        }

        if (this.type === 'fighter' && player) {
            const dist = Phaser.Math.Distance.Between(
                this.container.x, this.container.y,
                player.getX(), player.getY()
            );

            // Flee when one hit from disabled
            if (this.hits === 1) {
                if (this.mode !== 'flee') {
                    this.mode = 'flee';
                    this.pickFleeTarget(player);
                    this.body.setMaxVelocity(this.fleeSpeed);
                } else {
                    this.pickFleeTarget(player);
                }
            } else if (dist < this.aggroRange) {
                this.mode = 'attack';
                this.body.setMaxVelocity(this.speed * 1.2);
            } else if (this.mode === 'attack') {
                this.mode = 'patrol';
                this.body.setMaxVelocity(this.speed);
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

        if (this.mode === 'attack' && player) {
            this.updateDuel(time, delta, player);
            return;
        }

        if (this.mode === 'flee') {
            this.updateFlee(delta);
            return;
        }

        this.moveToward(this.targetX, this.targetY, this.speed, 50, true);
    }

    updateDuel(time, delta, player) {
        const px = player.getX();
        const py = player.getY();
        const dx = px - this.container.x;
        const dy = py - this.container.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const angleToPlayer = Math.atan2(dy, dx);

        this.strafeTimer += delta;
        if (this.strafeTimer > 1400) {
            this.strafeDir *= -1;
            this.strafeTimer = 0;
        }

        // Chase if far, hold and circle if close (duel)
        let vx = 0;
        let vy = 0;
        if (dist > this.idealRange + 40) {
            vx = (dx / dist) * this.speed * 1.15;
            vy = (dy / dist) * this.speed * 1.15;
        } else if (dist < this.idealRange - 60) {
            vx = -(dx / dist) * this.speed * 0.9;
            vy = -(dy / dist) * this.speed * 0.9;
        }

        // Strafe orbit
        vx += -Math.sin(angleToPlayer) * this.strafeDir * this.speed * 0.75;
        vy += Math.cos(angleToPlayer) * this.strafeDir * this.speed * 0.75;

        this.body.setVelocity(vx, vy);
        this.container.setRotation(angleToPlayer + Math.PI / 2);

        if (dist < this.fireRange && time - this.lastFireTime > this.fireRate) {
            // Only fire when roughly facing player
            this.lastFireTime = time;
            this.scene.spawnEnemyProjectile(this);
        }
    }

    updateFlee(delta) {
        const reached = this.moveToward(this.targetX, this.targetY, this.fleeSpeed, 80, true);
        if (reached) this.pickNewTarget();
    }

    moveToward(tx, ty, speed, stopDistance, face) {
        const dx = tx - this.container.x;
        const dy = ty - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > stopDistance) {
            const angle = Math.atan2(dy, dx);
            this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            if (face) this.container.setRotation(angle + Math.PI / 2);
            return false;
        }
        this.body.setVelocity(0, 0);
        return true;
    }

    /**
     * @returns {'hit'|'critical'|'disabled'|false}
     */
    takeDamage(amount = 1) {
        if (!this.alive || this.disabled) return false;

        this.hits -= amount;
        this.redrawDamage();
        this.container.setAlpha(0.45);
        this.scene.time.delayedCall(70, () => {
            if (this.alive && this.container.active && !this.disabled) {
                this.container.setAlpha(this.hits === 1 ? 0.85 : 1);
            }
        });

        // Small knockback spark burst
        if (this.scene.spawnHitSpark) {
            this.scene.spawnHitSpark(this.container.x, this.container.y);
        }

        if (this.hits <= 0) {
            this.disable();
            return 'disabled';
        }
        if (this.hits === 1) {
            this.mode = 'flee';
            return 'critical';
        }
        return 'hit';
    }

    disable() {
        this.disabled = true;
        this.hits = 0;
        this.mode = 'disabled';
        this.body.setAcceleration(0, 0);
        this.body.setMaxVelocity(40);
        // Drift leftover velocity
        this.body.setVelocity(this.body.velocity.x * 0.3, this.body.velocity.y * 0.3);
        this.redrawDamage();
        this.container.setAlpha(0.75);
        this.container.setDepth(40);
    }

    destroy() {
        this.alive = false;
        if (this.container) this.container.destroy();
    }

    getX() { return this.container.x; }
    getY() { return this.container.y; }
    getRotation() { return this.container.rotation; }
    isCombatTarget() { return this.alive && !this.disabled; }
}

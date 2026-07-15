import Phaser from 'phaser';
import { ARCHETYPES } from '../data/defendWaves.js';

/**
 * NPC ship — traders or archetype fighters.
 * Uses baked sprites (no per-frame Graphics) for Safari smoothness.
 */
export default class NPCShip {
    constructor(scene, x, y, type = 'trader', options = {}) {
        this.scene = scene;
        this.type = type;
        this.archetypeId = options.archetype || null;
        this.archetype = this.archetypeId ? ARCHETYPES[this.archetypeId] : null;
        this.tier = options.tier || 1;
        this.waveId = options.waveId ?? null;
        this.alive = true;
        this.disabled = false;
        this.hasFled = false;
        this.fleeNotified = false;
        this.harvestQueued = false;

        if (this.archetype) {
            this.applyArchetype(this.archetype);
        } else {
            const baseHits = type === 'trader' ? 2 : 3;
            this.maxHits = options.hits ?? (baseHits + Math.max(0, this.tier - 1));
            this.hits = this.maxHits;
            this.hitDamage = 1;
            this.speed = type === 'trader' ? 55 : 95 + (this.tier - 1) * 10;
            this.fleeSpeed = this.speed * 1.25;
            this.bounty = type === 'trader' ? 75 : 120 + this.tier * 40;
            this.aggroRange = type === 'fighter' ? 900 + this.tier * 60 : 0;
            this.fireRange = 420;
            this.idealRange = 220;
            this.fireRate = Math.max(420, 780 - this.tier * 40);
            this.shotDamage = 8 + this.tier * 2;
            this.color = type === 'trader' ? 0x4a7cff : 0xff6622;
            this.pattern = 'strafe';
            this.abilities = [];
            this.label = type === 'trader' ? 'Trader' : `Fighter T${this.tier}`;
        }

        this.lastFireTime = 0;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;
        this.weavePhase = Math.random() * Math.PI * 2;
        this.dashUntil = 0;
        this.abilityCooldown = 0;
        this.mineCooldown = 0;
        this.sparkTimer = 0;

        const tex = type === 'trader' ? 'shipTrader' : 'shipFighter';
        this.sprite = scene.add.image(0, 0, tex);
        if (type !== 'trader') {
            this.sprite.setTint(this.color);
            const scale = this.archetypeId === 'warmaster' ? 1.35
                : this.archetypeId === 'ace' ? 1.2
                    : 1;
            this.sprite.setScale(scale);
        }

        this.scorch = scene.add.image(0, 4, 'boltBomb').setVisible(false).setAlpha(0.7).setScale(0.6);
        this.critRing = scene.add.circle(0, 0, 18, 0xff2222, 0).setStrokeStyle(2, 0xff2222, 0.9).setVisible(false);

        this.container = scene.add.container(x, y, [this.sprite, this.scorch, this.critRing]);
        this.container.setDepth(50);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(12, -12, -12);
        this.body.setMaxVelocity(this.speed);
        this.body.setAcceleration(0, 0);

        this.targetX = x;
        this.targetY = y;
        this.wanderTimer = 0;
        this.wanderInterval = Phaser.Math.Between(3000, 6000);
        this.mode = 'patrol';

        this.pickNewTarget();
    }

    applyArchetype(arch) {
        this.maxHits = arch.hits;
        this.hits = arch.hits;
        this.hitDamage = 1;
        this.speed = arch.speed;
        this.fleeSpeed = arch.speed * 1.35;
        this.bounty = arch.bounty;
        this.aggroRange = 1100;
        this.fireRange = arch.fireRange;
        this.idealRange = arch.idealRange;
        this.fireRate = arch.fireRate;
        this.shotDamage = arch.shotDamage;
        this.color = arch.color;
        this.pattern = arch.pattern || 'strafe';
        this.abilities = arch.abilities || [];
        this.label = arch.label;
        this.type = 'fighter';
    }

    refreshDamageVisual() {
        const missing = this.maxHits - this.hits;
        if (this.disabled) {
            this.sprite.setTexture('shipWreck');
            this.sprite.clearTint();
            this.scorch.setVisible(true);
            this.critRing.setVisible(false);
            return;
        }
        this.scorch.setVisible(missing > 0);
        this.scorch.setAlpha(0.4 + missing * 0.2);
        this.critRing.setVisible(this.hits === 1);
        this.container.setAlpha(this.hits === 1 ? 0.85 : 1);
    }

    pickNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 2000;
        this.targetX = 5000 + Math.cos(angle) * distance;
        this.targetY = 5000 + Math.sin(angle) * distance;
    }

    pickFleeTarget(player) {
        const dx = this.container.x - player.getX();
        const dy = this.container.y - player.getY();
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        this.targetX = Phaser.Math.Clamp(this.container.x + (dx / len) * 1400, 200, 9800);
        this.targetY = Phaser.Math.Clamp(this.container.y + (dy / len) * 1400, 200, 9800);
    }

    notifyFlee() {
        if (this.fleeNotified) return;
        this.fleeNotified = true;
        this.hasFled = true;
        if (this.scene.onEnemyFled) this.scene.onEnemyFled(this);
    }

    update(time, delta, player) {
        if (!this.alive) return;

        if (this.disabled) {
            this.body.setVelocity(this.body.velocity.x * 0.98, this.body.velocity.y * 0.98);
            this.sparkTimer += delta;
            if (this.sparkTimer > 280) {
                this.sparkTimer = 0;
                this.container.setAlpha(0.55 + Math.random() * 0.35);
            }
            return;
        }

        if (this.abilityCooldown > 0) this.abilityCooldown -= delta;
        if (this.mineCooldown > 0) this.mineCooldown -= delta;

        if (this.type === 'fighter' && player) {
            const dist = Phaser.Math.Distance.Between(
                this.container.x, this.container.y,
                player.getX(), player.getY()
            );

            if (this.hits === 1) {
                if (this.mode !== 'flee') {
                    this.mode = 'flee';
                    this.pickFleeTarget(player);
                    this.body.setMaxVelocity(this.fleeSpeed);
                    this.notifyFlee();
                } else {
                    this.pickFleeTarget(player);
                }
            } else if (dist < this.aggroRange) {
                this.mode = 'attack';
                this.body.setMaxVelocity(this.speed * 1.15);
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
            this.updateFlee();
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
        this.weavePhase += delta * 0.004;

        let vx = 0;
        let vy = 0;
        const pattern = this.pattern;

        if (pattern === 'straight') {
            if (dist > this.idealRange) {
                vx = (dx / dist) * this.speed;
                vy = (dy / dist) * this.speed;
            } else if (dist < this.idealRange - 40) {
                vx = -(dx / dist) * this.speed * 0.5;
                vy = -(dy / dist) * this.speed * 0.5;
            }
        } else if (pattern === 'weave') {
            if (dist > this.idealRange + 30) {
                vx = (dx / dist) * this.speed * 1.1;
                vy = (dy / dist) * this.speed * 1.1;
            } else if (dist < this.idealRange - 50) {
                vx = -(dx / dist) * this.speed * 0.85;
                vy = -(dy / dist) * this.speed * 0.85;
            }
            const weave = Math.sin(this.weavePhase) * this.speed * 0.95;
            vx += -Math.sin(angleToPlayer) * weave;
            vy += Math.cos(angleToPlayer) * weave;
        } else if (pattern === 'flank') {
            const preferred = angleToPlayer + this.strafeDir * (Math.PI / 2.4);
            const orbitX = px + Math.cos(preferred) * this.idealRange;
            const orbitY = py + Math.sin(preferred) * this.idealRange;
            const odx = orbitX - this.container.x;
            const ody = orbitY - this.container.y;
            const od = Math.sqrt(odx * odx + ody * ody) || 1;
            vx = (odx / od) * this.speed * 1.2;
            vy = (ody / od) * this.speed * 1.2;
            if (this.strafeTimer > 2200) {
                this.strafeDir *= -1;
                this.strafeTimer = 0;
            }
        } else if (pattern === 'burst_dash' || pattern === 'warmaster') {
            if (time < this.dashUntil) {
                vx = Math.cos(angleToPlayer + this.strafeDir * 0.9) * this.speed * 1.8;
                vy = Math.sin(angleToPlayer + this.strafeDir * 0.9) * this.speed * 1.8;
            } else {
                if (dist > this.idealRange + 40) {
                    vx = (dx / dist) * this.speed * 1.2;
                    vy = (dy / dist) * this.speed * 1.2;
                } else if (dist < this.idealRange - 60) {
                    vx = -(dx / dist) * this.speed;
                    vy = -(dy / dist) * this.speed;
                }
                vx += -Math.sin(angleToPlayer) * this.strafeDir * this.speed * 0.8;
                vy += Math.cos(angleToPlayer) * this.strafeDir * this.speed * 0.8;

                if (this.abilities.includes('dash') && this.abilityCooldown <= 0 && dist < 320) {
                    this.dashUntil = time + 280;
                    this.abilityCooldown = 2600;
                    this.strafeDir *= -1;
                    if (this.scene.spawnHitSpark) {
                        this.scene.spawnHitSpark(this.container.x, this.container.y);
                    }
                }
            }
            if (this.strafeTimer > 1200) {
                this.strafeDir *= -1;
                this.strafeTimer = 0;
            }
        } else {
            if (this.strafeTimer > 1400) {
                this.strafeDir *= -1;
                this.strafeTimer = 0;
            }
            if (dist > this.idealRange + 40) {
                vx = (dx / dist) * this.speed * 1.15;
                vy = (dy / dist) * this.speed * 1.15;
            } else if (dist < this.idealRange - 60) {
                vx = -(dx / dist) * this.speed * 0.9;
                vy = -(dy / dist) * this.speed * 0.9;
            }
            vx += -Math.sin(angleToPlayer) * this.strafeDir * this.speed * 0.75;
            vy += Math.cos(angleToPlayer) * this.strafeDir * this.speed * 0.75;
        }

        this.body.setVelocity(vx, vy);
        this.container.setRotation(angleToPlayer + Math.PI / 2);

        if (this.abilities.includes('mine') && this.mineCooldown <= 0 && dist < 380) {
            this.mineCooldown = 4200;
            if (this.scene.spawnEnemyMine) {
                this.scene.spawnEnemyMine(this.container.x, this.container.y);
            }
        }

        if (dist < this.fireRange && time - this.lastFireTime > this.fireRate) {
            this.lastFireTime = time;
            if (this.abilities.includes('burst')) {
                this.scene.spawnEnemyProjectile(this, { spread: 0.18, count: 3 });
            } else {
                this.scene.spawnEnemyProjectile(this);
            }
        }
    }

    updateFlee() {
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

    takeDamage(amount = 1) {
        if (!this.alive || this.disabled) return false;

        this.hits -= amount;
        this.refreshDamageVisual();
        this.container.setAlpha(0.45);
        this.scene.time.delayedCall(70, () => {
            if (this.alive && this.container.active && !this.disabled) {
                this.container.setAlpha(this.hits === 1 ? 0.85 : 1);
            }
        });

        if (this.scene.spawnHitSpark) {
            this.scene.spawnHitSpark(this.container.x, this.container.y);
        }

        if (this.hits <= 0) {
            this.disable();
            return 'disabled';
        }
        if (this.hits === 1) {
            this.mode = 'flee';
            this.body.setMaxVelocity(this.fleeSpeed);
            this.notifyFlee();
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
        this.body.setVelocity(this.body.velocity.x * 0.3, this.body.velocity.y * 0.3);
        this.refreshDamageVisual();
        this.container.setAlpha(0.75);
        this.container.setDepth(40);
        if (this.scene.onEnemyDisabled) this.scene.onEnemyDisabled(this);
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

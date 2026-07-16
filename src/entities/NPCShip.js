import Phaser from 'phaser';
import { ARCHETYPES } from '../data/defendWaves.js';
import { pickQuote, moodColor } from '../data/enemyQuotes.js';

/**
 * NPC ship — traders or archetype fighters.
 * Uses baked sprites (no per-frame Graphics) for Safari smoothness.
 * Moods drive colored philosophy barks beside the hull.
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

        this.mood = type === 'fighter' ? 'aggressive' : 'pensive';
        this.prevMood = this.mood;
        this.nextBarkAt = 0;
        this.barkCooldownMs = Phaser.Math.Between(5200, 9000);
        this.barkTexts = [];
        this.upsetUntil = 0;

        if (this.archetype) {
            this.applyArchetype(this.archetype);
        } else {
            const baseHits = type === 'trader' ? 2 : 3;
            this.maxHits = options.hits ?? (baseHits + Math.max(0, this.tier - 1));
            this.hits = this.maxHits;
            this.hitDamage = 1;
            this.speed = type === 'trader' ? 34 : 58 + (this.tier - 1) * 6;
            this.fleeSpeed = this.speed * 1.25;
            this.bounty = type === 'trader' ? 75 : 120 + this.tier * 40;
            this.aggroRange = type === 'fighter' ? 900 + this.tier * 60 : 0;
            this.fireRange = 400;
            this.idealRange = 220;
            this.fireRate = Math.max(900, 1600 - this.tier * 50);
            this.shotDamage = 8 + this.tier * 2;
            this.color = type === 'trader' ? 0x4a7cff : 0xff6622;
            this.pattern = 'strafe';
            this.abilities = [];
            this.label = type === 'trader' ? 'Trader' : `Fighter T${this.tier}`;
        }

        this.lastFireTime = 0;
        this.portReadyAt = 0;
        this.starboardReadyAt = 0;
        this.preferredBroadside = Math.random() > 0.5 ? 1 : -1; // +1 starboard, -1 port
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;
        this.weavePhase = Math.random() * Math.PI * 2;
        this.dashUntil = 0;
        this.abilityCooldown = 0;
        this.mineCooldown = 0;
        this.sparkTimer = 0;
        this._ramCooldownUntil = 0;

        const tex = type === 'trader' ? 'shipTrader' : 'shipFighter';
        this.sprite = scene.add.image(0, 0, tex);
        if (type !== 'trader') {
            // Keep painted sails; only warmaster/ace get a slight scale bump
            const scale = this.archetypeId === 'warmaster' ? 1.25
                : this.archetypeId === 'ace' ? 1.12
                    : 1;
            this.sprite.setScale(scale);
            if (this.archetypeId === 'warmaster') this.sprite.setTint(0xffccaa);
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

        // Opening thought shortly after appearing
        this.nextBarkAt = scene.time.now + Phaser.Math.Between(400, 1400);
    }

    /**
     * Map combat circumstance → mood.
     * aggressive: hunting / in a duel
     * pensive: patrol, traders, lulls
     * fearful: fleeing when critically hurt
     * upset: just wounded (short burst), or a wreck's last mutter
     */
    resolveMood(time) {
        if (this.disabled) return 'upset';
        if (time < this.upsetUntil) return 'upset';
        if (this.mode === 'flee' || this.hits === 1) return 'fearful';
        if (this.mode === 'attack') return 'aggressive';
        if (this.type === 'trader') return 'pensive';
        return 'pensive';
    }

    maybeBark(time, force = false) {
        if (!this.alive || !this.container?.active) return;
        const mood = this.resolveMood(time);
        const moodChanged = mood !== this.prevMood;
        if (!force && !moodChanged && time < this.nextBarkAt) {
            this.mood = mood;
            return;
        }
        this.mood = mood;
        this.prevMood = mood;
        this.speak(mood);
        // Upset / fearful bark more often; pensive less
        const base = mood === 'upset' ? 2800
            : mood === 'fearful' ? 4000
                : mood === 'aggressive' ? 5500
                    : 7500;
        this.barkCooldownMs = base + Phaser.Math.Between(0, 2500);
        this.nextBarkAt = time + this.barkCooldownMs;
    }

    speak(mood = this.mood) {
        if (!this.scene || !this.container?.active) return;
        // Cap simultaneous barks per ship
        this.barkTexts = this.barkTexts.filter((t) => t.active);
        if (this.barkTexts.length >= 2) {
            const old = this.barkTexts.shift();
            old?.destroy();
        }

        const quote = pickQuote(mood);
        const color = moodColor(mood);
        const side = Math.random() > 0.5 ? 1 : -1;
        const text = this.scene.add.text(
            this.container.x + side * 36,
            this.container.y - 28,
            `"${quote}"`,
            {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '12px',
                color,
                wordWrap: { width: 200 },
                align: side > 0 ? 'left' : 'right',
                stroke: '#061018',
                strokeThickness: 3
            }
        ).setOrigin(side > 0 ? 0 : 1, 1).setDepth(140).setAlpha(0);

        this.barkTexts.push(text);

        this.scene.tweens.add({
            targets: text,
            alpha: 1,
            y: text.y - 10,
            duration: 220,
            ease: 'Quad.out',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: text,
                    alpha: 0,
                    y: text.y - 28,
                    delay: 2200,
                    duration: 700,
                    onComplete: () => {
                        text.destroy();
                        this.barkTexts = this.barkTexts.filter((t) => t !== text && t.active);
                    }
                });
            }
        });
    }

    updateBarkPositions() {
        if (!this.barkTexts.length || !this.container) return;
        for (const t of this.barkTexts) {
            if (!t.active) continue;
            // Drift with the ship a little so quotes stay "beside" them
            const ox = t.originX < 0.5 ? -36 : 36;
            t.x = this.container.x + ox;
        }
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
        this.mood = 'fearful';
        this.prevMood = 'fearful';
        this.speak('fearful');
        this.nextBarkAt = this.scene.time.now + Phaser.Math.Between(3000, 5000);
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
            this.maybeBark(time);
            this.updateBarkPositions();
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
            this.maybeBark(time);
            this.updateBarkPositions();
            return;
        }

        if (this.mode === 'flee') {
            this.updateFlee();
            this.maybeBark(time);
            this.updateBarkPositions();
            return;
        }

        this.moveToward(this.targetX, this.targetY, this.speed, 50, true);
        this.maybeBark(time);
        this.updateBarkPositions();
    }

    updateDuel(time, delta, player) {
        const px = player.getX();
        const py = player.getY();
        const dx = px - this.container.x;
        const dy = py - this.container.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const angleToPlayer = Math.atan2(dy, dx);

        this.strafeTimer += delta;
        this.weavePhase += delta * 0.003;

        // Naval doctrine: keep the foe on a broadside (ship nose perpendicular to target)
        const broadsideSign = this.preferredBroadside; // +1 = present starboard
        const desiredFacing = angleToPlayer - broadsideSign * (Math.PI / 2);
        const currentFacing = this.container.rotation;
        const nextFacing = Phaser.Math.Angle.RotateTo(currentFacing, desiredFacing, 1.8 * (delta / 1000));
        this.container.setRotation(nextFacing);

        // Circle / hold range while sliding along the firing line (passing engagement)
        let vx = 0;
        let vy = 0;
        const alongX = -Math.sin(angleToPlayer); // tangent
        const alongY = Math.cos(angleToPlayer);

        if (this.pattern === 'straight') {
            // Scout: slow pass — approach then slide past on one beam
            if (dist > this.idealRange + 60) {
                vx = (dx / dist) * this.speed * 0.85;
                vy = (dy / dist) * this.speed * 0.85;
            } else {
                vx = alongX * this.strafeDir * this.speed * 0.9;
                vy = alongY * this.strafeDir * this.speed * 0.9;
                if (dist < this.idealRange - 40) {
                    vx -= (dx / dist) * this.speed * 0.35;
                    vy -= (dy / dist) * this.speed * 0.35;
                }
            }
        } else if (this.pattern === 'weave' || this.pattern === 'flank') {
            const weave = Math.sin(this.weavePhase) * 0.55;
            vx = alongX * this.strafeDir * this.speed * (0.95 + weave);
            vy = alongY * this.strafeDir * this.speed * (0.95 + weave);
            if (dist > this.idealRange + 50) {
                vx += (dx / dist) * this.speed * 0.5;
                vy += (dy / dist) * this.speed * 0.5;
            } else if (dist < this.idealRange - 50) {
                vx -= (dx / dist) * this.speed * 0.55;
                vy -= (dy / dist) * this.speed * 0.55;
            }
            if (this.pattern === 'flank' && this.strafeTimer > 2800) {
                this.preferredBroadside *= -1;
                this.strafeDir *= -1;
                this.strafeTimer = 0;
            }
        } else if (this.pattern === 'burst_dash' || this.pattern === 'warmaster') {
            // Ace: switch beams mid-pass, occasional dash along the line
            if (time < this.dashUntil) {
                vx = alongX * this.strafeDir * this.speed * 1.7;
                vy = alongY * this.strafeDir * this.speed * 1.7;
            } else {
                vx = alongX * this.strafeDir * this.speed;
                vy = alongY * this.strafeDir * this.speed;
                if (dist > this.idealRange + 40) {
                    vx += (dx / dist) * this.speed * 0.45;
                    vy += (dy / dist) * this.speed * 0.45;
                } else if (dist < this.idealRange - 55) {
                    vx -= (dx / dist) * this.speed * 0.5;
                    vy -= (dy / dist) * this.speed * 0.5;
                }
                if (this.abilities.includes('dash') && this.abilityCooldown <= 0 && dist < 360) {
                    this.dashUntil = time + 320;
                    this.abilityCooldown = 2800;
                    this.preferredBroadside *= -1;
                    this.strafeDir *= -1;
                }
            }
            if (this.strafeTimer > 2000) {
                this.preferredBroadside *= -1;
                this.strafeTimer = 0;
            }
        } else {
            // Raider default: classic circling broadside pass
            vx = alongX * this.strafeDir * this.speed;
            vy = alongY * this.strafeDir * this.speed;
            if (dist > this.idealRange + 45) {
                vx += (dx / dist) * this.speed * 0.55;
                vy += (dy / dist) * this.speed * 0.55;
            } else if (dist < this.idealRange - 55) {
                vx -= (dx / dist) * this.speed * 0.5;
                vy -= (dy / dist) * this.speed * 0.5;
            }
            if (this.strafeTimer > 3200) {
                this.strafeDir *= -1;
                this.preferredBroadside *= -1;
                this.strafeTimer = 0;
            }
        }

        // Priority: juke player balls on a collision course
        const dodge = this.computeShotDodge();
        if (dodge) {
            vx = vx * 0.2 + dodge.x;
            vy = vy * 0.2 + dodge.y;
            this.body.setMaxVelocity(this.speed * 1.55);
            // Flip beam when a shot is close — break the player's lead
            if (dodge.urgent && this.strafeTimer > 400) {
                this.strafeDir *= -1;
                this.preferredBroadside *= -1;
                this.strafeTimer = 0;
            }
        } else {
            this.body.setMaxVelocity(this.speed * 1.15);
        }

        this.body.setVelocity(vx, vy);

        if (this.abilities.includes('mine') && this.mineCooldown <= 0 && dist < 380) {
            this.mineCooldown = 4800;
            if (this.scene.spawnEnemyMine) {
                this.scene.spawnEnemyMine(this.container.x, this.container.y);
            }
        }

        // Single slow ball when the foe is roughly on a beam (duel / lead / juke)
        this.tryNavalShot(time, player, angleToPlayer, dist);
    }

    /**
     * Scan player cannonballs and return a strong lateral dodge if one will hit.
     */
    computeShotDodge() {
        const shots = this.scene?.projectiles;
        if (!shots || !shots.length || !this.body) return null;

        const sx = this.container.x;
        const sy = this.container.y;
        const svx = this.body.velocity.x;
        const svy = this.body.velocity.y;
        const hitRad = 48;

        let best = null;
        let bestT = Infinity;

        for (let i = 0; i < shots.length; i++) {
            const proj = shots[i];
            if (!proj || !proj.active || proj.friendly === false) continue;
            const pvx = proj.body?.velocity?.x;
            const pvy = proj.body?.velocity?.y;
            if (pvx == null || pvy == null) continue;

            const relX = sx - proj.x;
            const relY = sy - proj.y;
            const distNow = Math.hypot(relX, relY);
            if (distNow > 520) continue;

            const relVx = svx - pvx;
            const relVy = svy - pvy;
            const rv2 = relVx * relVx + relVy * relVy;
            if (rv2 < 40) continue;

            // Time to closest approach
            let t = -(relX * relVx + relY * relVy) / rv2;
            if (t < 0 || t > 2.0) continue;

            const missX = relX + relVx * t;
            const missY = relY + relVy * t;
            const miss = Math.hypot(missX, missY);
            if (miss > hitRad) continue;

            if (t < bestT) {
                bestT = t;
                const plen = Math.hypot(pvx, pvy) || 1;
                // Perpendicular to the shot — pick the side already slightly clear
                let perpX = -pvy / plen;
                let perpY = pvx / plen;
                const sideDot = relX * perpX + relY * perpY;
                const sign = sideDot >= 0 ? 1 : -1;
                const urgency = 1 - t / 2.0;
                const strength = this.speed * (1.25 + urgency * 1.6);
                best = {
                    x: perpX * sign * strength,
                    y: perpY * sign * strength,
                    urgent: t < 0.55,
                    t
                };
            }
        }

        return best;
    }

    tryNavalShot(time, player, angleToPlayer, dist) {
        if (dist > this.fireRange) return;
        if (time < this.lastFireTime + this.fireRate) return;

        const facing = this.container.rotation;
        const localAngle = Phaser.Math.Angle.Wrap(angleToPlayer - facing);
        const starboardErr = Math.abs(Phaser.Math.Angle.Wrap(localAngle - Math.PI / 2));
        const portErr = Math.abs(Phaser.Math.Angle.Wrap(localAngle + Math.PI / 2));
        // Wider arc than old volleys — one ball, easier to present
        const arc = 0.85;
        if (starboardErr > arc && portErr > arc) return;

        this.lastFireTime = time;
        const side = starboardErr <= portErr ? 'starboard' : 'port';
        if (side === 'starboard') this.starboardReadyAt = time + this.fireRate;
        else this.portReadyAt = time + this.fireRate;

        this.scene.spawnEnemyProjectile(this, {
            side,
            towardPlayer: true,
            speed: 105
        });

        // Battle cry when loosing a ball
        if (Math.random() < 0.45) {
            this.mood = 'aggressive';
            this.prevMood = 'aggressive';
            this.speak('aggressive');
            this.nextBarkAt = time + Phaser.Math.Between(3500, 6000);
        }
    }

    updateFlee() {
        const reached = this.moveToward(this.targetX, this.targetY, this.fleeSpeed, 80, true);
        if (reached) this.pickNewTarget();
        // Juke incoming shot even while running
        const dodge = this.computeShotDodge();
        if (dodge && this.body) {
            this.body.velocity.x = this.body.velocity.x * 0.3 + dodge.x;
            this.body.velocity.y = this.body.velocity.y * 0.3 + dodge.y;
            this.body.setMaxVelocity(this.fleeSpeed * 1.35);
        }
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

        const now = this.scene.time.now;
        this.upsetUntil = now + 2200;
        this.mood = 'upset';
        this.prevMood = 'upset';
        this.speak('upset');
        this.nextBarkAt = now + Phaser.Math.Between(2400, 4000);

        if (this.hits <= 0) {
            this.disable();
            return 'disabled';
        }
        if (this.hits === 1) {
            this.mode = 'flee';
            this.body.setMaxVelocity(this.fleeSpeed);
            this.notifyFlee();
            // Fear overrides upset on the next bark beat
            this.scene.time.delayedCall(500, () => {
                if (this.alive && !this.disabled && this.mode === 'flee') {
                    this.speak('fearful');
                    this.mood = 'fearful';
                    this.prevMood = 'fearful';
                }
            });
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
        this.speak('upset');
        this.nextBarkAt = this.scene.time.now + 5000;
        if (this.scene.onEnemyDisabled) this.scene.onEnemyDisabled(this);
    }

    destroy() {
        this.alive = false;
        for (const t of this.barkTexts) {
            try { t.destroy(); } catch (_) { /* ignore */ }
        }
        this.barkTexts = [];
        if (this.container) this.container.destroy();
    }

    getX() { return this.container.x; }
    getY() { return this.container.y; }
    getRotation() { return this.container.rotation; }
    isCombatTarget() { return this.alive && !this.disabled; }
}

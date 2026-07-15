import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons.js';

const UPGRADE_DEFS = {
    engines: {
        label: 'Engines',
        maxLevel: 5,
        costs: [200, 400, 700, 1100, 1600],
        describe: (level) => `Thrust +${level * 15}%`
    },
    shields: {
        label: 'Shields',
        maxLevel: 5,
        costs: [180, 360, 650, 1000, 1500],
        describe: (level) => `Max shields +${level * 20}, regen +${level * 2}`
    },
    hull: {
        label: 'Hull',
        maxLevel: 5,
        costs: [180, 360, 650, 1000, 1500],
        describe: (level) => `Max hull +${level * 20}`
    },
    weapons: {
        label: 'Weapons',
        maxLevel: 5,
        costs: [220, 450, 800, 1200, 1800],
        describe: (level) => `Station fire-rate tune +${level * 8}%`
    },
    cargo: {
        label: 'Cargo Hold',
        maxLevel: 5,
        costs: [150, 300, 550, 850, 1300],
        describe: (level) => `Capacity +${level * 8}`
    }
};

export default class Player {
    constructor(scene, x, y, saved = null) {
        this.scene = scene;

        // Sprite texture (baked once) — Graphics.clear every frame was a Safari stutter source
        this.sprite = scene.add.image(0, 0, 'shipPlayer');
        this.container = scene.add.container(x, y, [this.sprite]);
        this.container.setDepth(100);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(16, -16, -16);
        // Dogfight handling: snappy lateral, light drag, readable top speed
        this.body.setDrag(18);
        this.body.setMaxVelocity(280);
        this.body.setCollideWorldBounds(true);
        this.body.useDamping = false;

        this.rotation = 0;
        this.rotationSpeed = 0;
        // Mouse/stick aim turns the nose — still has a little inertia so it isn't twitchy
        this.maxRotationSpeed = 9.5;
        this.aimTurnRate = 10.5;
        this.keyboardTurnRate = 4.2;

        this.thrustLerp = 10;
        this.strafeLerp = 14;

        this.baseMainThrust = 320;
        this.baseReverseThrust = 280;
        this.baseLateralThrust = 340; // strafe should be the dodge verb
        this.baseMaxVelocity = 280;
        this.baseMaxShields = 80;
        this.baseMaxHull = 80;
        this.baseShieldRegen = 6;
        this.baseWeaponDamage = 1;
        this.baseFireRate = 480;
        this.baseCargoCapacity = 20;

        this.boostCooldownMs = 700;
        this.boostImpulse = 420;
        this.lastBoostTime = -9999;
        this.boostUntil = 0;

        this.shieldRegenDelay = 2400;
        this.lastHitTime = 0;
        this._regenAccum = 0;

        this.credits = saved?.credits ?? 500;
        this.cargo = saved?.cargo
            ? { ...saved.cargo }
            : { food: 0, ore: 0, tech: 0 };
        this.upgrades = saved?.upgrades
            ? { ...saved.upgrades }
            : { engines: 0, shields: 0, hull: 0, weapons: 0, cargo: 0 };
        this.kills = saved?.kills ?? 0;
        this.weaponId = saved?.weaponId || 'cannon';
        this.harvestIndex = saved?.harvestIndex ?? 0;
        this.bonusShields = saved?.bonusShields ?? 0;
        this.bonusHull = saved?.bonusHull ?? 0;

        this.applyUpgrades(false);
        this.shields = saved?.shields ?? this.maxShields;
        this.hull = saved?.hull ?? this.maxHull;
    }

    static getUpgradeDefs() {
        return UPGRADE_DEFS;
    }

    getWeapon() {
        return WEAPONS[this.weaponId] || WEAPONS.cannon;
    }

    setWeapon(weaponId) {
        if (!WEAPONS[weaponId]) return false;
        this.weaponId = weaponId;
        this.applyUpgrades(false);
        return true;
    }

    applyUpgrades(refill = false) {
        const e = this.upgrades.engines;
        const s = this.upgrades.shields;
        const h = this.upgrades.hull;
        const w = this.upgrades.weapons;
        const c = this.upgrades.cargo;
        const kit = this.getWeapon();

        this.mainThrust = this.baseMainThrust * (1 + e * 0.15);
        this.reverseThrust = this.baseReverseThrust * (1 + e * 0.12);
        this.lateralThrust = this.baseLateralThrust * (1 + e * 0.12);
        this.maxSpeed = this.baseMaxVelocity * (1 + e * 0.08);
        this.body.setMaxVelocity(this.maxSpeed);

        this.maxShields = this.baseMaxShields + s * 20 + this.bonusShields;
        this.shieldRegen = this.baseShieldRegen + s * 2;
        this.maxHull = this.baseMaxHull + h * 20 + this.bonusHull;
        this.weaponDamage = this.baseWeaponDamage;
        this.fireRate = Math.max(110, Math.round(kit.fireRate * (1 - w * 0.06)));
        this.cargoCapacity = this.baseCargoCapacity + c * 8;

        if (refill) {
            this.shields = this.maxShields;
            this.hull = this.maxHull;
        } else {
            this.shields = Math.min(this.shields ?? this.maxShields, this.maxShields);
            this.hull = Math.min(this.hull ?? this.maxHull, this.maxHull);
        }
    }

    grantHarvestReward(reward) {
        if (!reward) return null;
        if (reward.kind === 'weapon' && reward.weaponId) {
            this.setWeapon(reward.weaponId);
        } else if (reward.kind === 'shields') {
            this.bonusShields += reward.amount || 0;
            this.applyUpgrades(false);
            this.shields = Math.min(this.maxShields, this.shields + (reward.amount || 0));
        } else if (reward.kind === 'armor') {
            this.bonusHull += reward.amount || 0;
            this.applyUpgrades(false);
            this.hull = Math.min(this.maxHull, this.hull + (reward.amount || 0));
        }
        this.harvestIndex += 1;
        return reward;
    }

    getUpgradeLevel(key) {
        return this.upgrades[key] ?? 0;
    }

    getUpgradeCost(key) {
        const def = UPGRADE_DEFS[key];
        if (!def) return null;
        const level = this.getUpgradeLevel(key);
        if (level >= def.maxLevel) return null;
        return def.costs[level];
    }

    canAffordUpgrade(key) {
        const cost = this.getUpgradeCost(key);
        return cost !== null && this.credits >= cost;
    }

    buyUpgrade(key) {
        const def = UPGRADE_DEFS[key];
        if (!def) return { ok: false, message: 'Unknown upgrade.' };

        const level = this.getUpgradeLevel(key);
        if (level >= def.maxLevel) {
            return { ok: false, message: `${def.label} already maxed.` };
        }

        const cost = def.costs[level];
        if (this.credits < cost) {
            return { ok: false, message: 'Not enough credits.' };
        }

        this.credits -= cost;
        this.upgrades[key] = level + 1;
        this.applyUpgrades(false);
        if (key === 'shields') this.shields = Math.min(this.maxShields, this.shields + 20);
        if (key === 'hull') this.hull = Math.min(this.maxHull, this.hull + 20);

        return {
            ok: true,
            message: `${def.label} → Lv ${this.upgrades[key]} (−${cost}c)`
        };
    }

    getSnapshot() {
        return {
            credits: this.credits,
            cargo: { ...this.cargo },
            upgrades: { ...this.upgrades },
            kills: this.kills,
            shields: this.shields,
            hull: this.hull,
            weaponId: this.weaponId,
            harvestIndex: this.harvestIndex,
            bonusShields: this.bonusShields,
            bonusHull: this.bonusHull
        };
    }

    /**
     * Dogfight controls:
     * - Aim with mouse / right stick / right virtual stick (nose follows aim)
     * - WASD / left stick move relative to nose (A/D = strafe dodge)
     * - Shift / pad boost = short lateral burst
     */
    update(delta, leftJoystick, rightJoystick, keys = null, pad = null, aim = null) {
        const dt = Math.min(0.05, delta / 1000);
        const now = this.scene.time.now;

        // --- Aim / turn ----------------------------------------------------
        let desiredAngle = null;
        if (aim && aim.hasAim) {
            desiredAngle = aim.angle;
        } else if (rightJoystick && rightJoystick.isActive() && rightJoystick.getForce() > 0.25) {
            // Virtual stick angle is screen math (0=right); convert to ship-forward (0=up)
            desiredAngle = rightJoystick.getAngle() + Math.PI / 2;
        } else if (pad && pad.hasAim) {
            desiredAngle = pad.aimAngle;
        }

        if (desiredAngle != null) {
            this.rotation = Phaser.Math.Angle.RotateTo(
                this.rotation,
                desiredAngle,
                this.aimTurnRate * dt
            );
            this.rotationSpeed = 0;
        } else {
            // Keyboard-only fallback when mouse/stick isn't aiming
            let rotInput = 0;
            if (keys?.Q?.isDown || keys?.LEFT?.isDown) rotInput -= 1;
            if (keys?.R?.isDown || keys?.RIGHT?.isDown) rotInput += 1;
            if (Math.abs(rotInput) > 0.01) {
                this.rotation += rotInput * this.keyboardTurnRate * dt;
            }
        }
        this.container.setRotation(this.rotation);

        // --- Move (ship-relative) ------------------------------------------
        let forwardInput = 0;
        let lateralInput = 0;

        if (keys) {
            if (keys.W.isDown) forwardInput += 1;
            if (keys.S.isDown) forwardInput -= 1;
            // A/D are STRAFE now — the dodge verb
            if (keys.A.isDown) lateralInput -= 1;
            if (keys.D.isDown) lateralInput += 1;
            // Keep J/K as aliases so old muscle memory still works
            if (keys.J?.isDown) lateralInput += 1;
            if (keys.K?.isDown) lateralInput -= 1;
        }

        if (pad) {
            if (Math.abs(pad.forward) > 0.01) forwardInput += pad.forward;
            if (Math.abs(pad.lateral) > 0.01) lateralInput += pad.lateral;
        }

        // Left virtual stick = move relative to current facing
        if (leftJoystick && leftJoystick.isActive()) {
            const force = leftJoystick.getForce();
            const angle = leftJoystick.getAngle();
            // Stick up (−Y screen) = forward
            forwardInput += -Math.sin(angle) * force;
            lateralInput += Math.cos(angle) * force;
        }

        forwardInput = Phaser.Math.Clamp(forwardInput, -1, 1);
        lateralInput = Phaser.Math.Clamp(lateralInput, -1, 1);

        const shipForwardX = Math.sin(this.rotation);
        const shipForwardY = -Math.cos(this.rotation);
        const shipRightX = Math.cos(this.rotation);
        const shipRightY = Math.sin(this.rotation);

        let forwardSpeed = 0;
        if (forwardInput > 0) forwardSpeed = forwardInput * this.mainThrust * 0.62;
        else if (forwardInput < 0) forwardSpeed = forwardInput * this.reverseThrust * 0.55;
        // Lateral gets more authority — ducking shots is the fantasy
        const lateralSpeed = lateralInput * this.lateralThrust * 0.72;

        const thrusting = Math.abs(forwardInput) > 0.01 || Math.abs(lateralInput) > 0.01;
        const targetVx = shipForwardX * forwardSpeed + shipRightX * lateralSpeed;
        const targetVy = shipForwardY * forwardSpeed + shipRightY * lateralSpeed;

        this.body.setAcceleration(0, 0);

        if (thrusting) {
            const rate = Math.abs(lateralInput) > Math.abs(forwardInput) ? this.strafeLerp : this.thrustLerp;
            const lerpF = 1 - Math.exp(-rate * dt);
            this.body.velocity.x += (targetVx - this.body.velocity.x) * lerpF;
            this.body.velocity.y += (targetVy - this.body.velocity.y) * lerpF;
        }

        // --- Dodge boost (Shift / pad LB) ----------------------------------
        const wantBoost = (keys && keys.SHIFT?.isDown) || (pad && pad.boost);
        if (wantBoost && now - this.lastBoostTime > this.boostCooldownMs) {
            let side = lateralInput !== 0 ? Math.sign(lateralInput) : this._lastDodgeSide || 1;
            if (lateralInput === 0) this._lastDodgeSide = -side;
            else this._lastDodgeSide = side;

            this.body.velocity.x += shipRightX * side * this.boostImpulse;
            this.body.velocity.y += shipRightY * side * this.boostImpulse;
            // Keep a bit of forward momentum so boost feels like a jink, not a teleport
            this.body.velocity.x += shipForwardX * forwardInput * 80;
            this.body.velocity.y += shipForwardY * forwardInput * 80;

            this.lastBoostTime = now;
            this.boostUntil = now + 140;
            if (this.scene.spawnHitSpark) {
                this.scene.spawnHitSpark(this.getX(), this.getY());
            }
        }

        if (now < this.boostUntil) {
            this.container.setAlpha(0.75);
        } else if (this.container.alpha < 1 && this.container.alpha >= 0.7) {
            this.container.setAlpha(1);
        }

        const maxSpd = now < this.boostUntil ? this.maxSpeed * 1.35 : this.maxSpeed;
        const spd = Math.hypot(this.body.velocity.x, this.body.velocity.y);
        if (spd > maxSpd) {
            const s = maxSpd / spd;
            this.body.velocity.x *= s;
            this.body.velocity.y *= s;
        }

        this.regenShields(delta);
    }

    canBoost() {
        return this.scene.time.now - this.lastBoostTime > this.boostCooldownMs;
    }

    regenShields(delta) {
        if (this.shields >= this.maxShields) return;
        if (Date.now() - this.lastHitTime < this.shieldRegenDelay) return;
        this._regenAccum += this.shieldRegen * (delta / 1000);
        if (this._regenAccum >= 0.25) {
            this.shields = Math.min(this.maxShields, this.shields + this._regenAccum);
            this._regenAccum = 0;
        }
    }

    takeDamage(amount) {
        this.lastHitTime = Date.now();
        let remaining = amount;
        if (this.shields > 0) {
            const absorbed = Math.min(this.shields, remaining);
            this.shields -= absorbed;
            remaining -= absorbed;
        }
        if (remaining > 0) this.hull -= remaining;
        this.flashHit();
        return this.hull <= 0;
    }

    flashHit() {
        this.container.setAlpha(0.4);
        this.scene.time.delayedCall(80, () => {
            if (this.container && this.container.active) this.container.setAlpha(1);
        });
    }

    repair(costPerPoint = 2) {
        const missing = Math.ceil(this.maxHull - this.hull + this.maxShields - this.shields);
        if (missing <= 0) return { repaired: false, cost: 0, message: 'Ship already at full integrity.' };
        const affordable = Math.floor(this.credits / costPerPoint);
        const points = Math.min(missing, affordable);
        if (points <= 0) return { repaired: false, cost: 0, message: 'Not enough credits.' };

        let remaining = points;
        const shieldFill = Math.min(this.maxShields - this.shields, remaining);
        this.shields += shieldFill;
        remaining -= shieldFill;
        this.hull = Math.min(this.maxHull, this.hull + remaining);
        const cost = points * costPerPoint;
        this.credits -= cost;
        return { repaired: true, cost, message: `Repaired for ${cost} credits.` };
    }

    getCargoUsed() {
        return this.cargo.food + this.cargo.ore + this.cargo.tech;
    }

    getX() { return this.container.x; }
    getY() { return this.container.y; }
    getRotation() { return this.rotation; }
    getVelocity() {
        return { x: this.body.velocity.x, y: this.body.velocity.y };
    }
    getSpeed() {
        return Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
    }
    destroy() { this.container.destroy(); }
}

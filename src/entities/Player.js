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

        this.sprite = scene.add.graphics();
        this.drawShip();

        this.container = scene.add.container(x, y, [this.sprite]);
        this.container.setDepth(100);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(16, -16, -16);
        // Clunky starter: heavy drag, modest top speed
        this.body.setDrag(55);
        this.body.setMaxVelocity(200);
        this.body.setCollideWorldBounds(true);

        this.rotation = 0;
        this.rotationSpeed = 0;
        // Slow turn — ship should feel like a freighter at first
        this.maxRotationSpeed = 3.0;
        this.rotationAccel = 0.55;
        this.rotationDrag = 0.82;
        this.turnBleed = 0.62;

        this.baseMainThrust = 260;
        this.baseReverseThrust = 300;
        this.baseLateralThrust = 220;
        this.baseMaxVelocity = 200;
        this.baseMaxShields = 80;
        this.baseMaxHull = 80;
        this.baseShieldRegen = 6;
        this.baseWeaponDamage = 1;
        this.baseFireRate = 480;
        this.baseCargoCapacity = 20;

        this.shieldRegenDelay = 2400;
        this.lastHitTime = 0;

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
        this.body.setMaxVelocity(this.baseMaxVelocity * (1 + e * 0.08));

        this.maxShields = this.baseMaxShields + s * 20 + this.bonusShields;
        this.shieldRegen = this.baseShieldRegen + s * 2;
        this.maxHull = this.baseMaxHull + h * 20 + this.bonusHull;
        this.weaponDamage = this.baseWeaponDamage;
        // Kit defines the feel; station weapons upgrade only nudges cadence
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

    drawShip() {
        this.sprite.clear();
        this.sprite.fillStyle(0x44ff88, 1);
        this.sprite.fillTriangle(0, -22, -14, 16, 14, 16);
        this.sprite.fillStyle(0xffffff, 1);
        this.sprite.fillCircle(0, -4, 4);
        this.sprite.fillStyle(0x66aaff, 0.95);
        this.sprite.fillTriangle(-6, 16, 6, 16, 0, 26);
        this.sprite.lineStyle(2, 0x0a2a14, 1);
        this.sprite.strokeTriangle(0, -22, -14, 16, 14, 16);
    }

    update(delta, leftJoystick, rightJoystick, keys = null, pad = null) {
        const dt = delta / 1000;

        let rotInput = 0;
        if (keys) {
            if (keys.A.isDown) rotInput -= 1;
            if (keys.D.isDown) rotInput += 1;
        }
        if (pad && Math.abs(pad.rot) > 0.01) {
            rotInput += pad.rot;
        }
        if (leftJoystick && leftJoystick.isActive()) {
            rotInput += Math.cos(leftJoystick.getAngle()) * leftJoystick.getForce();
        }

        if (Math.abs(rotInput) > 0.01) {
            this.rotationSpeed = Phaser.Math.Linear(
                this.rotationSpeed,
                Phaser.Math.Clamp(rotInput, -1, 1) * this.maxRotationSpeed,
                Math.min(1, this.rotationAccel * 10 * dt)
            );
        } else {
            this.rotationSpeed *= Math.pow(this.rotationDrag, dt * 60);
            if (Math.abs(this.rotationSpeed) < 0.02) this.rotationSpeed = 0;
        }

        this.rotation += this.rotationSpeed * dt;
        this.container.setRotation(this.rotation);

        const turnAmount = Math.min(1, Math.abs(this.rotationSpeed) / this.maxRotationSpeed);
        if (turnAmount > 0.15) {
            const bleed = 1 - turnAmount * this.turnBleed * dt * 3.2;
            this.body.velocity.x *= bleed;
            this.body.velocity.y *= bleed;
        }

        let forwardInput = 0;
        let lateralInput = 0;

        if (keys) {
            if (keys.W.isDown) forwardInput += 1;
            if (keys.S.isDown) forwardInput -= 1;
            // J = starboard (right), K = port (left) — swapped from prior mapping
            if (keys.J.isDown) lateralInput += 1;
            if (keys.K.isDown) lateralInput -= 1;
        }

        if (pad) {
            if (Math.abs(pad.forward) > 0.01) forwardInput += pad.forward;
            if (Math.abs(pad.lateral) > 0.01) lateralInput += pad.lateral;
        }

        if (rightJoystick && rightJoystick.isActive()) {
            const force = rightJoystick.getForce();
            const angle = rightJoystick.getAngle();
            forwardInput += -Math.sin(angle) * force;
            lateralInput += Math.cos(angle) * force;
        }

        forwardInput = Phaser.Math.Clamp(forwardInput, -1, 1);
        lateralInput = Phaser.Math.Clamp(lateralInput, -1, 1);

        const shipForwardX = Math.sin(this.rotation);
        const shipForwardY = -Math.cos(this.rotation);
        const shipRightX = Math.cos(this.rotation);
        const shipRightY = Math.sin(this.rotation);

        let thrustMagnitude = 0;
        if (forwardInput > 0) thrustMagnitude = forwardInput * this.mainThrust;
        else if (forwardInput < 0) thrustMagnitude = forwardInput * this.reverseThrust;

        if (Math.abs(forwardInput) > 0.01 || Math.abs(lateralInput) > 0.01) {
            this.body.setAcceleration(
                shipForwardX * thrustMagnitude + shipRightX * lateralInput * this.lateralThrust,
                shipForwardY * thrustMagnitude + shipRightY * lateralInput * this.lateralThrust
            );
        } else {
            this.body.setAcceleration(0, 0);
        }

        this.regenShields(delta);
    }

    regenShields(delta) {
        if (this.shields >= this.maxShields) return;
        if (Date.now() - this.lastHitTime < this.shieldRegenDelay) return;
        this.shields = Math.min(this.maxShields, this.shields + this.shieldRegen * (delta / 1000));
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

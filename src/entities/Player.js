import Phaser from 'phaser';

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
        describe: (level) => `Extra hit chance / fire rate +${level * 8}%`
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
        // Mild drag = settle into fights instead of coasting past
        this.body.setDrag(40);
        this.body.setMaxVelocity(260);
        this.body.setCollideWorldBounds(true);

        this.rotation = 0;
        this.rotationSpeed = 0;
        this.maxRotationSpeed = 7.2;
        this.rotationAccel = 0.85;
        this.rotationDrag = 0.78;
        this.turnBleed = 0.55;

        // Naval-tactical base stats (upgrades scale from these)
        this.baseMainThrust = 380;
        this.baseReverseThrust = 420;
        this.baseLateralThrust = 360;
        this.baseMaxVelocity = 260;
        this.baseMaxShields = 100;
        this.baseMaxHull = 100;
        this.baseShieldRegen = 10;
        this.baseWeaponDamage = 1; // hit-based combat
        this.baseFireRate = 180;
        this.baseCargoCapacity = 20;

        this.shieldRegenDelay = 2200;
        this.lastHitTime = 0;

        this.credits = saved?.credits ?? 500;
        this.cargo = saved?.cargo
            ? { ...saved.cargo }
            : { food: 0, ore: 0, tech: 0 };
        this.upgrades = saved?.upgrades
            ? { ...saved.upgrades }
            : { engines: 0, shields: 0, hull: 0, weapons: 0, cargo: 0 };
        this.kills = saved?.kills ?? 0;

        this.applyUpgrades(false);
        this.shields = saved?.shields ?? this.maxShields;
        this.hull = saved?.hull ?? this.maxHull;
    }

    static getUpgradeDefs() {
        return UPGRADE_DEFS;
    }

    applyUpgrades(refill = false) {
        const e = this.upgrades.engines;
        const s = this.upgrades.shields;
        const h = this.upgrades.hull;
        const w = this.upgrades.weapons;
        const c = this.upgrades.cargo;

        this.mainThrust = this.baseMainThrust * (1 + e * 0.15);
        this.reverseThrust = this.baseReverseThrust * (1 + e * 0.12);
        this.lateralThrust = this.baseLateralThrust * (1 + e * 0.12);
        this.body.setMaxVelocity(this.baseMaxVelocity * (1 + e * 0.08));

        this.maxShields = this.baseMaxShields + s * 20;
        this.shieldRegen = this.baseShieldRegen + s * 2;
        this.maxHull = this.baseMaxHull + h * 20;
        this.weaponDamage = this.baseWeaponDamage; // still 1 hit; upgrades mainly affect fire rate
        this.fireRate = Math.max(90, Math.round(this.baseFireRate * (1 - w * 0.08)));
        this.cargoCapacity = this.baseCargoCapacity + c * 8;

        if (refill) {
            this.shields = this.maxShields;
            this.hull = this.maxHull;
        } else {
            this.shields = Math.min(this.shields ?? this.maxShields, this.maxShields);
            this.hull = Math.min(this.hull ?? this.maxHull, this.maxHull);
        }
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
            hull: this.hull
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
            if (keys.K.isDown) lateralInput += 1;
            if (keys.J.isDown) lateralInput -= 1;
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

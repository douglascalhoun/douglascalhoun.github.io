import Phaser from 'phaser';
import { WEAPONS, WEAPON_ALIASES } from '../data/weapons.js';

const UPGRADE_DEFS = {
    engines: {
        label: 'Rigging',
        maxLevel: 5,
        costs: [200, 400, 700, 1100, 1600],
        describe: (level) => `Sail thrust +${level * 15}%`
    },
    shields: {
        label: 'Aether Ward',
        maxLevel: 5,
        costs: [180, 360, 650, 1000, 1500],
        describe: (level) => `Ward +${level * 20}, mend +${level * 2}`
    },
    hull: {
        label: 'Hull',
        maxLevel: 5,
        costs: [180, 360, 650, 1000, 1500],
        describe: (level) => `Timber hull +${level * 20}`
    },
    weapons: {
        label: 'Gun Crew',
        maxLevel: 5,
        costs: [220, 450, 800, 1200, 1800],
        describe: (level) => {
            const extra = Math.floor(level / 2);
            return extra > 0
                ? `+${extra} ball${extra === 1 ? '' : 's'}/volley · reload −${level * 6}%`
                : `Reload −${level * 6}%`;
        }
    },
    cargo: {
        label: 'Hold',
        maxLevel: 5,
        costs: [150, 300, 550, 850, 1300],
        describe: (level) => `Hold capacity +${level * 8}`
    }
};

export default class Player {
    constructor(scene, x, y, saved = null) {
        this.scene = scene;

        this.sprite = scene.add.image(0, 0, 'shipPlayer');
        this.sprite.setScale(1.05);
        this.container = scene.add.container(x, y, [this.sprite]);
        this.container.setDepth(100);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(16, -16, -16);
        // Heavy sailing hull: slow gather way, deliberate coast
        this.body.setDrag(9);
        this.body.setMaxVelocity(115);
        this.body.setCollideWorldBounds(true);
        this.body.useDamping = false;

        this.rotation = 0;
        // Escape Velocity helm — slower turn for tactical positioning
        this.hullTurnRate = 1.65;
        this.aimTurnRate = 1.65;
        this.keyboardTurnRate = 1.65;

        this.thrustLerp = 1.05;
        this.strafeLerp = 0.35;

        this.baseMainThrust = 125;
        this.baseReverseThrust = 72;
        this.baseLateralThrust = 22;
        this.baseMaxVelocity = 115;
        this.baseMaxShields = 80;
        this.baseMaxHull = 80;
        this.baseShieldRegen = 6;
        this.baseWeaponDamage = 1;
        this.baseCargoCapacity = 20;

        this.boostCooldownMs = 1800;
        this.boostImpulse = 110;
        this.ramCooldownUntil = 0;
        this.lastBoostTime = -9999;
        this.boostUntil = 0;
        this._lastDodgeSide = 1;

        // Compat fields — fire/sail = ship.rotation (EV Nova style)
        this.reticleAngle = 0;
        this.gunAim = 0;
        this.desiredHelm = 0;
        this.cursorDist = 180;
        this.cursorX = x;
        this.cursorY = y;
        this.intendForward = 0;
        this.intendLateral = 0;
        this.intendTurn = 0;
        this._nextBattery = 'starboard';

        this.portReadyAt = 0;
        this.starboardReadyAt = 0;

        this.shieldRegenDelay = 2400;
        this.lastHitTime = 0;
        this._regenAccum = 0;

        this.credits = saved?.credits ?? 500;
        this.cargo = saved?.cargo ? { ...saved.cargo } : { food: 0, ore: 0, tech: 0 };
        this.upgrades = saved?.upgrades
            ? { ...saved.upgrades }
            : { engines: 0, shields: 0, hull: 0, weapons: 0, cargo: 0 };
        this.kills = saved?.kills ?? 0;
        this.weaponId = this.resolveWeaponId(saved?.weaponId || 'carronade');
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

    resolveWeaponId(id) {
        if (WEAPONS[id]) return id;
        const aliased = WEAPON_ALIASES[id];
        if (aliased && WEAPONS[aliased]) return aliased;
        return 'carronade';
    }

    getWeapon() {
        return WEAPONS[this.resolveWeaponId(this.weaponId)] || WEAPONS.carronade;
    }

    setWeapon(weaponId) {
        const id = this.resolveWeaponId(weaponId);
        if (!WEAPONS[id]) return false;
        this.weaponId = id;
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
        this.reloadMs = Math.max(850, Math.round((kit.reloadMs || 2400) * (1 - w * 0.06)));
        this.fireRate = this.reloadMs;
        this.cargoCapacity = this.baseCargoCapacity + c * 8;
        // Kit balls + modest Gun Crew bonus (+1 every 2 levels)
        this.volleyGuns = Math.max(1, (kit.guns || 1) + Math.floor(w / 2));
        this.volleySpread = kit.spread || 0;

        if (refill) {
            this.shields = this.maxShields;
            this.hull = this.maxHull;
        } else {
            this.shields = Math.min(this.shields ?? this.maxShields, this.maxShields);
            this.hull = Math.min(this.hull ?? this.maxHull, this.maxHull);
        }
    }

    sideReady(side) {
        const now = this.scene.time.now;
        return side === 'port' ? now >= this.portReadyAt : now >= this.starboardReadyAt;
    }

    sideReloadFrac(side) {
        const now = this.scene.time.now;
        const readyAt = side === 'port' ? this.portReadyAt : this.starboardReadyAt;
        if (now >= readyAt) return 1;
        const started = readyAt - this.reloadMs;
        return Phaser.Math.Clamp((now - started) / this.reloadMs, 0, 1);
    }

    markSideFired(side) {
        const ready = this.scene.time.now + this.reloadMs;
        if (side === 'port') this.portReadyAt = ready;
        else this.starboardReadyAt = ready;
    }

    preferSideToward(worldX, worldY) {
        const dx = worldX - this.getX();
        const dy = worldY - this.getY();
        const shipRightX = Math.cos(this.rotation);
        const shipRightY = Math.sin(this.rotation);
        const dot = dx * shipRightX + dy * shipRightY;
        return dot >= 0 ? 'starboard' : 'port';
    }

    markVolleyFired(side) {
        this.markSideFired(side);
        this._nextBattery = side === 'port' ? 'starboard' : 'port';
    }

    preferSideForGunAim() {
        return this.getAimState().side || this._nextBattery || 'starboard';
    }

    getVelocityAngle() {
        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        if (vx * vx + vy * vy < 12) return this.rotation;
        return Math.atan2(vx, -vy);
    }

    getSpeed() {
        return Math.hypot(this.body.velocity.x, this.body.velocity.y);
    }

    /** Half-width of legal fire arc from the bow (±135°). Rear 90° is blocked. */
    static get FIRE_ARC_HALF() {
        return Math.PI * 0.75;
    }

    /** Clamp a world bearing into the forward/side fire arc (not the stern). */
    clampFireAngle(rawAngle) {
        const rel = Phaser.Math.Angle.Wrap(rawAngle - this.rotation);
        const max = Player.FIRE_ARC_HALF;
        const clampedRel = Phaser.Math.Clamp(rel, -max, max);
        return Phaser.Math.Angle.Wrap(this.rotation + clampedRel);
    }

    isAimInRear(rawAngle) {
        const rel = Math.abs(Phaser.Math.Angle.Wrap(rawAngle - this.rotation));
        return rel > Player.FIRE_ARC_HALF + 0.001;
    }

    /** Mouse / stick bearing, clamped out of the rear quadrant. */
    getFireAngle() {
        return this.clampFireAngle(this.reticleAngle);
    }

    getVolleyCount() {
        return Math.max(1, this.volleyGuns || this.getWeapon().guns || 1);
    }

    getVolleySpread() {
        return this.volleySpread ?? (this.getWeapon().spread || 0);
    }

    getAimState() {
        const raw = this.reticleAngle;
        const fire = this.getFireAngle();
        const rel = Phaser.Math.Angle.Wrap(fire - this.rotation);
        const inArc = !this.isAimInRear(raw);
        return {
            side: rel >= 0 ? 'starboard' : 'port',
            aimAngle: fire,
            desiredHelm: this.rotation,
            toCursor: raw,
            rel,
            inArc,
            clamped: !inArc,
            dist: this.cursorDist,
            cursorX: this.cursorX,
            cursorY: this.cursorY,
            velocityAngle: this.getVelocityAngle(),
            speed: this.getSpeed(),
            intendForward: this.intendForward,
            intendLateral: this.intendLateral,
            intendTurn: this.intendTurn
        };
    }

    getBroadsideAim(worldX, worldY) {
        this.setReticleWorld(worldX, worldY);
        return this.getAimState();
    }

    setReticleWorld(worldX, worldY) {
        this.cursorX = worldX;
        this.cursorY = worldY;
        const dx = worldX - this.getX();
        const dy = worldY - this.getY();
        this.cursorDist = Math.hypot(dx, dy);
        if (this.cursorDist >= 8) {
            this.reticleAngle = Math.atan2(dx, -dy);
            this.gunAim = this.getFireAngle();
        }
        this.desiredHelm = this.rotation;
    }

    setGunAimAngle(angle) {
        this.reticleAngle = angle;
        this.gunAim = this.getFireAngle();
        this.cursorDist = Math.max(this.cursorDist, 200);
        this.cursorX = this.getX() + Math.sin(this.gunAim) * this.cursorDist;
        this.cursorY = this.getY() + -Math.cos(this.gunAim) * this.cursorDist;
    }

    clampAimToSide(_worldX, _worldY, _side) {
        return this.getFireAngle();
    }

    /** Prefer the battery on the side the cursor is on. */
    nextReadyBattery() {
        const aim = this.getAimState();
        const prefer = aim.side || this._nextBattery;
        const other = prefer === 'port' ? 'starboard' : 'port';
        if (this.sideReady(prefer)) return prefer;
        if (this.sideReady(other)) return other;
        return null;
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

    /** Discrete pips for HUD (shields/hull feel like remaining hits). */
    getIntegrityPips(kind, total = 10) {
        const cur = kind === 'shields' ? this.shields : this.hull;
        const max = kind === 'shields' ? this.maxShields : this.maxHull;
        if (max <= 0) return 0;
        return Math.max(0, Math.min(total, Math.ceil((cur / max) * total)));
    }

    /**
     * How close to wrecking — for danger UI.
     * @returns {{ level: 'ok'|'hurt'|'critical'|'dying', hullFrac: number, shieldFrac: number, hullPips: number, label: string }}
     */
    getMortality() {
        const hullFrac = this.maxHull > 0 ? this.hull / this.maxHull : 0;
        const shieldFrac = this.maxShields > 0 ? this.shields / this.maxShields : 0;
        const hullPips = this.getIntegrityPips('hull', 10);
        let level = 'ok';
        let label = 'Hull sound';
        if (hullFrac <= 0.12 || hullPips <= 1) {
            level = 'dying';
            label = `NEAR DEATH — ${Math.max(0, Math.ceil(this.hull))} hull left`;
        } else if (hullFrac <= 0.28 || hullPips <= 3) {
            level = 'critical';
            label = `HULL CRITICAL — ${hullPips}/10 pips`;
        } else if (hullFrac <= 0.55 || shieldFrac <= 0.01) {
            level = 'hurt';
            label = shieldFrac <= 0.01
                ? `WARD DOWN — hull ${Math.round(hullFrac * 100)}%`
                : `Hull strained — ${Math.round(hullFrac * 100)}%`;
        }
        return { level, hullFrac, shieldFrac, hullPips, label };
    }

    /** Stock starter fit for harbor respawn. */
    static basicLoadout(credits = 500, kills = 0) {
        return {
            credits,
            cargo: { food: 0, ore: 0, tech: 0 },
            upgrades: { engines: 0, shields: 0, hull: 0, weapons: 0, cargo: 0 },
            kills,
            weaponId: 'carronade',
            harvestIndex: 0,
            bonusShields: 0,
            bonusHull: 0,
            shields: undefined,
            hull: undefined
        };
    }

    /**
     * Next yard spend target — Gun Crew first, else cheapest available.
     * @returns {{ key: string, label: string, level: number, cost: number, have: number, need: number, frac: number } | null}
     */
    getNextUpgradeTarget() {
        const order = ['weapons', 'engines', 'shields', 'hull', 'cargo'];
        let pick = null;
        for (const key of order) {
            const cost = this.getUpgradeCost(key);
            if (cost == null) continue;
            const def = UPGRADE_DEFS[key];
            const candidate = {
                key,
                label: def.label,
                level: this.getUpgradeLevel(key),
                cost,
                have: this.credits,
                need: Math.max(0, cost - this.credits),
                frac: Phaser.Math.Clamp(this.credits / cost, 0, 1)
            };
            if (key === 'weapons') return candidate;
            if (!pick || cost < pick.cost) pick = candidate;
        }
        return pick;
    }

    buyUpgrade(key) {
        const def = UPGRADE_DEFS[key];
        if (!def) return { ok: false, message: 'Unknown upgrade.', kind: null };
        const level = this.getUpgradeLevel(key);
        if (level >= def.maxLevel) return { ok: false, message: `${def.label} already maxed.`, kind: null };
        const cost = def.costs[level];
        if (this.credits < cost) return { ok: false, message: 'Not enough credits.', kind: null };
        this.credits -= cost;
        this.upgrades[key] = level + 1;
        this.applyUpgrades(false);
        if (key === 'shields') this.shields = Math.min(this.maxShields, this.shields + 20);
        if (key === 'hull') this.hull = Math.min(this.maxHull, this.hull + 20);
        const shipKeys = new Set(['engines', 'hull', 'shields', 'cargo']);
        const kind = key === 'weapons' ? 'gun' : (shipKeys.has(key) ? 'ship' : 'gear');
        return {
            ok: true,
            message: `${def.label} → Lv ${this.upgrades[key]} (−${cost}c)`,
            kind,
            key,
            label: def.label,
            level: this.upgrades[key]
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
     * Helm + gun aim:
     * - A/D or ←/→ = turn the bow · W/S = thrust
     * - Mouse / right stick = fire bearing (anywhere but the rear quadrant)
     * - Space / click = side volley toward the cursor
     * - Shift = sheer
     */
    update(delta, leftJoystick, rightJoystick, keys = null, pad = null, aim = null) {
        const dt = Math.min(0.05, delta / 1000);
        const now = this.scene.time.now;

        // --- Helm: direct turn ------------------------------------------------
        let turnInput = 0;
        let forwardInput = 0;

        if (keys) {
            if (keys.A?.isDown || keys.LEFT?.isDown) turnInput -= 1;
            if (keys.D?.isDown || keys.RIGHT?.isDown) turnInput += 1;
            if (keys.W?.isDown) forwardInput += 1;
            if (keys.S?.isDown) forwardInput -= 1;
            if (keys.J?.isDown) turnInput += 1;
            if (keys.K?.isDown) turnInput -= 1;
        }

        if (pad) {
            if (Math.abs(pad.turn || 0) > 0.01) turnInput += pad.turn;
            else if (Math.abs(pad.lateral || 0) > 0.01) turnInput += pad.lateral;
            if (Math.abs(pad.forward || 0) > 0.01) forwardInput += pad.forward;
        }

        // Touch left stick: X = turn, Y = thrust (ship-relative)
        if (leftJoystick && leftJoystick.isActive()) {
            const force = leftJoystick.getForce();
            if (force > 0.12) {
                const angle = leftJoystick.getAngle();
                turnInput += Math.cos(angle) * force;
                forwardInput += -Math.sin(angle) * force;
            }
        }

        turnInput = Phaser.Math.Clamp(turnInput, -1, 1);
        forwardInput = Phaser.Math.Clamp(forwardInput, -1, 1);
        this.intendTurn = turnInput;
        this.intendForward = forwardInput;
        this.intendLateral = 0;

        this.rotation = Phaser.Math.Angle.Wrap(this.rotation + turnInput * this.hullTurnRate * dt);
        this.container.setRotation(this.rotation);
        this.desiredHelm = this.rotation;

        // --- Gun aim: mouse / right stick (clamped out of rear quadrant) ------
        if (aim && aim.cursorX != null && aim.cursorY != null) {
            this.setReticleWorld(aim.cursorX, aim.cursorY);
        } else if (rightJoystick && rightJoystick.isActive() && rightJoystick.getForce() > 0.28) {
            this.setGunAimAngle(rightJoystick.getAngle() + Math.PI / 2);
        } else if (pad && pad.hasAim) {
            this.setGunAimAngle(pad.aimAngle);
        } else if (aim && aim.angle != null && aim.hasAim) {
            this.setGunAimAngle(aim.angle);
        } else {
            // Keep last aim bearing; refresh gunAim after hull turn
            this.gunAim = this.getFireAngle();
        }

        // --- Sails along the keel --------------------------------------------
        const shipForwardX = Math.sin(this.rotation);
        const shipForwardY = -Math.cos(this.rotation);
        const shipRightX = Math.cos(this.rotation);
        const shipRightY = Math.sin(this.rotation);

        let forwardSpeed = 0;
        if (forwardInput > 0) forwardSpeed = forwardInput * this.mainThrust * 0.68;
        else if (forwardInput < 0) forwardSpeed = forwardInput * this.reverseThrust * 0.48;

        const thrusting = Math.abs(forwardInput) > 0.01;
        const targetVx = shipForwardX * forwardSpeed;
        const targetVy = shipForwardY * forwardSpeed;

        this.body.setAcceleration(0, 0);

        if (thrusting) {
            const lerpF = 1 - Math.exp(-this.thrustLerp * dt);
            this.body.velocity.x += (targetVx - this.body.velocity.x) * lerpF;
            this.body.velocity.y += (targetVy - this.body.velocity.y) * lerpF;
        } else {
            const bleed = 1 - Math.min(0.28 * dt, 0.07);
            this.body.velocity.x *= bleed;
            this.body.velocity.y *= bleed;
        }

        // Keel alignment — bleed sideways drift (sailing feel)
        const spdNow = Math.hypot(this.body.velocity.x, this.body.velocity.y);
        if (spdNow > 8) {
            const along = this.body.velocity.x * shipForwardX + this.body.velocity.y * shipForwardY;
            const side = this.body.velocity.x * shipRightX + this.body.velocity.y * shipRightY;
            const newSide = side * Math.exp(-1.4 * dt);
            this.body.velocity.x = shipForwardX * along + shipRightX * newSide;
            this.body.velocity.y = shipForwardY * along + shipRightY * newSide;
        }

        const wantBoost = (keys && keys.SHIFT?.isDown) || (pad && pad.boost);
        if (wantBoost && now - this.lastBoostTime > this.boostCooldownMs) {
            const side = this._lastDodgeSide || 1;
            this._lastDodgeSide = -side;
            this.body.velocity.x += shipRightX * side * this.boostImpulse;
            this.body.velocity.y += shipRightY * side * this.boostImpulse;
            this.body.velocity.x += shipForwardX * Math.max(0, forwardInput) * 40;
            this.body.velocity.y += shipForwardY * Math.max(0, forwardInput) * 40;
            this.lastBoostTime = now;
            this.boostUntil = now + 180;
            if (this.scene.spawnHitSpark) this.scene.spawnHitSpark(this.getX(), this.getY());
        }

        if (now < this.boostUntil) this.container.setAlpha(0.75);
        else if (this.container.alpha >= 0.7 && this.container.alpha < 1) this.container.setAlpha(1);

        const maxSpd = now < this.boostUntil ? this.maxSpeed * 1.2 : this.maxSpeed;
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
